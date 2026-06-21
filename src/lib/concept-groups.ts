import { getBankAccountForEntity } from "@/lib/bank-accounts";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export type ConceptGroupSlug =
  | "compra-tarjeta"
  | "adeudo-recibo"
  | "transferencia"
  | "bizum"
  | "nomina"
  | "traspaso"
  | "cupon-primas-acciones"
  | "seguros"
  | "efectivo"
  | "ingreso-efectivo"
  | "otros";

export type ConceptGroupSummary = {
  slug: string;
  label: string;
  note: string | null;
  movements: number;
  income: number;
  expenses: number;
  balance: number;
};

export type ConceptGroupTypeFilter = "income" | "expense";

export type ConceptGroupFilters = {
  type?: ConceptGroupTypeFilter;
  year?: string;
  month?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type ConceptGroupFilterOptions = {
  years: string[];
  months: Array<{
    value: string;
    label: string;
  }>;
};

export type ConceptGroupedMovement = {
  id: string;
  import_id: string;
  fecha_operativa: string;
  concepto_original: string;
  concepto_normalizado: string;
  grupo_concepto: string;
  importe: number | string;
  saldo: number | string | null;
  referencia: string | null;
  note: string | null;
  bank_account_id: string;
  economic_entity_id: string;
  bank_accounts: {
    name: string;
  } | null;
  economic_entities: {
    name: string;
  } | null;
  transfer_counterparty_label?: string;
};

type SupabaseConceptMovement = Omit<ConceptGroupedMovement, "bank_accounts" | "economic_entities"> & {
  bank_accounts:
    | {
        name: string;
        bank_name: string | null;
      }
    | Array<{
        name: string;
        bank_name: string | null;
      }>
    | null;
  economic_entities:
    | {
        name: string;
      }
    | Array<{
        name: string;
      }>
    | null;
};

const groupLabels: Record<ConceptGroupSlug, string> = {
  "compra-tarjeta": "Compra tarjeta",
  "adeudo-recibo": "Adeudo recibo",
  transferencia: "Transferencia",
  bizum: "Bizum",
  nomina: "Nomina",
  traspaso: "Traspaso",
  "cupon-primas-acciones": "Cupon primas acciones",
  seguros: "Seguros",
  efectivo: "Efectivo",
  "ingreso-efectivo": "Ingreso efectivo",
  otros: "Otros"
};

const orderedGroupSlugs: ConceptGroupSlug[] = [
  "nomina",
  "ingreso-efectivo",
  "transferencia",
  "traspaso",
  "bizum",
  "efectivo",
  "cupon-primas-acciones",
  "seguros",
  "adeudo-recibo",
  "compra-tarjeta"
];

export async function listConceptGroups() {
  const workspace = await getCurrentWorkspace();
  const movements = await listWorkspaceMovements(workspace.id);
  const groups = summarizeTopLevelGroups(movements);

  return {
    workspace,
    groups
  };
}

export async function listConceptGroupsForAccount(entityId: string, accountId: string, filters: ConceptGroupFilters = {}) {
  const { workspace, entity, account } = await getBankAccountForEntity(entityId, accountId);

  if (!entity || !account) {
    return {
      workspace,
      entity,
      account,
      groups: [] as Array<ConceptGroupSummary>,
      filterOptions: emptyFilterOptions()
    };
  }

  const filterOptions = await listConceptFilterOptions(workspace.id, {
    economicEntityId: entity.id,
    bankAccountId: account.id
  });
  const movements = await listWorkspaceMovements(workspace.id, {
    economicEntityId: entity.id,
    bankAccountId: account.id,
    ...filters
  });
  const groups = summarizeTopLevelGroups(movements);

  return {
    workspace,
    entity,
    account,
    groups,
    filterOptions
  };
}

export async function listConceptSubgroups(groupSlug: string) {
  const workspace = await getCurrentWorkspace();
  const movements = (await listWorkspaceMovements(workspace.id)).filter((movement) =>
    movementMatchesTopLevelGroup(movement, groupSlug)
  );
  const subgroups = summarizeSubgroups(movements);

  return {
    workspace,
    group: getGroupLabel(groupSlug),
    subgroups
  };
}

export async function listConceptSubgroupsForAccount(
  entityId: string,
  accountId: string,
  groupSlug: string,
  filters: ConceptGroupFilters = {}
) {
  const { workspace, entity, account } = await getBankAccountForEntity(entityId, accountId);

  if (!entity || !account) {
    return {
      workspace,
      entity,
      account,
      group: null,
      subgroups: [] as Array<ConceptGroupSummary>
    };
  }

  const movements = (
    await listWorkspaceMovements(workspace.id, {
      economicEntityId: entity.id,
      bankAccountId: account.id,
      ...filters
    })
  ).filter((movement) => movementMatchesTopLevelGroup(movement, groupSlug));
  const enrichedMovements = await enrichTransferCounterparties(workspace.id, account.id, groupSlug, movements);
  const subgroups = summarizeSubgroups(enrichedMovements);

  return {
    workspace,
    entity,
    account,
    group: getResolvedGroupLabel(groupSlug, enrichedMovements),
    subgroups
  };
}

export async function listConceptSubgroupMovements(groupSlug: string, subgroupSlug: string) {
  const workspace = await getCurrentWorkspace();
  const movements = (await listWorkspaceMovements(workspace.id))
    .filter((movement) => movementMatchesTopLevelGroup(movement, groupSlug))
    .filter((movement) => slugify(getSubgroupLabel(movement)) === subgroupSlug)
    .sort((a, b) => b.fecha_operativa.localeCompare(a.fecha_operativa));

  return {
    workspace,
    group: getResolvedGroupLabel(groupSlug, movements),
    subgroup: movements[0] ? getSubgroupLabel(movements[0]) : null,
    movements
  };
}

export async function listConceptSubgroupMovementsForAccount(
  entityId: string,
  accountId: string,
  groupSlug: string,
  subgroupSlug: string,
  filters: ConceptGroupFilters = {}
) {
  const { workspace, entity, account } = await getBankAccountForEntity(entityId, accountId);

  if (!entity || !account) {
    return {
      workspace,
      entity,
      account,
      group: null,
      subgroup: null,
      movements: [] as ConceptGroupedMovement[]
    };
  }

  const movements = (
    await listWorkspaceMovements(workspace.id, {
      economicEntityId: entity.id,
      bankAccountId: account.id,
      ...filters
    })
  )
    .filter((movement) => movementMatchesTopLevelGroup(movement, groupSlug));
  const enrichedMovements = (await enrichTransferCounterparties(workspace.id, account.id, groupSlug, movements))
    .filter((movement) => slugify(getSubgroupLabel(movement)) === subgroupSlug)
    .sort((a, b) => b.fecha_operativa.localeCompare(a.fecha_operativa));

  return {
    workspace,
    entity,
    account,
    group: getResolvedGroupLabel(groupSlug, enrichedMovements),
    subgroup: enrichedMovements[0] ? getSubgroupLabel(enrichedMovements[0]) : null,
    movements: enrichedMovements
  };
}

export function getGroupLabel(groupSlug: string) {
  return groupLabels[groupSlug as ConceptGroupSlug] ?? null;
}

function summarizeTopLevelGroups(movements: ConceptGroupedMovement[]) {
  const labels = new Map<string, string>();
  const notes = new Map<string, Set<string>>();
  const summaries = summarizeMovements(movements, (movement) => {
    const group = getTopLevelGroup(movement);
    labels.set(group.slug, group.label);
    collectNote(notes, group.slug, movement.note);
    return group.slug;
  });

  return Array.from(summaries.entries())
    .map(([slug, summary]) => ({
      slug,
      label: labels.get(slug) ?? getGroupLabel(slug) ?? slug,
      note: getSummaryNote(notes.get(slug)),
      ...summary
    }))
    .sort((a, b) => getGroupSortIndex(a.slug) - getGroupSortIndex(b.slug) || a.label.localeCompare(b.label));
}

function summarizeSubgroups(movements: ConceptGroupedMovement[]) {
  const labels = new Map<string, string>();
  const notes = new Map<string, Set<string>>();
  const summaries = summarizeMovements(movements, (movement) => {
    const label = getSubgroupLabel(movement);
    const key = slugify(label) || "otros";
    labels.set(key, chooseSubgroupLabel(labels.get(key), label));
    collectNote(notes, key, movement.note);
    return key;
  });

  return Array.from(summaries.entries())
    .map(([slug, summary]) => ({
      slug,
      label: labels.get(slug) ?? slug,
      note: getSummaryNote(notes.get(slug)),
      ...summary
    }))
    .sort((a, b) => b.movements - a.movements || a.label.localeCompare(b.label));
}

function collectNote(notes: Map<string, Set<string>>, key: string, note: string | null) {
  const normalizedNote = note?.trim();

  if (!normalizedNote) {
    return;
  }

  const current = notes.get(key) ?? new Set<string>();
  current.add(normalizedNote);
  notes.set(key, current);
}

function getSummaryNote(notes: Set<string> | undefined) {
  if (!notes || notes.size === 0) {
    return null;
  }

  if (notes.size > 1) {
    return "Varias notas";
  }

  return Array.from(notes)[0] ?? null;
}

function chooseSubgroupLabel(currentLabel: string | undefined, nextLabel: string) {
  if (!currentLabel) {
    return nextLabel;
  }

  return nextLabel.length > currentLabel.length ? nextLabel : currentLabel;
}

function getTopLevelGroup(movement: ConceptGroupedMovement) {
  const mainGroup = getMainGroup(movement);

  if (mainGroup.slug !== "otros") {
    return mainGroup;
  }

  const label = getSubgroupLabel(movement);

  return {
    slug: `otros-${slugify(label)}`,
    label
  };
}

function movementMatchesTopLevelGroup(movement: ConceptGroupedMovement, groupSlug: string) {
  return getTopLevelGroup(movement).slug === groupSlug;
}

function getResolvedGroupLabel(groupSlug: string, movements: ConceptGroupedMovement[]) {
  return movements[0] ? getTopLevelGroup(movements[0]).label : getGroupLabel(groupSlug);
}

function getGroupSortIndex(slug: string) {
  const index = orderedGroupSlugs.indexOf(slug as ConceptGroupSlug);
  return index === -1 ? orderedGroupSlugs.length : index;
}

function summarizeMovements(movements: ConceptGroupedMovement[], getKey: (movement: ConceptGroupedMovement) => string) {
  const summaries = new Map<string, Omit<ConceptGroupSummary, "slug" | "label" | "note">>();

  for (const movement of movements) {
    const key = getKey(movement);
    const amount = Number(movement.importe);
    const current = summaries.get(key) ?? emptySummary();

    summaries.set(key, {
      movements: current.movements + 1,
      income: current.income + (amount > 0 ? amount : 0),
      expenses: current.expenses + (amount < 0 ? amount : 0),
      balance: current.balance + amount
    });
  }

  return summaries;
}

function emptySummary() {
  return {
    movements: 0,
    income: 0,
    expenses: 0,
    balance: 0
  };
}

type ConceptMovementFilters = {
  economicEntityId?: string;
  bankAccountId?: string;
  type?: ConceptGroupTypeFilter;
  year?: string;
  month?: string;
  dateFrom?: string;
  dateTo?: string;
};

async function listWorkspaceMovements(workspaceId: string, filters: ConceptMovementFilters = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select(
      "id, import_id, fecha_operativa, concepto_original, concepto_normalizado, grupo_concepto, importe, saldo, referencia, note, bank_account_id, economic_entity_id, bank_accounts(name, bank_name), economic_entities(name)"
    )
    .eq("workspace_id", workspaceId)
    .order("fecha_operativa", { ascending: false });

  if (filters.economicEntityId) {
    query = query.eq("economic_entity_id", filters.economicEntityId);
  }

  if (filters.bankAccountId) {
    query = query.eq("bank_account_id", filters.bankAccountId);
  }

  if (filters.type === "income") {
    query = query.gt("importe", 0);
  }

  if (filters.type === "expense") {
    query = query.lt("importe", 0);
  }

  if (filters.year) {
    query = query.gte("fecha_operativa", `${filters.year}-01-01`).lte("fecha_operativa", `${filters.year}-12-31`);
  }

  if (filters.year && filters.month) {
    const lastDay = new Date(Number(filters.year), Number(filters.month), 0).getDate();
    query = query
      .gte("fecha_operativa", `${filters.year}-${filters.month}-01`)
      .lte("fecha_operativa", `${filters.year}-${filters.month}-${String(lastDay).padStart(2, "0")}`);
  }

  if (filters.dateFrom) {
    query = query.gte("fecha_operativa", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte("fecha_operativa", filters.dateTo);
  }

  const { data, error } = await query.returns<SupabaseConceptMovement[]>();

  if (error) {
    throw new Error(`No se pudieron cargar los grupos de concepto: ${error.message}`);
  }

  const filteredData =
    !filters.year && filters.month
      ? data.filter((movement) => movement.fecha_operativa.slice(5, 7) === filters.month)
      : data;

  return filteredData.map((movement) => ({
    ...movement,
    bank_accounts: Array.isArray(movement.bank_accounts) ? movement.bank_accounts[0] ?? null : movement.bank_accounts,
    economic_entities: Array.isArray(movement.economic_entities)
      ? movement.economic_entities[0] ?? null
      : movement.economic_entities
  }));
}

async function listConceptFilterOptions(workspaceId: string, filters: Pick<ConceptMovementFilters, "economicEntityId" | "bankAccountId">) {
  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select("fecha_operativa")
    .eq("workspace_id", workspaceId)
    .order("fecha_operativa", { ascending: false });

  if (filters.economicEntityId) {
    query = query.eq("economic_entity_id", filters.economicEntityId);
  }

  if (filters.bankAccountId) {
    query = query.eq("bank_account_id", filters.bankAccountId);
  }

  const { data, error } = await query.returns<Array<{ fecha_operativa: string }>>();

  if (error) {
    throw new Error(`No se pudieron cargar los filtros de concepto: ${error.message}`);
  }

  const years = Array.from(new Set(data.map((movement) => movement.fecha_operativa.slice(0, 4)))).filter(Boolean);

  return {
    years,
    months: [
      { value: "01", label: "Enero" },
      { value: "02", label: "Febrero" },
      { value: "03", label: "Marzo" },
      { value: "04", label: "Abril" },
      { value: "05", label: "Mayo" },
      { value: "06", label: "Junio" },
      { value: "07", label: "Julio" },
      { value: "08", label: "Agosto" },
      { value: "09", label: "Septiembre" },
      { value: "10", label: "Octubre" },
      { value: "11", label: "Noviembre" },
      { value: "12", label: "Diciembre" }
    ]
  };
}

export function parseConceptGroupFilters(searchParams: Record<string, string | string[] | undefined>): ConceptGroupFilters {
  const type = getFirstValue(searchParams.type);
  const year = getFirstValue(searchParams.year);
  const month = getFirstValue(searchParams.month);
  const shouldUseCurrentPeriod =
    !hasSearchParam(searchParams, "year") &&
    !hasSearchParam(searchParams, "month") &&
    !hasSearchParam(searchParams, "dateFrom") &&
    !hasSearchParam(searchParams, "dateTo");
  const currentPeriod = shouldUseCurrentPeriod ? getCurrentPeriod() : null;

  return {
    type: type === "income" || type === "expense" ? type : undefined,
    year: /^\d{4}$/.test(year) ? year : currentPeriod?.year,
    month: /^(0[1-9]|1[0-2])$/.test(month) ? month : currentPeriod?.month,
    dateFrom: normalizeDate(getFirstValue(searchParams.dateFrom)),
    dateTo: normalizeDate(getFirstValue(searchParams.dateTo))
  };
}

export function buildConceptGroupFilterQuery(filters: ConceptGroupFilters) {
  const params = new URLSearchParams();

  if (filters.type) {
    params.set("type", filters.type);
  }

  if (filters.year) {
    params.set("year", filters.year);
  }

  if (filters.month) {
    params.set("month", filters.month);
  }

  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }

  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

function emptyFilterOptions(): ConceptGroupFilterOptions {
  return {
    years: [],
    months: []
  };
}

function getFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function hasSearchParam(searchParams: Record<string, string | string[] | undefined>, key: string) {
  return Object.prototype.hasOwnProperty.call(searchParams, key);
}

function getCurrentPeriod() {
  const now = new Date();

  return {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1).padStart(2, "0")
  };
}

function normalizeDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

type TransferCounterpartyMovement = {
  id: string;
  fecha_operativa: string;
  importe: number | string;
  bank_account_id: string;
  economic_entity_id: string;
  bank_accounts:
    | {
        name: string;
        bank_name: string | null;
      }
    | Array<{
        name: string;
        bank_name: string | null;
      }>
    | null;
  economic_entities:
    | {
        name: string;
      }
    | Array<{
        name: string;
      }>
    | null;
};

type WorkspaceBankAccountSummary = {
  id: string;
  economic_entity_id: string;
  name: string;
  bank_name: string | null;
};

async function enrichTransferCounterparties(
  workspaceId: string,
  accountId: string,
  groupSlug: string,
  movements: ConceptGroupedMovement[]
) {
  if (!isTransferGroupSlug(groupSlug) || movements.length === 0) {
    return movements;
  }

  const dateRange = getExpandedDateRange(movements, 3);
  const supabase = await createClient();
  const [{ data: counterpartyMovements, error: counterpartyError }, { data: bankAccounts, error: bankAccountsError }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("id, fecha_operativa, importe, bank_account_id, economic_entity_id, bank_accounts(name, bank_name), economic_entities(name)")
        .eq("workspace_id", workspaceId)
        .neq("bank_account_id", accountId)
        .gte("fecha_operativa", dateRange.from)
        .lte("fecha_operativa", dateRange.to)
        .returns<TransferCounterpartyMovement[]>(),
      supabase
        .from("bank_accounts")
        .select("id, economic_entity_id, name, bank_name")
        .eq("workspace_id", workspaceId)
        .returns<WorkspaceBankAccountSummary[]>()
    ]);

  if (counterpartyError) {
    throw new Error(`No se pudieron cruzar los traspasos: ${counterpartyError.message}`);
  }

  if (bankAccountsError) {
    throw new Error(`No se pudieron cargar las cuentas para cruzar traspasos: ${bankAccountsError.message}`);
  }

  const accountCountByEntity = countAccountsByEntity(bankAccounts);

  return movements.map((movement) => {
    const counterparty = findUniqueTransferCounterparty(movement, counterpartyMovements);

    if (!counterparty) {
      return movement;
    }

    return {
      ...movement,
      transfer_counterparty_label: formatTransferLabel(movement, counterparty, accountCountByEntity)
    };
  });
}

