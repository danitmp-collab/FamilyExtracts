import { getBankAccountForEntity } from "@/lib/bank-accounts";
import { createClient } from "@/lib/supabase/server";

export type MovementType = "income" | "expense";

export type MovementFilters = {
  dateFrom?: string;
  dateTo?: string;
  year?: string;
  month?: string;
  concept?: string;
  amountMin?: string;
  amountMax?: string;
  type?: MovementType;
  categoryId?: string;
};

export type MovementFilterOptions = {
  years: string[];
  months: Array<{
    value: string;
    label: string;
  }>;
};

export type AccountMovement = {
  id: string;
  import_id: string | null;
  fecha_operativa: string;
  concepto_original: string;
  concepto_normalizado: string;
  importe: number | string;
  category_id: string | null;
  categories: {
    id: string;
    name: string;
    type: string;
  } | null;
  imports: {
    id: string;
    file_name: string;
    created_at: string;
  } | null;
};

type SupabaseMovementRow = Omit<AccountMovement, "imports"> & {
  imports:
    | {
        id: string;
        file_name: string;
        created_at: string;
      }
    | Array<{
        id: string;
        file_name: string;
        created_at: string;
      }>
    | null;
  categories:
    | {
        id: string;
        name: string;
        type: string;
      }
    | Array<{
        id: string;
        name: string;
        type: string;
      }>
    | null;
};

