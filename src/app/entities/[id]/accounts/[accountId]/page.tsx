import Link from "next/link";
import { notFound } from "next/navigation";
import { MobileBackNavButton } from "@/app/back-button";
import { signOut } from "@/app/dashboard/actions";
import { AccountFilterForm } from "./account-filter-form";
import { getBankAccountForEntity, getLatestAccountBalance } from "@/lib/bank-accounts";
import {
  buildConceptGroupFilterQuery,
  listConceptGroupsForAccount,
  parseConceptGroupFilters
} from "@/lib/concept-groups";
import { formatMoney } from "@/lib/import-history";
import { getViewMode, withViewMode, type ViewModeSearchParams } from "@/lib/view-mode";

type AccountPageProps = {
  params: Promise<{
    id: string;
    accountId: string;
  }>;
  searchParams: Promise<ViewModeSearchParams>;
};

export default async function AccountPage({ params, searchParams }: AccountPageProps) {
  const { id, accountId } = await params;
  const rawSearchParams = await searchParams;
  const requestedViewMode = getViewMode(rawSearchParams);
  const filters = parseConceptGroupFilters(rawSearchParams);
  const { workspace, entity, account } = await getBankAccountForEntity(id, accountId);
  const viewMode = workspace.role === "admin" ? requestedViewMode : "personal";
  const balance = await getLatestAccountBalance(id, accountId);
  const { groups, filterOptions } = await listConceptGroupsForAccount(id, accountId, filters);
  const incomeTotal = groups.reduce((total, group) => total + group.income, 0);
  const expenseTotal = groups.reduce((total, group) => total + group.expenses, 0);
  const baseFilterQuery = buildConceptGroupFilterQuery(filters);
  const incomeFilterQuery = buildConceptGroupFilterQuery({ ...filters, type: "income" });
  const expenseFilterQuery = buildConceptGroupFilterQuery({ ...filters, type: "expense" });

  if (!entity || !account) {
    notFound();
  }

  return (
    <main className="page finance-page finance-account-page">
      <section className="shell finance-shell">
        <div className="row finance-topbar">
          <div>
            <p className="eyebrow">{workspace.name} / {entity.name}</p>
            <h1>{account.name}</h1>
          </div>
        </div>

        <div className="panel stack account-home-panel finance-account-panel">
          <div className="balance-card finance-balance-card">
            <span>Saldo</span>
            <strong className={balance !== null && Number(balance) < 0 ? "money-negative" : undefined}>
              {balance === null ? "Sin saldo" : formatMoney(balance)}
            </strong>
          </div>

          <AccountFilterForm
            action={`/entities/${entity.id}/accounts/${account.id}`}
            filters={filters}
            filterOptions={filterOptions}
            viewMode={viewMode}
          />

          <div className="branch-list finance-branch-list">
            <Link
              className="branch-button primary-branch finance-account-card"
              href={withViewMode(`/entities/${entity.id}/accounts/${account.id}/concept-groups${incomeFilterQuery}`, viewMode)}
            >
              <span>
                <strong>Ver ingresos</strong>
                <small>
                  Ingresos: <span className="button-amount">{formatMoney(incomeTotal)}</span>
                </small>
              </span>
            </Link>
            <Link
              className="branch-button primary-branch finance-account-card"
              href={withViewMode(`/entities/${entity.id}/accounts/${account.id}/concept-groups${expenseFilterQuery}`, viewMode)}
            >
              <span>
                <strong>Ver gastos</strong>
                <small>
                  Gastos: <span className="button-amount expense">{formatMoney(expenseTotal)}</span>
                </small>
              </span>
            </Link>
            <Link
              className="branch-button primary-branch finance-account-card"
              href={withViewMode(`/entities/${entity.id}/accounts/${account.id}/movements${baseFilterQuery}`, viewMode)}
            >
              Ver extracto
            </Link>
            <Link
              className="branch-button primary-branch finance-account-card"
              href={withViewMode(`/entities/${entity.id}/accounts/${account.id}/cash`, viewMode)}
              hidden={workspace.role !== "admin"}
            >
              Añadir ingresos/gastos en efectivo
            </Link>
          </div>
        </div>

        {viewMode === "personal" ? (
          <nav className="mobile-bottom-nav compact-personal-nav" aria-label="Navegacion personal">
            <Link className="mobile-bottom-nav-item" href={withViewMode(`/entities/${entity.id}`, viewMode)}>
              <span className="mobile-nav-icon nav-home" aria-hidden="true" />
              <span>Inicio</span>
            </Link>
            <MobileBackNavButton />
            <form className="mobile-bottom-nav-form" action={signOut}>
              <button className="mobile-bottom-nav-item mobile-bottom-nav-button" type="submit">
                <span className="mobile-nav-icon nav-exit" aria-hidden="true" />
                <span>Salir</span>
              </button>
            </form>
          </nav>
        ) : (
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
            <Link className="mobile-bottom-nav-item" href="/settings">
              <span className="mobile-nav-icon nav-settings" aria-hidden="true" />
              <span>Ajustes</span>
            </Link>
          </nav>
        )}
      </section>
    </main>
  );
}