function isTransferGroupSlug(groupSlug: string) {
  return groupSlug === "transferencia" || groupSlug === "traspaso";
}

function getExpandedDateRange(movements: ConceptGroupedMovement[], days: number) {
  const dates = movements.map((movement) => new Date(`${movement.fecha_operativa}T00:00:00`));
  const minDate = new Date(Math.min(...dates.map((date) => date.getTime())));
  const maxDate = new Date(Math.max(...dates.map((date) => date.getTime())));

  minDate.setDate(minDate.getDate() - days);
  maxDate.setDate(maxDate.getDate() + days);

  return {
    from: formatIsoDate(minDate),
    to: formatIsoDate(maxDate)
  };
}

function findUniqueTransferCounterparty(
  movement: ConceptGroupedMovement,
  counterpartyMovements: TransferCounterpartyMovement[]
) {
  const movementAmount = toCents(movement.importe);
  const movementDate = new Date(`${movement.fecha_operativa}T00:00:00`);
  const matches = counterpartyMovements
    .filter((candidate) => toCents(candidate.importe) === -movementAmount)
    .map((candidate) => ({
      candidate,
      dateDistance: Math.abs(
        (new Date(`${candidate.fecha_operativa}T00:00:00`).getTime() - movementDate.getTime()) / 86_400_000
      )
    }))
    .filter((match) => match.dateDistance <= 3)
    .sort((a, b) => a.dateDistance - b.dateDistance);

  if (matches.length === 0) {
    return null;
  }

  const [best, secondBest] = matches;

  if (secondBest && secondBest.dateDistance === best.dateDistance) {
    return null;
  }

  return best.candidate;
}

