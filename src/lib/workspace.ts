import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentWorkspace = {
  id: string;
  name: string;
  role: "admin";
};

type WorkspaceMemberRow = {
  role: "admin";
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

  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, workspaces(id, name)")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle<WorkspaceMemberRow>();

  if (error) {
    throw new Error(`No se pudo cargar el workspace: ${error.message}`);
  }

  if (!data?.workspaces) {
    throw new Error("No hay workspace configurado para este usuario.");
  }

  return {
    id: data.workspaces.id,
    name: data.workspaces.name,
    role: data.role
  };
}
