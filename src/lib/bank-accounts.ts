import { createClient } from "@/lib/supabase/server";
import { getEconomicEntity } from "@/lib/economic-entities";

export type BankAccount = {
  id: string;
  workspace_id: string;
  economic_entity_id: string;
  name: string;
  bank_name: string | null;
  iban_last4: string | null;
  currency: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export async function listBankAccountsForEntity(entityId: string) {
  const { workspace, entity } = await getEconomicEntity(entityId);

  if (!entity) {
    return {
      workspace,
      entity,
      accounts: [] as BankAccount[]
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_accounts")
    .select(
      "id, workspace_id, economic_entity_id, name, bank_name, iban_last4, currency, active, created_at, updated_at"
    )
    .eq("workspace_id", workspace.id)
    .eq("economic_entity_id", entity.id)
    .order("active", { ascending: false })
    .order("name", { ascending: true })
    .returns<BankAccount[]>();

  if (error) {
    throw new Error(`No se pudieron cargar las cuentas: ${error.message}`);
  }

  return {
    workspace,
    entity,
    accounts: data
  };
}

export async function getBankAccountForEntity(entityId: string, accountId: string) {
  const { workspace, entity } = await getEconomicEntity(entityId);

  if (!entity) {
    return {
      workspace,
      entity,
      account: null
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_accounts")
    .select(
      "id, workspace_id, economic_entity_id, name, bank_name, iban_last4, currency, active, created_at, updated_at"
    )
    .eq("workspace_id", workspace.id)
    .eq("economic_entity_id", entity.id)
    .eq("id", accountId)
    .maybeSingle<BankAccount>();

  if (error) {
    throw new Error(`No se pudo cargar la cuenta: ${error.message}`);
  }

  return {
    workspace,
    entity,
    account: data
  };
}

export async function getLatestAccountBalance(entityId: string, accountId: string) {
  const { workspace, entity, account } = await getBankAccountForEntity(entityId, accountId);

  if (!entity || !account) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("saldo, source_row_number, id")
    .eq("workspace_id", workspace.id)
    .eq("economic_entity_id", entity.id)
    .eq("bank_account_id", account.id)
    .not("saldo", "is", null)
    .order("fecha_operativa", { ascending: false })
    .order("created_at", { ascending: false })
    .order("source_row_number", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle<{ saldo: number | string | null }>();

  if (error) {
    throw new Error(`No se pudo cargar el saldo de la cuenta: ${error.message}`);
  }

  return data?.saldo ?? null;
}

export async function listLatestAccountBalancesForEntity(entityId: string) {
  const { workspace, entity } = await getEconomicEntity(entityId);

  if (!entity) {
    return {
      workspace,
      entity,
      balances: new Map<string, number | string>()
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("id, bank_account_id, saldo, fecha_operativa, created_at, source_row_number")
    .eq("workspace_id", workspace.id)
    .eq("economic_entity_id", entity.id)
    .not("saldo", "is", null)
    .order("fecha_operativa", { ascending: false })
    .order("created_at", { ascending: false })
    .order("source_row_number", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true })
    .returns<Array<{
      id: string;
      bank_account_id: string;
      saldo: number | string | null;
      source_row_number: number | null;
    }>>();

  if (error) {
    throw new Error(`No se pudieron cargar los saldos de las cuentas: ${error.message}`);
  }

  const balances = new Map<string, number | string>();

  for (const row of data) {
    if (row.saldo !== null && !balances.has(row.bank_account_id)) {
      balances.set(row.bank_account_id, row.saldo);
    }
  }

  return {
    workspace,
    entity,
    balances
  };
}
