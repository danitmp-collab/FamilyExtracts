import Link from "next/link";
import { signOut } from "@/app/dashboard/actions";
import { deactivateEconomicEntity } from "@/app/entities/actions";
import { listEconomicEntities } from "@/lib/economic-entities";

const typeLabels: Record<string, string> = {
  person: "Persona",
  household: "Hogar",
  business: "Negocio",
  other: "Otro"
};

export default async function EntitiesPage() {
  const { workspace, entities } = await listEconomicEntities();

  return (
    <main className="page">
      <section className="shell">
        <div className="row">
          <div>
            <p className="eyebrow">{workspace.name}</p>
            <h1>Entidades economicas</h1>
          </div>

          <div className="actions">
            <Link className="button secondary" href="/dashboard">
              Dashboard
            </Link>
            <form action={signOut}>
              <button className="button secondary" type="submit">
                Salir
              </button>
            </form>
          </div>
        </div>

        <div className="toolbar">
          <p className="muted">Gestiona las entidades familiares usadas para agrupar movimientos.</p>
          <Link className="button" href="/entities/new">
            Nueva entidad
          </Link>
        </div>

        <div className="panel">
          {entities.length === 0 ? (
            <p className="muted">Todavia no hay entidades economicas.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {entities.map((entity) => (
                    <tr key={entity.id}>
                      <td>
                        <strong>{entity.name}</strong>
                      </td>
                      <td>{typeLabels[entity.type]}</td>
                      <td>
                        <span className={entity.active ? "status active" : "status inactive"}>
                          {entity.active ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td>
                        <div className="actions">
                          <Link className="text-link" href={`/entities/${entity.id}`}>
                            Entrar
                          </Link>
                          <Link className="text-link" href={`/entities/${entity.id}/edit`}>
                            Editar
                          </Link>
                          {entity.active ? (
                            <form action={deactivateEconomicEntity.bind(null, entity.id)}>
                              <button className="link-button danger" type="submit">
                                Desactivar
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
