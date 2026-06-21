"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getBankAccountForEntity } from "@/lib/bank-accounts";
import { createClient } from "@/lib/supabase/server";

export async function updateMovementCategory(
  entityId: string,
  accountId: string,
  movementId: string,
  formData: FormData
) {
  const { workspace, entity, account } = await getBankAccountForEntity(entityId, accountId);

  if (!entity || !account) {
    throw new Error("La entidad o cuenta seleccionada no existe.");
  }

  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const supabase = await createClient();

  if (categoryId) {
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("workspace_id", workspace.id)
      .eq("id", categoryId)
      .eq("active", true)
      .maybeSingle<{ id: string }>();

    if (categoryError) {
      throw new Error(`No se pudo validar la categoria: ${categoryError.message}`);
    }

    if (!category) {
      throw new Error("La categoria seleccionada no existe o esta inactiva.");
    }
  }

  const { error } = await supabase
    .from("transactions")
    .update({ category_id: categoryId })
    .eq("workspace_id", workspace.id)
    .eq("economic_entity_id", entity.id)
    .eq("bank_account_id", account.id)
    .eq("id", movementId);

  if (error) {
    throw new Error(`No se pudo actualizar la categoria del movimiento: ${error.message}`);
  }

  revalidatePath(`/entities/${entity.id}/accounts/${account.id}/movements`);
  revalidatePath(`/entities/${entity.id}/accounts/${account.id}/movements/${movementId}`);
  redirect(`/entities/${entity.id}/accounts/${account.id}/movements/${movementId}`);
}

export async function updateMovementNote(
  entityId: string,
  accountId: string,
  movementId: string,
  formData: FormData
) {
  const { workspace, entity, account } = await getBankAccountForEntity(entityId, accountId);

  if (!entity || !account) {
    throw new Error("La entidad o cuenta seleccionada no existe.");
  }

  const noteValue = String(formData.get("note") ?? "").replace(/\s+/g, " ").trim();
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  const note = noteValue ? noteValue.slice(0, 140) : null;
  const supabase = await createClient();

  const { error } = await supabase
    .from("transactions")
    .update({ note })
    .eq("workspace_id", workspace.id)
    .eq("economic_entity_id", entity.id)
    .eq("bank_account_id", account.id)
    .eq("id", movementId);

  if (error) {
    throw new Error(`No se pudo actualizar la nota del movimiento: ${error.message}`);
  }

  revalidatePath(`/entities/${entity.id}/accounts/${account.id}/movements`);
  revalidatePath(`/entities/${entity.id}/accounts/${account.id}/movements/${movementId}`);
  revalidatePath(`/entities/${entity.id}/accounts/${account.id}/concept-groups`);
  redirect(isSafeReturnPath(returnTo) ? returnTo : `/entities/${entity.id}/accounts/${account.id}/movements/${movementId}`);
}

function isSafeReturnPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}
