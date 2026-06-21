import Link from "next/link";
import { notFound } from "next/navigation";
import { MobileBottomNav } from "@/app/mobile-bottom-nav";
import { listMovementFilterOptions, listMovementsForAccount, parseMovementFilters } from "@/lib/movements";
import { formatMoney, formatTransactionDate } from "@/lib/import-history";
import { getViewMode, withViewMode } from "@/lib/view-mode";

type MovementsPageProps = {
  params: Promise<{
    id: string;
    accountId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MovementsPage({ params, searchParams }: MovementsPageProps) {
  const { id, accountId } = await params;
  const rawSearchParams = await searchParams;
  const viewMode = getViewMode(rawSearchParams);
  const isPersonalView = viewMode === "personal";
  const filters = parseMovementFilters(rawSearchParams);
  const { workspace, entity, account, movements } = await listMovementsForAccount(id, accountId, filters);
  const filterOptions = await listMovementFilterOptions(id, accountId);

  if (!entity || !account) {
    notFound();
  }

  return (
    <main className="page finance-page finance-detail-page">
      <section className="shell finance-shell">
        <div className="row finance-topbar">
          <div>
            <p className="eyebrow">{workspace.name} / {entity.name}</p>
            <h1>Extracto</h1>
            <p className="muted">{account.name}</p>
          </div>
        </div>

        <div className="panel compact-panel stack finance-account-panel">
          <form className="concept-filter-form" action={`/entities/${entity.id}/accounts/${account.id}/movements`}>
            {isPersonalView ? <input type="hidden" name="mode" value="personal" /> : null}
            {filters.type ? <input type="hidden" name="type" value={filters.type} /> : null}

            <div className="concept-filter-row compact-concept-filter-row">
              <label className="field compact-field">
                <span>Año</span>
                <select className="input" name="year" defaultValue={filters.year ?? ""}>
                  <option value="">Todos</option>
                  {filterOptions.years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field compact-field">
                <span>Mes</span>
                <select className="input" name="month" defaultValue={filters.month ?? ""}>
                  <option value="">Todos</option>
                  {filterOptions.months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </label>

              <button className="button compact-apply-button" type="submit">
                Aplicar
              </button>

              <details className="date-filter-details compact-date-details">
                <summary aria-label="Configurar fechas">
                  <span className="calendar-icon" aria-hidden="true" />
                  <span className="sr-only">Configurar fechas</span>
                </summary>
                <div className="date-range-row">
                  <label className="field">
                    <span>Desde</span>
                    <input className="input" type="date" name="dateFrom" defaultValue={filters.dateFrom ?? ""} />
                  </label>
                  <label className="field">
                    <span>Hasta</span>
                    <input className="input" type="date" name="dateTo" defaultValue={filters.dateTo ?? ""} />
                  </label>
                  <button className="button secondary" type="submit">
                    Filtrar fechas
                  </button>
                </div>
              </details>
            </div>
          </form>
        </div>

        <div className="panel compact-panel stack statement-panel finance-account-panel">
          <div className="toolbar statement-toolbar">
            <h2>Movimientos</h2>
            <p className="muted">{movements.length} movimientos</p>
          </div>

          {movements.length === 0 ? (
            <p className="muted">No hay movimientos para los filtros seleccionados.</p>
          ) : (
            <div className="statement-list">
              {movements.map((movement) => {
                const amount = Number(movement.importe);

                return (
                  <Link
                    className="statement-row"
                    href={withViewMode(`/entities/${entity.id}/accounts/${account.id}/movements/${movement.id}`, viewMode)}
                    key={movement.id}
                  >
                    <span className="statement-date">{formatTransactionDate(movement.fecha_operativa)}</span>
                    <span className="statement-concept">{movement.concepto_original || movement.concepto_normalizado || "-"}</span>
                    <strong className={amount >= 0 ? "statement-amount income" : "statement-amount expense"}>
                      {formatMoney(movement.importe)}
                    </strong>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        <MobileBottomNav active="accounts" personalHomeHref={withViewMode(`/entities/${entity.id}`, viewMode)} viewMode={viewMode} />
      </section>
    </main>
  );
}