function countAccountsByEntity(accounts: WorkspaceBankAccountSummary[]) {
  const counts = new Map<string, number>();

  for (const account of accounts) {
    counts.set(account.economic_entity_id, (counts.get(account.economic_entity_id) ?? 0) + 1);
  }

  return counts;
}

function formatTransferLabel(
  movement: ConceptGroupedMovement,
  counterparty: TransferCounterpartyMovement,
  accountCountByEntity: Map<string, number>
) {
  const direction = Number(movement.importe) >= 0 ? "de" : "a";
  const counterpartyName = getCounterpartyName(counterparty, accountCountByEntity);

  return `Traspaso ${direction} ${counterpartyName}`;
}

function getCounterpartyName(
  counterparty: TransferCounterpartyMovement,
  accountCountByEntity: Map<string, number>
) {
  const entity = Array.isArray(counterparty.economic_entities)
    ? counterparty.economic_entities[0] ?? null
    : counterparty.economic_entities;
  const account = Array.isArray(counterparty.bank_accounts)
    ? counterparty.bank_accounts[0] ?? null
    : counterparty.bank_accounts;
  const entityName = entity?.name ?? "otra cuenta";
  const accountCount = accountCountByEntity.get(counterparty.economic_entity_id) ?? 0;

  if (accountCount <= 1 || !account) {
    return entityName;
  }

  const accountName = account.bank_name || account.name;
  return combineEntityAndAccountName(entityName, accountName);
}

