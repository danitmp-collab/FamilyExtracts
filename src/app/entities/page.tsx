import Link from "next/link";
import { redirect } from "next/navigation";
import { MobileBackNavButton } from "@/app/back-button";
import { listEconomicEntities } from "@/lib/economic-entities";
import { withViewMode } from "@/lib/view-mode";

type EntitiesPageProps = {
  searchParams: Promise<{
    mode?: string;
  }>;
};

export default async function EntitiesPage({ searchParams }: EntitiesPageProps) {
  const { workspace, entities } = await listEconomicEntities();
  const rawSearchParams = await searchParams;
  const viewMode = rawSearchParams.mode === "personal" || workspace.role !== "admin" ? "personal" : "admin";
  const visibleEntities = entities.filter((entity) => entity.active);
  const primaryEntity = getPrimaryPersonalEntity(visibleEntities);

  if (workspace.role !== "admin" && primaryEntity) {
    redirect(withViewMode(`/entities/${primaryEntity.id}`, "personal"));
  }

  return (
    <main className="page finance-page finance-entities-page">
      <section className="shell finance-shell">
        <div className="row finance-topbar">
          <div>
            <p className="eyebrow">{workspace.name}</p>
            <h1>Ver todas las cuentas</h1>
          </div>
        </div>

        <div className="toolbar finance-section-intro">
          <p className="muted">Elige una persona, casa o taller para ver sus cuentas.</p>
        </div>

        <div className="entity-button-grid finance-entity-grid">
          {visibleEntities.length === 0 ? (
            <div className="panel">
              <p className="muted">Todavia no hay cuentas disponibles.</p>
            </div>
          ) : (
            visibleEntities.map((entity) => (
              <Link
                className="entity-select-button finance-entity-card"
                href={withViewMode(`/entities/${entity.id}`, viewMode)}
                key={entity.id}
              >
                <span>
                  <span className="finance-card-kicker">Perfil</span>
                  <strong>{entity.name}</strong>
                </span>
                <span aria-hidden="true">&gt;</span>
              </Link>
            ))
          )}
        </div>

        <nav className="mobile-bottom-nav entity-bottom-nav" aria-label="Navegacion principal">
          <Link className="mobile-bottom-nav-item" href="/dashboard">
            <span className="mobile-nav-icon nav-home" aria-hidden="true" />
            <span>Inicio</span>
          </Link>
          <MobileBackNavButton />
          <Link className="mobile-bottom-nav-item active" href="/entities">
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

function getPrimaryPersonalEntity(entities: Awaited<ReturnType<typeof listEconomicEntities>>["entities"]) {
  return (
    entities.find((entity) => entity.type === "person" && !isSharedEntity(entity.name)) ??
    entities.find((entity) => !isSharedEntity(entity.name)) ??
    entities[0]
  );
}

function isSharedEntity(name: string) {
  const normalizedName = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return normalizedName === "casa" || normalizedName === "taller";
}
