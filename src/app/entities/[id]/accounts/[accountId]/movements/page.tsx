import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getMovementType,
  getMovementTypeLabel,
  listMovementsForAccount,
  parseMovementFilters
} from "@/lib/movements";
import { formatImportDate, formatMoney, formatTransactionDate } from "@/lib/import-history";

type MovementsPageProps = {
  params: Promise<{
    id: string;
    accountId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MovementsPage({ params, searchParams }: MovementsPageProps) {
  const { id, accountId } = await params;
  const filters = parseMovementFilters(await searchParams);
  const { workspace, entity, account, movements } = await listMovementsForAccount(id, accountId, filters);

  if (!entity || !account) {
    notFound();
  }

  return (
    <main className="page">
      <section className="shell">
        <div className="row">
          <div>
            <p className="eyebrow">{workspace.name} / {entity.name}</p>
            <h1>Movimientos</h1>
            <p className="muted">Cuenta: {account.name}</p>
          </div>

          <div className="actions">
            <Link className="button secondary" href={`/entities/${entity.id}/accounts/${account.id}`}>
              Cuenta
            </Link>
            <Link className="button secondary" href={`/entities/${entity.id}/accounts/${account.id}/imports`}>
              Importaciones
            </Link>
          </div>
        </div>

        <div className="panel stack">
          <form className="filter-grid" action={`/entities/${entity.id}/accounts/${account.id}/movements`}>
            <label className="field">
              <span>Fecha desde</span>
              <input className="input" type="date" name="dateFrom" defaultValue={filters.dateFrom ?? ""} />
            </label>
            <label className="field">
              <span>Fecha hasta</span>
              <input className="input" type="date" name="dateTo" defaultValue={filters.dateTo ?? ""} />
            </label>
            <label className="field">
              <span>Concepto</span>
              <input className="input" type="text" name="concept" defaultValue={filters.concept ?? ""} />
            </label>
            <label className="field">
              <span>Importe minimo</span>
              <input className="input" type="number" step="0.01" name="amountMin" defaultValue={filters.amountMin ?? ""} />
            </label>
            <label className="field">
              <span>Importe maximo</span>
              <input className="input" type="number" step="0.01" name="amountMax" defaultValue={filters.amountMax ?? ""} />
            </label>
            <label className="field">
              <span>Tipo</span>
              <select className="input" name="type" defaultValue={filters.type ?? ""}>
                <option value="">Todos</option>
                <option value="income">Ingreso</option>
                <option value="expense">Gasto</option>
              </select>
            </label>
            <div className="actions filter-actions">
              <button className="button" type="submit">
                Filtrar
              </button>
              <Link className="button secondary" href={`/entities/${entity.id}/accounts/${account.id}/movements`}>
                Limpiar
              </Link>
            </div>
          </form>
        </div>

        <div className="panel stack">
          <div className="toolbar">
            <h2>Listado</h2>
            <p className="muted">{movements.length} movimientos</p>
          </div>

          {movements.length === 0 ? (
            <p className="muted">No hay movimientos para los filtros seleccionados.</p>
          ) : (
            <div className="table-wrap">
              <table className="table movements-table">
                <thead>
                  <tr>
                    <th>Fecha operativa</th>
                    <th>Concepto original</th>
                    <th>Concepto normalizado</th>
                    <th>Importe</th>
                    <th>Tipo</th>
                    <th>Importacion</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => {
                    const type = getMovementType(movement.importe);

                    return (
                      <tr key={movement.id}>
                        <td>{formatTransactionDate(movement.fecha_operativa)}</td>
                        <td>{movement.concepto_original}</td>
                        <td>{movement.concepto_normalizado}</td>
                        <td>{formatMoney(movement.importe)}</td>
                        <td>
                          <span className={`status movement-${type}`}>{getMovementTypeLabel(type)}</span>
                        </td>
                        <td>
                          {movement.imports ? (
                            <Link
                              className="text-link"
                              href={`/entities/${entity.id}/accounts/${account.id}/imports/${movement.import_id}`}
                            >
                              {movement.imports.file_name} · {formatImportDate(movement.imports.created_at)}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