function combineEntityAndAccountName(entityName: string, accountName: string) {
  const normalizedEntity = normalizeName(entityName);
  const normalizedAccount = normalizeName(accountName);

  if (!accountName || normalizedAccount === normalizedEntity || normalizedAccount.includes(normalizedEntity)) {
    return accountName || entityName;
  }

  return `${entityName} ${accountName}`;
}

function toCents(value: number | string) {
  return Math.round(Number(value) * 100);
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getMainGroup(movement: ConceptGroupedMovement) {
  const concept = movement.concepto_normalizado;
  const searchableConcept = `${concept} ${movement.grupo_concepto ?? ""}`;

  if (/\bSEGUROS?\b/.test(searchableConcept)) {
    return { slug: "seguros" as const, label: groupLabels.seguros };
  }

  if (/\bCOMPRA\s+TARJ\b/.test(concept)) {
    return { slug: "compra-tarjeta" as const, label: groupLabels["compra-tarjeta"] };
  }

  if (/\bADEUDO\s+RECIBO\b/.test(concept)) {
    return { slug: "adeudo-recibo" as const, label: groupLabels["adeudo-recibo"] };
  }

  if (/\bTRANSFERENCIA\b/.test(concept)) {
    return { slug: "transferencia" as const, label: groupLabels.transferencia };
  }

  if (/\bBIZUM\b/.test(concept)) {
    return { slug: "bizum" as const, label: groupLabels.bizum };
  }

  if (/\bNOMINA\b/.test(concept)) {
    return { slug: "nomina" as const, label: groupLabels.nomina };
  }

  if (/\bTRASPASO\b/.test(concept)) {
    return { slug: "traspaso" as const, label: groupLabels.traspaso };
  }

  if (/\bCUPON\s+PRIMAS\s+ACCIONES\b/.test(concept)) {
    return { slug: "cupon-primas-acciones" as const, label: groupLabels["cupon-primas-acciones"] };
  }

  if (/\b(INGRESO|GASTO)\s+EFECTIVO\b/.test(concept)) {
    return { slug: "efectivo" as const, label: groupLabels.efectivo };
  }

  return { slug: "otros" as const, label: groupLabels.otros };
}

function getSubgroupLabel(movement: ConceptGroupedMovement) {
  if (movement.transfer_counterparty_label) {
    return movement.transfer_counterparty_label;
  }

  const concept = movement.concepto_normalizado;
  const mainGroup = getMainGroup(movement).slug;

  if (mainGroup === "compra-tarjeta") {
    return extractCardMerchant(concept);
  }

  if (mainGroup === "adeudo-recibo") {
    return cleanLabel(concept.replace(/^ADEUDO\s+RECIBO\s+/i, ""));
  }

  if (mainGroup === "transferencia") {
    return cleanLabel(concept.replace(/\bTRANSFERENCIA\b\s*/i, ""));
  }

  if (mainGroup === "bizum") {
    return cleanLabel(concept.replace(/\b(ABONO|PAGO)?\s*BIZUM\s+(DE\s+)?/i, ""));
  }

  if (mainGroup === "nomina") {
    return cleanLabel(concept.replace(/\bNOMINA\s+(DE\s+)?/i, ""));
  }

  if (mainGroup === "efectivo") {
    return cleanLabel(concept.replace(/\b(INGRESO|GASTO)\s+EFECTIVO\s*-?\s*/i, ""));
  }

  if (mainGroup === "seguros") {
    return cleanLabel(
      (movement.grupo_concepto && normalizeName(movement.grupo_concepto) !== "otros"
        ? movement.grupo_concepto
        : concept
      )
        .replace(/^ADEUDO\s+RECIBO\s+/i, "")
        .replace(/^SEGUROS?\s+/i, "")
    );
  }

  return cleanLabel(movement.grupo_concepto && normalizeName(movement.grupo_concepto) !== "otros" ? movement.grupo_concepto : concept);
}

function extractCardMerchant(concept: string) {
  const withoutPrefix = concept
    .replace(/^COMPRA\s+TARJ\.?\s*/i, "")
    .replace(/^\d{4}X+\d{4}\s*/i, "")
    .replace(/^\d{4,}\s*/i, "");
  const merchant = withoutPrefix.split("-")[0] ?? "";

  return normalizeCardMerchantLabel(cleanLabel(merchant));
}

function cleanLabel(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? titleCase(cleaned) : "Otros";
}

function normalizeCardMerchantLabel(label: string) {
  const normalizedLabel = normalizeName(label);

  if (normalizedLabel === "in" || normalizedLabel === "in rock") {
    return "In Rock";
  }

  return label;
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function titleCase(value: string) {
  return value.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
