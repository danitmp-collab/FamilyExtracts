import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentWorkspace = {
  id: string;
  name: string;
  role: "admin" | "viewer";
};

type WorkspaceMemberRow = {
  role: "admin";
  workspaces: {
    id: string;
    name: string;
  } | null;
};

type EntityAccessWorkspaceRow = {
  workspaces: {
    id: string;
    name: string;
  } | null;
};

type WorkspaceAdminEmailRow = {
  workspaces: {
    id: string;
    name: string;
  } | null;
};

export async function getCurrentWorkspace(): Promise<CurrentWorkspace> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name)")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle<WorkspaceMemberRow>();

  if (membershipError) {
    throw new Error(`No se pudo cargar el workspace: ${membershipError.message}`);
  }

  if (membership?.workspaces) {
    return {
      id: membership.workspaces.id,
      name: membership.workspaces.name,
      role: membership.role
    };
  }

  const email = user.email?.toLowerCase() ?? "";
  const { data: adminEmailAccess, error: adminEmailError } = await supabase
    .from("workspace_admin_emails")
    .select("workspaces(id, name)")
    .eq("email", email)
    .limit(1)
    .maybeSingle<WorkspaceAdminEmailRow>();

  if (adminEmailError) {
    throw new Error(`No se pudo cargar el acceso de administrador: ${adminEmailError.message}`);
  }

  if (adminEmailAccess?.workspaces) {
    return {
      id: adminEmailAccess.workspaces.id,
      name: adminEmailAccess.workspaces.name,
      role: "admin"
    };
  }

  const { data: entityAccess, error: entityAccessError } = await supabase
    .from("entity_accesses")
    .select("workspaces(id, name)")
    .eq("email", email)
    .limit(1)
    .maybeSingle<EntityAccessWorkspaceRow>();

  if (entityAccessError) {
    throw new Error(`No se pudo cargar el acceso del usuario: ${entityAccessError.message}`);
  }

  if (!entityAccess?.workspaces) {
    throw new Error("No hay workspace configurado para este usuario.");
  }

  return {
    id: entityAccess.workspaces.id,
    name: entityAccess.workspaces.name,
    role: "viewer"
  };
}
