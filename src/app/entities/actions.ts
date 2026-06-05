"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isEconomicEntityType } from "@/lib/economic-entities";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

function parseEntityForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const active = formData.get("active") === "on";

  if (!name) {
    throw new Error("El nombre de la entidad es obligatorio.");
  }

  if (!isEconomicEntityType(type)) {
    throw new Error("El tipo de entidad no es valido.");
  }

  return {
    name,
    type,
    active
  };
}

export async function createEconomicEntity(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const values = parseEntityForm(formData);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("economic_entities")
    .insert({
      workspace_id: workspace.id,
      name: values.name,
      type: values.type,
      active: true
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    throw new Error(`No se pudo crear la entidad: ${error.message}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/entities");
  redirect(`/entities/${data.id}`);
}

export async function updateEconomicEntity(entityId: string, formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const values = parseEntityForm(formData);
  const supabase = await createClient();

  const { error } = await supabase
    .from("economic_entities")
    .update({
      name: values.name,
      type: values.type,
      active: values.active
    })
    .eq("workspace_id", workspace.id)
    .eq("id", entityId);

  if (error) {
    throw new Error(`No se pudo actualizar la entidad: ${error.message}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/entities");
  revalidatePath(`/entities/${entityId}`);
  redirect(`/entities/${entityId}`);
}

export async function deactivateEconomicEntity(entityId: string) {
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();

  const { error } = await supabase
    .from("economic_entities")
    .update({ active: false })
    .eq("workspace_id", workspace.id)
    .eq("id", entityId);

  if (error) {
    throw new Error(`No se pudo desactivar la entidad: ${error.message}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/entities");
  revalidatePath(`/entities/${entityId}`);
}
