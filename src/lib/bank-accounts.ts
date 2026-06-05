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