export async function listMovementsForAccount(
  entityId: string,
  accountId: string,
  filters: MovementFilters
) {
  const { workspace, entity, account } = await getBankAccountForEntity(entityId, accountId);

  if (!entity || !account) {
    return {
      workspace,
      entity,
      account,
      movements: [] as AccountMovement[]
    };
  }

  const supabase = await createClient();
  let query = supabase
    .from("transactions")
    .select(
      "id, import_id, fecha_operativa, concepto_original, concepto_normalizado, importe, category_id, categories(id, name, type), imports(id, file_name, created_at)"
    )
    .eq("workspace_id", workspace.id)
    .eq("economic_entity_id", entity.id)
    .eq("bank_account_id", account.id);

  applyDateFilters();

  if (filters.concept) {
    query = query.or(
      `concepto_original.ilike.%${escapeLike(filters.concept)}%,concepto_normalizado.ilike.%${escapeLike(filters.concept)}%`
    );
  }

  if (filters.amountMin) {
    query = query.gte("importe", filters.amountMin);
  }

  if (filters.amountMax) {
    query = query.lte("importe", filters.amountMax);
  }

  if (filters.type === "income") {
    query = query.gt("importe", 0);
  }

  if (filters.type === "expense") {
    query = query.lt("importe", 0);
  }

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  const { data, error } = await query
    .order("fecha_operativa", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<SupabaseMovementRow[]>();

  if (error) {
    throw new Error(`No se pudieron cargar los movimientos: ${error.message}`);
  }

  const filteredData =
    !filters.year && filters.month
      ? data.filter((movement) => movement.fecha_operativa.slice(5, 7) === filters.month)
      : data;

  return {
    workspace,
    entity,
    account,
    movements: filteredData.map((movement) => ({
      ...movement,
      imports: Array.isArray(movement.imports) ? movement.imports[0] ?? null : movement.imports,
      categories: Array.isArray(movement.categories) ? movement.categories[0] ?? null : movement.categories
    }))
  };

  function applyDateFilters() {
    if (filters.year && filters.month) {
      const lastDay = new Date(Number(filters.year), Number(filters.month), 0).getDate();
      query = query
        .gte("fecha_operativa", `${filters.year}-${filters.month}-01`)
        .lte("fecha_operativa", `${filters.year}-${filters.month}-${String(lastDay).padStart(2, "0")}`);
      return;
    }

    if (filters.year) {
      query = query.gte("fecha_operativa", `${filters.year}-01-01`).lte("fecha_operativa", `${filters.year}-12-31`);
    }

    if (filters.dateFrom) {
      query = query.gte("fecha_operativa", filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte("fecha_operativa", filters.dateTo);
    }
  }
}

export function parseMovementFilters(searchParams: Record<string, string | string[] | undefined>): MovementFilters {
  const type = getString(searchParams.type);
  const year = getString(searchParams.year);
  const month = getString(searchParams.month);

  return {
    dateFrom: normalizeDateFilter(getString(searchParams.dateFrom)),
    dateTo: normalizeDateFilter(getString(searchParams.dateTo)),
    year: /^\d{4}$/.test(year) ? year : undefined,
    month: /^(0[1-9]|1[0-2])$/.test(month) ? month : undefined,
    concept: getString(searchParams.concept).trim(),
    amountMin: normalizeAmountFilter(getString(searchParams.amountMin)),
    amountMax: normalizeAmountFilter(getString(searchParams.amountMax)),
    type: type === "income" || type === "expense" ? type : undefined,
    categoryId: normalizeUuidFilter(getString(searchParams.categoryId))
  };
}

export async function listMovementFilterOptions(entityId: string, accountId: string): Promise<MovementFilterOptions> {
  const { workspace, entity, account } = await getBankAccountForEntity(entityId, accountId);

  if (!entity || !account) {
    return emptyMovementFilterOptions();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("fecha_operativa")
    .eq("workspace_id", workspace.id)
    .eq("economic_entity_id", entity.id)
    .eq("bank_account_id", account.id)
    .order("fecha_operativa", { ascending: false })
    .returns<Array<{ fecha_operativa: string }>>();

  if (error) {
    throw new Error(`No se pudieron cargar los filtros del extracto: ${error.message}`);
  }

  return {
    years: Array.from(new Set(data.map((movement) => movement.fecha_operativa.slice(0, 4)))).filter(Boolean),
    months: monthOptions()
  };
}

export type MovementDetail = {
  id: string;
  workspace_id: string;
  economic_entity_id: string;
  bank_account_id: string;
  import_id: string;
  fecha_operativa: string;
  fecha_valor: string | null;
  concepto_original: string;
  concepto_normalizado: string;
  grupo_concepto: string;
  importe: number | string;
  saldo: number | string | null;
  referencia: string | null;
  note: string | null;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  imports: {
    id: string;
    file_name: string;
    created_at: string;
  } | null;
  categories: {
    id: string;
    name: string;
    type: string;
  } | null;
};

type SupabaseMovementDetailRow = Omit<MovementDetail, "imports" | "categories"> & {
  imports:
    | {
        id: string;
        file_name: string;
        created_at: string;
      }
    | Array<{
        id: string;
        file_name: string;
        created_at: string;
      }>
    | null;
  categories:
    | {
        id: string;
        name: string;
        type: string;
      }
    | Array<{
        id: string;
        name: string;
        type: string;
      }>
    | null;
};

export async function getMovementForAccount(entityId: string, accountId: string, movementId: string) {
  const { workspace, entity, account } = await getBankAccountForEntity(entityId, accountId);

  if (!entity || !account) {
    return {
      workspace,
      entity,
      account,
      movement: null
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, workspace_id, economic_entity_id, bank_account_id, import_id, fecha_operativa, fecha_valor, concepto_original, concepto_normalizado, grupo_concepto, importe, saldo, referencia, note, category_id, created_at, updated_at, imports(id, file_name, created_at), categories(id, name, type)"
    )
    .eq("workspace_id", workspace.id)
    .eq("economic_entity_id", entity.id)
    .eq("bank_account_id", account.id)
    .eq("id", movementId)
    .maybeSingle<SupabaseMovementDetailRow>();

  if (error) {
    throw new Error(`No se pudo cargar el movimiento: ${error.message}`);
  }

  return {
    workspace,
    entity,
    account,
    movement: data
      ? {
          ...data,
          imports: Array.isArray(data.imports) ? data.imports[0] ?? null : data.imports,
          categories: Array.isArray(data.categories) ? data.categories[0] ?? null : data.categories
        }
      : null
  };
}

export function getMovementType(importe: number | string): MovementType {
  return Number(importe) >= 0 ? "income" : "expense";
}

export function getMovementTypeLabel(type: MovementType) {
  return type === "income" ? "Ingreso" : "Gasto";
}

function getString(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeDateFilter(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function normalizeAmountFilter(value: string) {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(",", ".");
  return Number.isFinite(Number(normalized)) ? normalized : undefined;
}

function normalizeUuidFilter(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : undefined;
}

function escapeLike(value: string) {
  return value.replace(/[%_]/g, "");
}

function emptyMovementFilterOptions(): MovementFilterOptions {
  return {
    years: [],
    months: monthOptions()
  };
}

function monthOptions() {
  return [
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
  ];
}
