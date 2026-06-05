"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEconomicEntity } from "@/lib/economic-entities";

function parseAccountForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const bankName = String(formData.get("bank_name") ?? "").trim();
  const ibanLast4 = String(formData.get("iban_last4") ?? "").trim();
  const currency = String(formData.get("currency") ?? "EUR").trim().toUpperCase();
  const active = formData.get("active") === "on";

  if (!name) {
    throw new Error("El nombre de la cuenta es obligatorio.");
  }

  if (ibanLast4 && !/^[0-9]{4}$/.test(ibanLast4)) {
    throw new Error("Los ultimos digitos del IBAN deben ser 4 numeros.");
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("La moneda debe tener codigo ISO de 3 letras.");
  }

  return {
    name,
    bank_name: bankName || null,
    iban_last4: ibanLast4 || null,
    currency,
    active
  };
}

export async function createBankAccount(entityId: string, formData: FormData) {
  const { workspace, entity } = await getEconomicEntity(entityId);

  if (!entity) {
    throw new Error("La entidad seleccionada no existe.");
  }

  const values = parseAccountForm(formData);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bank_accounts")
    .insert({
      workspace_id: workspace.id,
      economic_entity_id: entity.id,
      name: values.name,
      bank_name: values.bank_name,
      iban_last4: values.iban_last4,
      currency: values.currency,
      active: true
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    throw new Error(`No se pudo crear la cuenta: ${error.message}`);
  }

  revalidatePath(`/entities/${entity.id}`);
  redirect(`/entities/${entity.id}/accounts/${data.id}`);
}

export async function updateBankAccount(entityId: string, accountId: string, formData: FormData) {
  const { workspace, entity } = await getEconomicEntity(entityId);

  if (!entity) {
    throw new Error("La entidad seleccionada no existe.");
  }

  const values = parseAccountForm(formData);
  const supabase = await createClient();

  const { error } = await supabase
    .from("bank_accounts")
    .update(values)
    .eq("workspace_id", workspace.id)
    .eq("economic_entity_id", entity.id)
    .eq("id", accountId);

  if (error) {
    throw new Error(`No se pudo actualizar la cuenta: ${error.message}`);
  }

  revalidatePath(`/entities/${entity.id}`);
  revalidatePath(`/entities/${entity.id}/accounts/${accountId}`);
  redirect(`/entities/${entity.id}/accounts/${accountId}`);
}

export async function deactivateBankAccount(entityId: string, accountId: string) {
  const { workspace, entity } = await getEconomicEntity(entityId);

  if (!entity) {
    throw new Error("La entidad seleccionada no existe.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("bank_accounts")
    .update({ active: false })
    .eq("workspace_id", workspace.id)
    .eq("economic_entity_id", entity.id)
    .eq("id", accountId);

  if (error) {
    throw new Error(`No se pudo desactivar la cuenta: ${error.message}`);
  }

  revalidatePath(`/entities/${entity.id}`);
  revalidatePath(`/entities/${entity.id}/accounts/${accountId}`);
}
