"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getBankAccountForEntity } from "@/lib/bank-accounts";
import { canManageEconomicEntity } from "@/lib/economic-entities";
import { createClient } from "@/lib/supabase/server";

type DeleteImportResult = {
  transactions_deleted: number;
};

export async function deleteImport(entityId: string, accountId: string, importId: string) {
  const { workspace, entity, account } = await getBankAccountForEntity(entityId, accountId);

  if (!entity || !account) {
    redirect("/entities");
  }

  if (!(await canManageEconomicEntity(entity.id))) {
    redirect(`/entities/${entity.id}/accounts/${account.id}/imports?delete=forbidden`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_import_with_transactions", {
    p_workspace_id: workspace.id,
    p_economic_entity_id: entity.id,
    p_bank_account_id: account.id,
    p_import_id: importId
  });

  if (error) {
    redirect(`/entities/${entity.id}/accounts/${account.id}/imports?delete=error`);
  }

  const result = normalizeDeleteImportResult(data);
  const deletedRows = result?.transactions_deleted ?? 0;

  revalidatePath(`/entities/${entity.id}`);
  revalidatePath(`/entities/${entity.id}/accounts/${account.id}`);
  revalidatePath(`/entities/${entity.id}/accounts/${account.id}/imports`);
  revalidatePath(`/entities/${entity.id}/accounts/${account.id}/movements`);
  redirect(`/entities/${entity.id}/accounts/${account.id}/imports?delete=success&rows=${deletedRows}`);
}

function normalizeDeleteImportResult(data: unknown): DeleteImportResult | null {
  if (Array.isArray(data)) {
    return (data[0] as DeleteImportResult | undefined) ?? null;
  }

  if (data && typeof data === "object") {
    return data as DeleteImportResult;
  }

  return null;
}
