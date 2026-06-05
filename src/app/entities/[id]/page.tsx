import Link from "next/link";
import { notFound } from "next/navigation";
import { deactivateBankAccount } from "@/app/entities/[id]/accounts/actions";
import { deactivateEconomicEntity } from "@/app/entities/actions";
import { listBankAccountsForEntity } from "@/lib/bank-accounts";
import { getEconomicEntity } from "@/lib/economic-entities";

type EntityPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const typeLabels: Record<string, string> = {
  person: "Persona",
  household: "Hogar",
  business: "Negocio",
  other: "Otro"
};

export default async function EntityPage({ params }: EntityPageProps) {
  const { id } = await params;
  const { workspace, entity } = await getEconomicEntity(id);

  if (!entity) {
    notFound();
  }

  const { accounts } = await listBankAccountsForEntity(entity.id);

  return (
    <main className="page">
      <section className="shell">
        <div className="row">
          <div>
            <p className="eyebrow">{workspace.name}</p>
            <h1>{entity.name}</h1>
            <p className="muted">{typeLabels[entity.type]}</p>
          </div>

          <div className="actions">
            <Link className="button secondary" href="/entities">
              Entidades
            </Link>
            <Link className="button" href={`/entities/${entity.id}/edit`}>
              Editar
            </Link>
          </div>
        </div>

        <div className="panel stack">
          <div className="definition-grid">
            <span>Estado</span>
            <strong>{entity.active ? "Activa" : "Inactiva"}</strong>
            <span>Tipo</span>
            <strong>{typeLabels[entity.type]}</strong>
          </div>

          {entity.active ? (
            <form action={deactivateEconomicEntity.bind(null, entity.id)}>
              <button className="button secondary" type="submit">
                Desactivar entidad
              </button>
            </form>
          ) : null}
        </div>

        <div className="panel stack">
          <div className="toolbar">
            <div>
              <h2>Cuentas bancarias</h2>
              <p className="muted">Cuentas asociadas a {entity.name}.</p>
            </div>
            <Link className="button" href={`/entities/${entity.id}/accounts/new`}>
              Nueva cuenta
            </Link>
          </div>

          {accounts.length === 0 ? (
            <p className="muted">Todavia no hay cuentas bancarias para esta entidad.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Banco</th>
                    <th>IBAN</th>
                    <th>Moneda</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id}>
                      <td>
                        <strong>{account.name}</strong>
                      </td>
                      <td>{account.bank_name || "-"}</td>
                      <td>{account.iban_last4 ? `**** ${account.iban_last4}` : "-"}</td>
                      <td>{account.currency}</td>
                      <td>
                        <span className={account.active ? "status active" : "status inactive"}>
                          {account.active ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td>
                        <div className="actions">
                          <Link className="text-link" href={`/entities/${entity.id}/accounts/${account.id}`}>
                            Entrar
                          </Link>
                          <Link
                            className="text-link"
                            href={`/entities/${entity.id}/accounts/${account.id}/edit`}
                          >
                            Editar
                          </Link>
                          <Link
                            className="text-link"
                            href={`/entities/${entity.id}/accounts/${account.id}/import`}
                          >
                            Subir Excel
                          </Link>
                          <Link
                            className="text-link"
                            href={`/entities/${entity.id}/accounts/${account.id}/imports`}
                          >
                            Importaciones
                          </Link>
                          <Link
                            className="text-link"
                            href={`/entities/${entity.id}/accounts/${account.id}/movements`}
                          >
                            Movimientos
                          </Link>
                          {account.active ? (
                            <form action={deactivateBankAccount.bind(null, entity.id, account.id)}>
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
          <p className="muted">La importacion definitiva se abordara en fases posteriores.</p>
        </div>
      </section>
    </main>
  );
}
