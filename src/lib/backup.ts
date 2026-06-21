import { createClient } from "@/lib/supabase/server";
import type { CurrentWorkspace } from "@/lib/workspace";

const backupVersion = 1;

const backupTables = [
  "economic_entities",
  "bank_accounts",
  "categories",
  "imports",
  "transactions"
] as const;

type BackupTable = (typeof backupTables)[number];

type JsonRecord = Record<string, unknown>;

export type BackupPayload = {
  app: "familyextracts";
  version: typeof backupVersion;
  exportedAt: string;
  workspace: {
    id: string;
    name: string;
  };
  data: Record<BackupTable, JsonRecord[]>;
};

export type ImportBackupResult = {
  economicEntities: number;
  bankAccounts: number;
  categories: number;
  imports: number;
  transactions: number;
};

export async function createBackupPayload(workspace: CurrentWorkspace): Promise<BackupPayload> {
  const supabase = await createClient();
  const data = {} as Record<BackupTable, JsonRecord[]>;

  for (const table of backupTables) {
    const { data: rows, error } = await supabase
      .from(table)
      .select("*")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`No se pudo preparar la copia de ${table}: ${error.message}`);
    }

    data[table] = (rows ?? []) as JsonRecord[];
  }

  return {
    app: "familyextracts",
    version: backupVersion,
    exportedAt: new Date().toISOString(),
    workspace: {
      id: workspace.id,
      name: workspace.name
    },
    data
  };
}

export async function importBackupPayload(
  payload: unknown,
  workspace: CurrentWorkspace,
  userId: string
): Promise<ImportBackupResult> {
  const backup = parseBackupPayload(payload);
  const supabase = await createClient();

  const economicEntities = backup.data.economic_entities.map((row) => ({
    ...row,
    workspace_id: workspace.id
  }));
  const bankAccounts = backup.data.bank_accounts.map((row) => ({
    ...row,
    workspace_id: workspace.id
  }));
  const categories = backup.data.categories.map((row) => ({
    ...row,
    workspace_id: workspace.id
  }));
  const imports = backup.data.imports.map((row) => ({
    ...row,
    workspace_id: workspace.id,
    uploaded_by: userId
  }));
  const transactions = backup.data.transactions.map((row) => ({
    ...row,
    workspace_id: workspace.id
  }));

  await upsertRows(supabase, "economic_entities", economicEntities);
  await upsertRows(supabase, "bank_accounts", bankAccounts);
  await upsertRows(supabase, "categories", categories);
  await upsertRows(supabase, "imports", imports);
  await upsertRows(supabase, "transactions", transactions);

  return {
    economicEntities: economicEntities.length,
    bankAccounts: bankAccounts.length,
    categories: categories.length,
    imports: imports.length,
    transactions: transactions.length
  };
}

function parseBackupPayload(payload: unknown): BackupPayload {
  if (!isRecord(payload)) {
    throw new Error("El archivo no tiene formato de copia de seguridad.");
  }

  if (payload.app !== "familyextracts" || payload.version !== backupVersion || !isRecord(payload.data)) {
    throw new Error("La copia de seguridad no pertenece a Family_extracts o usa una version no compatible.");
  }

  const data = {} as Record<BackupTable, JsonRecord[]>;

  for (const table of backupTables) {
    const rows = payload.data[table];

    if (!Array.isArray(rows) || !rows.every(isRecord)) {
      throw new Error(`La seccion ${table} no es valida.`);
    }

    data[table] = rows;
  }

  return {
    app: "familyextracts",
    version: backupVersion,
    exportedAt: typeof payload.exportedAt === "string" ? payload.exportedAt : "",
    workspace: isRecord(payload.workspace)
      ? {
          id: typeof payload.workspace.id === "string" ? payload.workspace.id : "",
          name: typeof payload.workspace.name === "string" ? payload.workspace.name : ""
        }
      : { id: "", name: "" },
    data
  };
}

async function upsertRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: BackupTable,
  rows: JsonRecord[]
) {
  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });

  if (error) {
    throw new Error(`No se pudo importar ${table}: ${error.message}`);
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
