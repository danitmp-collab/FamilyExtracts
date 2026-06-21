import { getBankAccountForEntity } from "@/lib/bank-accounts";
import { createClient } from "@/lib/supabase/server";

export type ImportRecord = {
  id: string;
  workspace_id: string;
  economic_entity_id: string;
  bank_account_id: string;
  uploaded_by: string;
  file_name: string;
  status: "preview" | "completed" | "failed";
  rows_total: number;
  rows_imported: number;
  rows_duplicates: number;
  rows_failed: number;
  created_at: string;
};

export type ImportedTransaction = {
  id: string;
  fecha_operativa: string;
  fecha_valor: string | null;
  concepto_original: string;
  concepto_normalizado: string;
  grupo_concepto: string;
  importe: number | string;
  saldo: number | string | null;
  referencia: string | null;
  created_at: string;
};

export async function listImportsForAccount(entityId: string, accountId: string) {
  const { workspace, entity, account } = await getBankAccountForEntity(entityId, accountId);

  if (!entity || !account) {
    return {
      workspace,
      entity,
      account,
      imports: [] as ImportRecord[]
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("imports")
    .select(
      "id, workspace_id, economic_entity_id, bank_account_id, uploaded_by, file_name, status, rows_total, rows_imported, rows_duplicates, rows_failed, created_at"
    )
    .eq("workspace_id", workspace.id)
    .eq("economic_entity_id", entity.id)
    .eq("bank_account_id", account.id)
    .order("created_at", { ascending: false })
    .returns<ImportRecord[]>();

  if (error) {
    throw new Error(`No se pudieron cargar las importaciones: ${error.message}`);
  }

  return {
    workspace,
    entity,
    account,
    imports: data
  };
}

export async function getImportDetailForAccount(entityId: string, accountId: string, importId: string) {
  const { workspace, entity, account } = await getBankAccountForEntity(entityId, accountId);

  if (!entity || !account) {
    return {
      workspace,
      entity,
      account,
      importRecord: null,
      transactions: [] as ImportedTransaction[]
    };
  }

  const supabase = await createClient();
  const { data: importRecord, error: importError } = await supabase
    .from("imports")
    .select(
      "id, workspace_id, economic_entity_id, bank_account_id, uploaded_by, file_name, status, rows_total, rows_imported, rows_duplicates, rows_failed, created_at"
    )
    .eq("workspace_id", workspace.id)
    .eq("economic_entity_id", entity.id)
    .eq("bank_account_id", account.id)
    .eq("id", importId)
    .maybeSingle<ImportRecord>();

  if (importError) {
    throw new Error(`No se pudo cargar la importacion: ${importError.message}`);
  }

  if (!importRecord) {
    return {
      workspace,
      entity,
      account,
      importRecord,
      transactions: [] as ImportedTransaction[]
    };
  }

  const { data: transactions, error: transactionsError } = await supabase
    .from("transactions")
    .select(
      "id, fecha_operativa, fecha_valor, concepto_original, concepto_normalizado, grupo_concepto, importe, saldo, referencia, created_at"
    )
    .eq("workspace_id", workspace.id)
    .eq("economic_entity_id", entity.id)
    .eq("bank_account_id", account.id)
    .eq("import_id", importRecord.id)
    .order("fecha_operativa", { ascending: false })
    .order("created_at", { ascending: true })
    .returns<ImportedTransaction[]>();

  if (transactionsError) {
    throw new Error(`No se pudieron cargar los movimientos importados: ${transactionsError.message}`);
  }

  return {
    workspace,
    entity,
    account,
    importRecord,
    transactions
  };
}

export function formatImportDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatTransactionDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short"
  }).format(new Date(`${value}T00:00:00`));
}

export function formatMoney(value: number | string | null) {
  if (value === null) {
    return "-";
  }

  const amount = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(amount)) {
    return String(value);
  }

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    currencyDisplay: "symbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function getImportStatusLabel(status: ImportRecord["status"]) {
  const labels: Record<ImportRecord["status"], string> = {
    preview: "Preview",
    completed: "Completada",
    failed: "Fallida"
  };

  return labels[status];
}
