import Link from "next/link";
import { redirect } from "next/navigation";
import { MobileBottomNav } from "@/app/mobile-bottom-nav";
import { importBackup } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { isTestUserSelectorEnabled } from "@/lib/test-users";
import { getCurrentWorkspace } from "@/lib/workspace";

type SettingsPageProps = {
  searchParams: Promise<{
    backup?: string;
    rows?: string;
    message?: string;
  }>;
};

const backupMessages: Record<string, string> = {
  "missing-file": "Selecciona un archivo JSON de copia de seguridad.",
  imported: "Copia de seguridad importada correctamente.",
  error: "No se pudo importar la copia de seguridad."
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace();
  if (workspace.role !== "admin") {
    redirect("/dashboard");
  }

  const showTestSelector = isTestUserSelectorEnabled();
  const backupStatus = await searchParams;
  const backupMessage = getBackupMessage(backupStatus);

  return (
    <main className="page finance-page finance-detail-page">
      <section className="shell finance-shell">
        <div className="row finance-topbar">
          <div>
            <p className="eyebrow">{workspace.name}</p>
            <h1>Configuracion</h1>
          </div>
        </div>

        <div className="panel stack finance-account-panel">
          <h2>Gestion familiar</h2>
          <div className="settings-grid">
            {showTestSelector ? (
              <Link className="button secondary finance-ghost-action" href="/test-users">
                Selector de pruebas
              </Link>
            ) : null}
            <Link className="button secondary finance-ghost-action" href="/entities">
              Ver todas las cuentas
            </Link>
            <Link className="button secondary finance-ghost-action" href="/categories">
              Ver categorias
            </Link>
          </div>
        </div>

        <div className="panel stack finance-account-panel">
          <h2>Datos</h2>
          {backupMessage ? <p className={backupStatus.backup === "error" ? "error" : "success"}>{backupMessage}</p> : null}
          <div className="settings-data-actions">
            <Link className="button secondary finance-ghost-action" href="/settings/backup">
              Descargar copia de seguridad
            </Link>
            <form className="settings-import-form" action={importBackup}>
              <button className="button secondary finance-ghost-action" type="submit">
                Importar copia de seguridad
              </button>
              <label className="file-input-label">
                <span>Seleccionar archivo</span>
                <input type="file" name="backup" accept="application/json,.json" required />
              </label>
            </form>
            <button className="button danger" type="button" disabled>
              Eliminar todos los datos
            </button>
          </div>
        </div>
        <MobileBottomNav active="settings" />
      </section>
    </main>
  );
}

function getBackupMessage(searchParams: Awaited<SettingsPageProps["searchParams"]>) {
  if (!searchParams.backup) {
    return null;
  }

  if (searchParams.backup === "imported") {
    const rows = Number(searchParams.rows ?? 0);
    return rows > 0 ? `${backupMessages.imported} Registros procesados: ${rows}.` : backupMessages.imported;
  }

  if (searchParams.backup === "error" && searchParams.message) {
    return searchParams.message;
  }

  return backupMessages[searchParams.backup] ?? null;
}
