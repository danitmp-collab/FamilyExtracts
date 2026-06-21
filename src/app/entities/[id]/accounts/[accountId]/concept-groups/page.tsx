import Link from "next/link";
import { notFound } from "next/navigation";
import { MobileBottomNav } from "@/app/mobile-bottom-nav";
import {
  buildConceptGroupFilterQuery,
  listConceptGroupsForAccount,
  parseConceptGroupFilters
} from "@/lib/concept-groups";
import { formatMoney } from "@/lib/import-history";
import { getViewMode, withViewMode, type ViewModeSearchParams } from "@/lib/view-mode";

type AccountConceptGroupsPageProps = {
  params: Promise<{
    id: string;
    accountId: string;
  }>;
  searchParams: Promise<ViewModeSearchParams>;
};

export default async function AccountConceptGroupsPage({ params, searchParams }: AccountConceptGroupsPageProps) {
  const { id, accountId } = await params;
  const rawSearchParams = await searchParams;
  const viewMode = getViewMode(rawSearchParams);
  const filters = parseConceptGroupFilters(rawSearchParams);
  const { workspace, entity, account, groups } = await listConceptGroupsForAccount(id, accountId, filters);
  const pageTitle = filters.type === "income" ? "Ingresos" : filters.type === "expense" ? "Gastos" : "Grupos de concepto";
  const amountLabel = filters.type === "income" ? "Ingresos" : filters.type === "expense" ? "Gastos" : "Balance";
  const amountClassName = filters.type === "expense" ? "button-amount expense" : "button-amount";
  const filterQuery = buildConceptGroupFilterQuery(filters);

  if (!entity || !account) {
    notFound();
  }

  return (
    <main className="page finance-page finance-detail-page">
      <section className="shell finance-shell">
        <div className="row finance-topbar">
          <div>
            <p className="eyebrow">{workspace.name} / {entity.name}</p>
            <h1>{pageTitle}</h1>
          </div>
        </div>

        <div className="branch-list concept-group-buttons finance-branch-list">
          {groups.length === 0 ? (
            <p className="muted">No hay grupos para los filtros seleccionados.</p>
          ) : (
            groups.map((group) => (
              <Link
                className="branch-button primary-branch concept-group-button"
                href={withViewMode(
                  `/entities/${entity.id}/accounts/${account.id}/concept-groups/${group.slug}${filterQuery}`,
                  viewMode
                )}
                key={group.slug}
              >
                <span>
                  <strong>{group.label}</strong>
                  <small>
                    <span>
                      {amountLabel}:{" "}
                      <span
                        className={
                          (filters.type === "income"
                            ? group.income
                            : filters.type === "expense"
                              ? group.expenses
                              : group.balance) < 0
                            ? "button-amount expense"
                            : amountClassName
                        }
                      >
                        {formatMoney(
                          filters.type === "income"
                            ? group.income
                            : filters.type === "expense"
                              ? group.expenses
                              : group.balance
                        )}
                      </span>
                    </span>
                    <span aria-hidden="true"> · </span>
                    <span>{group.movements} movimientos</span>
                  </small>
                </span>
                <span aria-hidden="true">&gt;</span>
              </Link>
            ))
          )}
        </div>
        <MobileBottomNav active="accounts" personalHomeHref={withViewMode(`/entities/${entity.id}`, viewMode)} viewMode={viewMode} />
      </section>
    </main>
  );
}
