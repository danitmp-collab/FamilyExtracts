import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export const economicEntityTypes = ["person", "household", "business", "other"] as const;

export type EconomicEntityType = (typeof economicEntityTypes)[number];

export type EconomicEntity = {
  id: string;
  workspace_id: string;
  name: string;
  type: EconomicEntityType;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export function isEconomicEntityType(value: string): value is EconomicEntityType {
  return economicEntityTypes.includes(value as EconomicEntityType);
}

export async function listEconomicEntities() {
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("economic_entities")
    .select("id, workspace_id, name, type, active, created_at, updated_at")
    .eq("workspace_id", workspace.id)
    .order("active", { ascending: false })
    .order("name", { ascending: true })
    .returns<EconomicEntity[]>();

  if (error) {
    throw new Error(`No se pudieron cargar las entidades: ${error.message}`);
  }

  return {
    workspace,
    entities: data
  };
}

export async function getEconomicEntity(entityId: string) {
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("economic_entities")
    .select("id, workspace_id, name, type, active, created_at, updated_at")
    .eq("workspace_id", workspace.id)
    .eq("id", entityId)
    .maybeSingle<EconomicEntity>();

  if (error) {
    throw new Error(`No se pudo cargar la entidad: ${error.message}`);
  }

  return {
    workspace,
    entity: data
  };
}

export async function canManageEconomicEntity(entityId: string) {
  const workspace = await getCurrentWorkspace();

  if (workspace.role === "admin") {
    return true;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return false;
  }

  const { data, error } = await supabase
    .from("entity_accesses")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("economic_entity_id", entityId)
    .eq("email", user.email.toLowerCase())
    .eq("can_manage", true)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(`No se pudo comprobar el permiso de gestion: ${error.message}`);
  }

  return Boolean(data);
}
