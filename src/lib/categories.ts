import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export const categoryTypes = ["income", "expense", "neutral"] as const;

export type CategoryType = (typeof categoryTypes)[number];

export type Category = {
  id: string;
  workspace_id: string;
  name: string;
  type: CategoryType;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export function isCategoryType(value: string): value is CategoryType {
  return categoryTypes.includes(value as CategoryType);
}

export async function listCategories(includeInactive = true) {
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  let query = supabase
    .from("categories")
    .select("id, workspace_id, name, type, active, created_at, updated_at")
    .eq("workspace_id", workspace.id)
    .order("active", { ascending: false })
    .order("name", { ascending: true });

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query.returns<Category[]>();

  if (error) {
    throw new Error(`No se pudieron cargar las categorias: ${error.message}`);
  }

  return {
    workspace,
    categories: data
  };
}

export async function getCategory(categoryId: string) {
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, workspace_id, name, type, active, created_at, updated_at")
    .eq("workspace_id", workspace.id)
    .eq("id", categoryId)
    .maybeSingle<Category>();

  if (error) {
    throw new Error(`No se pudo cargar la categoria: ${error.message}`);
  }

  return {
    workspace,
    category: data
  };
}

export function getCategoryTypeLabel(type: CategoryType) {
  const labels: Record<CategoryType, string> = {
    income: "Ingreso",
    expense: "Gasto",
    neutral: "Neutral"
  };

  return labels[type];
}
