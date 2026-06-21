"use server";

import { redirect } from "next/navigation";
import { importBackupPayload } from "@/lib/backup";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export async function importBackup(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const file = formData.get("backup");

  if (!(file instanceof File) || file.size === 0) {
    redirect("/settings?backup=missing-file");
  }

  let redirectUrl = "/settings?backup=imported&rows=0";
  const workspace = await getCurrentWorkspace();

  if (workspace.role !== "admin") {
    redirect("/dashboard");
  }

  try {
    const payload = JSON.parse(await file.text()) as unknown;
    const result = await importBackupPayload(payload, workspace, user.id);
    const totalRows =
      result.economicEntities +
      result.bankAccounts +
      result.categories +
      result.imports +
      result.transactions;

    redirectUrl = `/settings?backup=imported&rows=${totalRows}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo importar la copia.";
    redirectUrl = `/settings?backup=error&message=${encodeURIComponent(message)}`;
  }

  redirect(redirectUrl);
}
