import Link from "next/link";
import { notFound } from "next/navigation";
import { MobileBottomNav } from "@/app/mobile-bottom-nav";
import {
  buildConceptGroupFilterQuery,
  listConceptSubgroupsForAccount,
  parseConceptGroupFilters
} from "@/lib/concept-groups";
import { formatMoney } from "@/lib/import-history";
import { getViewMode, withViewMode, type ViewModeSearchParams } from "@/lib/view-mode";

type AccountConceptSubgroupsPageProps = {
  params: Promise<{
    id: string;
    accountId: string;
    group: string;
  }>;
  searchParams: Promise<ViewModeSearchParams>;
};

export default async function AccountConceptSubgroupsPage({ params, searchParams }: AccountConceptSubgroupsPageProps) {
  const { id, accountId, group } = await params;
  const rawSearchParams = await searchParams;
  const viewMode = getViewMode(rawSearchParams);
  const filters = parseConceptGroupFilters(rawSearchParams);
  const filterQuery = buildConceptGroupFilterQuery(filters);
  const { workspace, entity, account, group: groupLabel, subgroups } = await listConceptSubgroupsForAccount(
    id,
    accountId,
    group,
    filters
  );
  const amountLabel = filters.type === "income" ? "Ingresos" : filters.type === "expense" ? "Gastos" : "Balance";
  const amountClassName = filters.type === "expense" ? "button-amount expense" : "button-amount";

  if (!entity || !account || !groupLabel) {
    notFound();
  }

  return (
    <main className="page finance-page finance-detail-page">
      <section className="shell finance-shell">
        <div className="row finance-topbar">
          <div>
            <p className="eyebrow">{workspace.name} / {entity.name}</p>
            <h1>{groupLabel}</h1>
          </div>

        </div>

        <div className="branch-list concept-group-buttons finance-branch-list">
          {subgroups.length === 0 ? (
            <p className="muted">No hay subgrupos para los filtros seleccionados.</p>
          ) : (
            subgroups.map((subgroup) => (
              <Link
                className="branch-button primary-branch concept-group-button"
                href={withViewMode(
                  `/entities/${entity.id}/accounts/${account.id}/concept-groups/${group}/${subgroup.slug}${filterQuery}`,
                  viewMode
                )}
                key={subgroup.slug}
              >
                <span>
                  <strong>{subgroup.label}</strong>
                  {subgroup.note ? <span className="button-note">{subgroup.note}</span> : null}
                  <small>
                    <span>
                      {amountLabel}:{" "}
                      <span
                        className={
                          (filters.type === "income"
                            ? subgroup.income
                            : filters.type === "expense"
                              ? subgroup.expenses
                              : subgroup.balance) < 0
                            ? "button-amount expense"
                            : amountClassName
                        }
                      >
                        {formatMoney(
                          filters.type === "income"
                            ? subgroup.income
                            : filters.type === "expense"
                              ? subgroup.expenses
                              : subgroup.balance
                        )}
                      </span>
                    </span>
                    <span aria-hidden="true"> · </span>
                    <span>{subgroup.movements} movimientos</span>
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
