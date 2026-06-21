"use server";

import { parseExcelPreview, type ExcelPreviewResult } from "@/lib/excel-preview";
import { getBankAccountForEntity } from "@/lib/bank-accounts";
import { canManageEconomicEntity } from "@/lib/economic-entities";
import { createClient } from "@/lib/supabase/server";

export type ImportPreviewState = {
  preview: ExcelPreviewResult | null;
  error: string | null;
};

export type CompleteImportState = {
  importId: string | null;
  rowsTotal: number;
  rowsImported: number;
  rowsDuplicates: number;
  rowsFailed: number;
  error: string | null;
};

export async function previewExcelImport(
  entityId: string,
  accountId: string,
  _state: ImportPreviewState,
  formData: FormData
): Promise<ImportPreviewState> {
  const { entity, account } = await getBankAccountForEntity(entityId, accountId);

  if (!entity || !account) {
    return {
      preview: null,
      error: "La entidad o cuenta seleccionada no existe."
    };
  }

  if (!(await canManageEconomicEntity(entity.id))) {
    return {
      preview: null,
      error: "No tienes permiso para importar movimientos en esta entidad."
    };
  }

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return {
      preview: null,
      error: "Selecciona un archivo Excel."
    };
  }

  try {
    const preview = await parseExcelPreview(file);
    const previewWithDuplicates = await markDuplicateRows(preview, account.id);

    return {
      preview: previewWithDuplicates,
      error: null
    };
  } catch (error) {
    return {
      preview: null,
      error: error instanceof Error ? error.message : "No se pudo leer el archivo Excel."
    };
  }
}

type CompleteImportResult = {
  import_id: string;
  rows_imported: number;
};

export async function completeExcelImport(
  entityId: string,
  accountId: string,
  _state: CompleteImportState,
  formData: FormData
): Promise<CompleteImportState> {
  const { workspace, entity, account } = await getBankAccountForEntity(entityId, accountId);

  if (!entity || !account) {
    return {
      importId: null,
      rowsTotal: 0,
      rowsImported: 0,
      rowsDuplicates: 0,
      rowsFailed: 0,
      error: "La entidad o cuenta seleccionada no existe."
    };
  }

  if (!(await canManageEconomicEntity(entity.id))) {
    return {
      importId: null,
      rowsTotal: 0,
      rowsImported: 0,
      rowsDuplicates: 0,
      rowsFailed: 0,
      error: "No tienes permiso para importar movimientos en esta entidad."
    };
  }

  const payload = parsePreviewPayload(String(formData.get("preview") ?? ""));

  if (!payload) {
    return {
      importId: null,
      rowsTotal: 0,
      rowsImported: 0,
      rowsDuplicates: 0,
      rowsFailed: 0,
      error: "No se pudo leer la vista previa para confirmar la importacion."
    };
  }

  if (payload.summary.rows_new <= 0) {
    return {
      importId: null,
      rowsTotal: payload.summary.rows_total,
      rowsImported: 0,
      rowsDuplicates: payload.summary.rows_duplicates,
      rowsFailed: payload.summary.rows_error,
      error: "No hay filas nuevas para importar."
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("complete_import_from_preview", {
      p_workspace_id: workspace.id,
      p_economic_entity_id: entity.id,
      p_bank_account_id: account.id,
      p_file_name: payload.fileName,
      p_rows_total: payload.summary.rows_total,
      p_rows_duplicates: payload.summary.rows_duplicates,
      p_rows_failed: payload.summary.rows_error,
      p_rows: payload.rows
    });

  if (error) {
    return {
      importId: null,
      rowsTotal: payload.summary.rows_total,
      rowsImported: 0,
      rowsDuplicates: payload.summary.rows_duplicates,
      rowsFailed: payload.summary.rows_error,
      error: `No se pudo confirmar la importacion: ${error.message}`
    };
  }

  const result = normalizeCompleteImportResult(data);

  if (!result?.import_id) {
    return {
      importId: null,
      rowsTotal: payload.summary.rows_total,
      rowsImported: 0,
      rowsDuplicates: payload.summary.rows_duplicates,
      rowsFailed: payload.summary.rows_error,
      error: "La importacion se ejecuto sin devolver resultado."
    };
  }

  return {
    importId: result.import_id,
    rowsTotal: payload.summary.rows_total,
    rowsImported: result.rows_imported,
    rowsDuplicates: payload.summary.rows_duplicates,
    rowsFailed: payload.summary.rows_error,
    error: null
  };
}

type ExistingTransaction = {
  deduplication_key: string;
};

async function markDuplicateRows(preview: ExcelPreviewResult, accountId: string): Promise<ExcelPreviewResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("deduplication_key")
    .eq("bank_account_id", accountId)
    .returns<ExistingTransaction[]>();

  if (error) {
    throw new Error(`No se pudieron consultar movimientos existentes: ${error.message}`);
  }

  const existingKeys = new Set(data.map((transaction) => transaction.deduplication_key));
  const occurrences = new Map<string, number>();
  const rows = preview.rows.map((row) => {
    if (row.errors.length > 0 || !row.fecha_operativa || row.importe === null) {
      return {
        ...row,
        deduplication_key: null,
        status: "error" as const
      };
    }

    const baseKey = buildDeduplicationBaseKey({
      fecha_operativa: row.fecha_operativa,
      concepto_normalizado: row.concepto_normalizado,
      importe: row.importe,
      saldo: row.saldo,
      referencia: row.referencia
    });
    const occurrence = (occurrences.get(baseKey) ?? 0) + 1;
    occurrences.set(baseKey, occurrence);
    const key = `${baseKey}|${occurrence}`;

    return {
      ...row,
      deduplication_key: key,
      status: existingKeys.has(key) ? ("duplicate" as const) : ("new" as const)
    };
  });

  return {
    ...preview,
    summary: {
      rows_total: rows.length,
      rows_valid: rows.filter((row) => row.errors.length === 0).length,
      rows_new: rows.filter((row) => row.status === "new").length,
      rows_duplicates: rows.filter((row) => row.status === "duplicate").length,
      rows_error: rows.filter((row) => row.status === "error").length
    },
    rows
  };
}

function buildDeduplicationBaseKey(transaction: {
  fecha_operativa: string;
  concepto_normalizado: string;
  importe: number | string;
  saldo?: number | string | null;
  referencia?: string | null;
}) {
  return [
    transaction.fecha_operativa,
    transaction.concepto_normalizado,
    normalizeMoneyKey(transaction.importe),
    normalizeOptionalMoneyKey(transaction.saldo),
    normalizeOptionalTextKey(transaction.referencia)
  ].join("|");
}

function normalizeMoneyKey(value: number | string) {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : String(value);
}

function normalizeOptionalMoneyKey(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return normalizeMoneyKey(value);
}

function normalizeOptionalTextKey(value: string | null | undefined) {
  return value ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeCompleteImportResult(data: unknown): CompleteImportResult | null {
  if (Array.isArray(data)) {
    return (data[0] as CompleteImportResult | undefined) ?? null;
  }

  if (data && typeof data === "object") {
    return data as CompleteImportResult;
  }

  return null;
}

function parsePreviewPayload(value: string): ExcelPreviewResult | null {
  if (!value) {
    return null;
  }

  try {
    const payload = JSON.parse(value) as ExcelPreviewResult;

    if (!payload.fileName || !Array.isArray(payload.rows) || !payload.summary) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
