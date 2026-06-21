"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getBankAccountForEntity } from "@/lib/bank-accounts";
import { createClient } from "@/lib/supabase/server";
import { getViewMode, type ViewModeSearchParams } from "@/lib/view-mode";

type CashMovementType = "income" | "expense";

export async function createCashMovement(
  entityId: string,
  accountId: string,
  searchParams: ViewModeSearchParams,
  formData: FormData
) {
  const viewMode = getViewMode(searchParams);
  const { workspace, entity, account } = await getBankAccountForEntity(entityId, accountId);

  if (!entity || !account) {
    redirect("/entities");
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const date = String(formData.get("date") ?? "").trim();
  const concept = normalizeText(String(formData.get("concept") ?? ""));
  const type = String(formData.get("type") ?? "") as CashMovementType;
  const amount = parseAmount(String(formData.get("amount") ?? ""));
  const query = viewMode === "personal" ? "?mode=personal" : "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !concept || !isCashMovementType(type) || amount === null) {
    redirect(`/entities/${entity.id}/accounts/${account.id}/cash${query ? `${query}&` : "?"}error=invalid`);
  }

  const signedAmount = type === "expense" ? -amount : amount;
  const labelPrefix = type === "expense" ? "Gasto efectivo" : "Ingreso efectivo";
  const conceptOriginal = `${labelPrefix} - ${concept}`;
  const conceptNormalized = stripAccents(conceptOriginal).toUpperCase();
  const deduplicationKey = [
    "manual-cash",
    date,
    conceptNormalized,
    signedAmount.toFixed(2),
    crypto.randomUUID()
  ].join("|");

  const { data: importRecord, error: importError } = await supabase
    .from("imports")
    .insert({
      workspace_id: workspace.id,
      economic_entity_id: entity.id,
      bank_account_id: account.id,
      uploaded_by: user.id,
      file_name: "Movimiento manual en efectivo",
      status: "completed",
      rows_total: 1,
      rows_imported: 0,
      rows_duplicates: 0,
      rows_failed: 0
    })
    .select("id")
    .single<{ id: string }>();

  if (importError || !importRecord) {
    redirect(`/entities/${entity.id}/accounts/${account.id}/cash${query ? `${query}&` : "?"}error=save`);
  }

  const { error: transactionError } = await supabase.from("transactions").insert({
    workspace_id: workspace.id,
    economic_entity_id: entity.id,
    bank_account_id: account.id,
    import_id: importRecord.id,
    fecha_operativa: date,
    fecha_valor: date,
    concepto_original: conceptOriginal,
    concepto_normalizado: conceptNormalized,
    grupo_concepto: concept,
    importe: signedAmount,
    saldo: null,
    referencia: "manual-efectivo",
    deduplication_key: deduplicationKey
  });

  if (transactionError) {
    await supabase
      .from("imports")
      .update({
        status: "failed",
        rows_imported: 0,
        rows_failed: 1
      })
      .eq("workspace_id", workspace.id)
      .eq("id", importRecord.id);

    redirect(`/entities/${entity.id}/accounts/${account.id}/cash${query ? `${query}&` : "?"}error=save`);
  }

  await supabase
    .from("imports")
    .update({
      rows_imported: 1,
      rows_failed: 0
    })
    .eq("workspace_id", workspace.id)
    .eq("id", importRecord.id);

  revalidatePath(`/entities/${entity.id}/accounts/${account.id}`);
  revalidatePath(`/entities/${entity.id}/accounts/${account.id}/concept-groups`);
  redirect(`/entities/${entity.id}/accounts/${account.id}/concept-groups?type=${type}${viewMode === "personal" ? "&mode=personal" : ""}`);
}

