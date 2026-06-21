"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isCategoryType } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

function parseCategoryForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const active = formData.get("active") === "on";

  if (!name) {
    throw new Error("El nombre de la categoria es obligatorio.");
  }

  if (!isCategoryType(type)) {
    throw new Error("El tipo de categoria no es valido.");
  }

  return {
    name,
    type,
    active
  };
}

export async function createCategory(formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const values = parseCategoryForm(formData);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .insert({
      workspace_id: workspace.id,
      name: values.name,
      type: values.type,
      active: true
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    throw new Error(`No se pudo crear la categoria: ${error.message}`);
  }

  revalidatePath("/categories");
  redirect(`/categories/${data.id}/edit`);
}

export async function updateCategory(categoryId: string, formData: FormData) {
  const workspace = await getCurrentWorkspace();
  const values = parseCategoryForm(formData);
  const supabase = await createClient();

  const { error } = await supabase
    .from("categories")
    .update({
      name: values.name,
      type: values.type,
      active: values.active
    })
    .eq("workspace_id", workspace.id)
    .eq("id", categoryId);

  if (error) {
    throw new Error(`No se pudo actualizar la categoria: ${error.message}`);
  }

  revalidatePath("/categories");
  revalidatePath(`/categories/${categoryId}/edit`);
  redirect("/categories");
}

export async function deactivateCategory(categoryId: string) {
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();

  const { error } = await supabase
    .from("categories")
    .update({ active: false })
    .eq("workspace_id", workspace.id)
    .eq("id", categoryId);

  if (error) {
    throw new Error(`No se pudo desactivar la categoria: ${error.message}`);
  }

  revalidatePath("/categories");
}
