import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listEconomicEntities } from "@/lib/economic-entities";
import { getCurrentWorkspace } from "@/lib/workspace";
import { signOut } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace();
  const { entities } = await listEconomicEntities();
  const activeEntities = entities.filter((entity) => entity.active);
  const daniEntity = entities.find((entity) => normalizeName(entity.name) === "dani");
  const primaryEntity = workspace.role === "admin" ? daniEntity : getPrimaryPersonalEntity(activeEntities);

  if (workspace.role !== "admin" && primaryEntity) {
    redirect(`/entities/${primaryEntity.id}?mode=personal`);
  }

  return (
    <main className="page finance-page finance-workspace-page">
      <section className="shell finance-shell">
        <div className="row finance-topbar">
          <div>
            <p className="eyebrow">Workspace</p>
            <h1>Family_extracts</h1>
            <p className="muted">Sesion iniciada como {user.email}</p>
          </div>
        </div>

        <div className="panel stack finance-hero-panel">
          <div>
            <p className="eyebrow">Panel financiero</p>
            <h2>Workspace familiar</h2>
          </div>
          <div className="dashboard-actions finance-action-grid">
            <Link
              className="button finance-primary-action"
              href={
                primaryEntity
                  ? `/entities/${primaryEntity.id}${workspace.role === "admin" ? "" : "?mode=personal"}`
                  : "/entities"
              }
            >
              {workspace.role === "admin" ? "Ver mi cuenta" : "Ver mis cuentas"}
            </Link>
          </div>
        </div>

        <p className="finance-app-signature finance-app-signature-logged">Creado por Dani · danitmp@gmail.com</p>

        <nav className="mobile-bottom-nav" aria-label="Navegacion principal">
          <form className="mobile-bottom-nav-form" action={signOut}>
            <button className="mobile-bottom-nav-item mobile-bottom-nav-button" type="submit">
              <span className="mobile-nav-icon nav-exit" aria-hidden="true" />
              <span>Salir</span>
            </button>
          </form>
          <Link className="mobile-bottom-nav-item" href="/entities">
            <span className="mobile-nav-icon nav-accounts" aria-hidden="true" />
            <span>Cuentas</span>
          </Link>
          {workspace.role === "admin" ? (
            <Link className="mobile-bottom-nav-item" href="/settings">
              <span className="mobile-nav-icon nav-settings" aria-hidden="true" />
              <span>Ajustes</span>
            </Link>
          ) : null}
        </nav>
      </section>
    </main>
  );
}

function normalizeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getPrimaryPersonalEntity(entities: Awaited<ReturnType<typeof listEconomicEntities>>["entities"]) {
  return (
    entities.find((entity) => entity.type === "person" && !isSharedEntity(entity.name)) ??
    entities.find((entity) => !isSharedEntity(entity.name)) ??
    entities[0]
  );
}

function isSharedEntity(name: string) {
  const normalizedName = normalizeName(name);
  return normalizedName === "casa" || normalizedName === "taller";
}