export async function updateCashMovement(
  entityId: string,
  accountId: string,
  movementId: string,
  searchParams: ViewModeSearchParams,
  formData: FormData
) {
  const viewMode = getViewMode(searchParams);
  const { workspace, entity, account } = await getBankAccountForEntity(entityId, accountId);

  if (!entity || !account) {
    redirect("/entities");
  }

  const values = parseCashMovementForm(formData);
  const query = viewMode === "personal" ? "?mode=personal" : "";

  if (!values) {
    redirect(`/entities/${entity.id}/accounts/${account.id}/cash/${movementId}/edit${query ? `${query}&` : "?"}error=invalid`);
  }

  const supabase = await createClient();
  const { data: movement, error: movementError } = await supabase
    .from("transactions")
    .select("id, workspace_id, economic_entity_id, bank_account_id, referencia")
    .eq("workspace_id", workspace.id)
    .eq("economic_entity_id", entity.id)
    .eq("bank_account_id", account.id)
    .eq("id", movementId)
    .eq("referencia", "manual-efectivo")
    .maybeSingle<{ id: string }>();

  if (movementError || !movement) {
    redirect(`/entities/${entity.id}/accounts/${account.id}/cash/${movementId}/edit${query ? `${query}&` : "?"}error=not-found`);
  }

  const signedAmount = values.type === "expense" ? -values.amount : values.amount;
  const conceptOriginal = `${values.type === "expense" ? "Gasto efectivo" : "Ingreso efectivo"} - ${values.concept}`;
  const conceptNormalized = stripAccents(conceptOriginal).toUpperCase();

  const { error } = await supabase
    .from("transactions")
    .update({
      fecha_operativa: values.date,
      fecha_valor: values.date,
      concepto_original: conceptOriginal,
      concepto_normalizado: conceptNormalized,
      grupo_concepto: values.concept,
      importe: signedAmount
    })
    .eq("workspace_id", workspace.id)
    .eq("economic_entity_id", entity.id)
    .eq("bank_account_id", account.id)
    .eq("id", movementId)
    .eq("referencia", "manual-efectivo");

  if (error) {
    redirect(`/entities/${entity.id}/accounts/${account.id}/cash/${movementId}/edit${query ? `${query}&` : "?"}error=save`);
  }

  revalidatePath(`/entities/${entity.id}/accounts/${account.id}`);
  revalidatePath(`/entities/${entity.id}/accounts/${account.id}/concept-groups`);
  redirect(`/entities/${entity.id}/accounts/${account.id}/concept-groups/efectivo/${slugify(values.concept)}?type=${values.type}${viewMode === "personal" ? "&mode=personal" : ""}`);
}

export async function deleteCashMovement(
  entityId: string,
  accountId: string,
  movementId: string,
  searchParams: ViewModeSearchParams
) {
  const viewMode = getViewMode(searchParams);
  const { workspace, entity, account } = await getBankAccountForEntity(entityId, accountId);

  if (!entity || !account) {
    redirect("/entities");
  }

  const supabase = await createClient();
  const { data: movement, error: movementError } = await supabase
    .from("transactions")
    .select("id, import_id, importe")
    .eq("workspace_id", workspace.id)
    .eq("economic_entity_id", entity.id)
    .eq("bank_account_id", account.id)
    .eq("id", movementId)
    .eq("referencia", "manual-efectivo")
    .maybeSingle<{ id: string; import_id: string; importe: number | string }>();

  if (movementError || !movement) {
    redirect(`/entities/${entity.id}/accounts/${account.id}/concept-groups/efectivo?${viewMode === "personal" ? "mode=personal" : ""}`);
  }

  const type = Number(movement.importe) >= 0 ? "income" : "expense";

  const { error: deleteTransactionError } = await supabase
    .from("transactions")
    .delete()
    .eq("workspace_id", workspace.id)
    .eq("economic_entity_id", entity.id)
    .eq("bank_account_id", account.id)
    .eq("id", movement.id)
    .eq("referencia", "manual-efectivo");

  if (!deleteTransactionError) {
    await supabase
      .from("imports")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("id", movement.import_id)
      .eq("file_name", "Movimiento manual en efectivo");
  }

  revalidatePath(`/entities/${entity.id}/accounts/${account.id}`);
  revalidatePath(`/entities/${entity.id}/accounts/${account.id}/concept-groups`);
  redirect(`/entities/${entity.id}/accounts/${account.id}/concept-groups?type=${type}${viewMode === "personal" ? "&mode=personal" : ""}`);
}

function isCashMovementType(value: string): value is CashMovementType {
  return value === "income" || value === "expense";
}

function parseAmount(value: string) {
  const amount = Number(value.replace(",", "."));
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : null;
}

function parseCashMovementForm(formData: FormData) {
  const date = String(formData.get("date") ?? "").trim();
  const concept = normalizeText(String(formData.get("concept") ?? ""));
  const type = String(formData.get("type") ?? "");
  const amount = parseAmount(String(formData.get("amount") ?? ""));

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !concept || !isCashMovementType(type) || amount === null) {
    return null;
  }

  return {
    date,
    concept,
    type,
    amount
  };
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function slugify(value: string) {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
