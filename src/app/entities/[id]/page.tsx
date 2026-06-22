import Link from "next/link";
import { notFound } from "next/navigation";
import { MobileBackNavButton } from "@/app/back-button";
import { signOut } from "@/app/dashboard/actions";
import { deactivateBankAccount } from "@/app/entities/[id]/accounts/actions";
import {
  getLatestEntityMovementDate,
  isMovementDateStale,
  listBankAccountsForEntity,
  listLatestAccountBalancesForEntity
} from "@/lib/bank-accounts";
import { canManageEconomicEntity, getEconomicEntity, listEconomicEntities } from "@/lib/economic-entities";
import { formatMoney, formatTransactionDate } from "@/lib/import-history";
import { getViewMode, withViewMode, type ViewModeSearchParams } from "@/lib/view-mode";

type EntityPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<ViewModeSearchParams>;
};

export default async function EntityPage({ params, searchParams }: EntityPageProps) {
  const { id } = await params;
  const requestedViewMode = getViewMode(await searchParams);
  const { workspace, entity } = await getEconomicEntity(id);
  const viewMode = workspace.role === "admin" ? requestedViewMode : "personal";
  const isPersonalView = viewMode === "personal";

  if (!entity) {
    notFound();
  }

  const { accounts } = await listBankAccountsForEntity(entity.id);
  const { balances } = await listLatestAccountBalancesForEntity(entity.id);
  const latestMovementDate = await getLatestEntityMovementDate(entity.id);
  const knownBalances = accounts
    .map((account) => balances.get(account.id))
    .filter((balance): balance is number | string => balance !== undefined);
  const totalBalance = knownBalances.reduce<number>((total, balance) => total + Number(balance), 0);
  const sharedEntities = isPersonalView && isCrisEntity(entity.name) ? await listSharedEntitiesForCris(entity.id) : [];
  const canManageAccounts = await canManageEconomicEntity(entity.id);
  const canUseFullManagement = workspace.role === "admin" && (!isPersonalView || isCrisEntity(entity.name));

  return (
    <main className="page finance-page finance-entity-page">
      <section className="shell finance-shell">
        <div className={isPersonalView ? "row personal-home-header finance-topbar" : "row finance-topbar"}>
          <div>
            <p className="eyebrow">{workspace.name}</p>
            <h1>{entity.name}</h1>
            <p className="finance-last-update">
              Última actualización: {latestMovementDate ? formatTransactionDate(latestMovementDate) : "Sin datos"}
              {isMovementDateStale(latestMovementDate) ? <span aria-label="Datos desactualizados"> ⚠️</span> : null}
            </p>
          </div>

        </div>

        {accounts.length > 1 ? (
          <div className="balance-card finance-balance-card">
            <span>Saldo total</span>
            <strong className={totalBalance < 0 ? "money-negative" : undefined}>
              {knownBalances.length === 0 ? "Sin saldo" : formatMoney(totalBalance)}
            </strong>
          </div>
        ) : null}

        <div className="branch-list finance-branch-list">
          {accounts.length === 0 ? (
            <p className="muted">Todavia no hay cuentas para {entity.name}.</p>
          ) : (
            <>
              {accounts.map((account) => {
                const balance = balances.get(account.id);

                return (
                  <Link
                    className="branch-button primary-branch finance-account-card"
                    href={withViewMode(`/entities/${entity.id}/accounts/${account.id}`, viewMode)}
                    key={account.id}
                  >
                    <span>
                      <strong>{account.name}</strong>
                      <small>{account.bank_name || "Banco no indicado"}</small>
                      <small>
                        Saldo:{" "}
                        <span className={balance !== undefined && Number(balance) < 0 ? "button-amount money-negative" : "button-amount"}>
                          {balance === undefined ? "Sin saldo" : formatMoney(balance)}
                        </span>
                      </small>
                    </span>
                    <span aria-hidden="true">&gt;</span>
                  </Link>
                );
              })}

              {sharedEntities.map((sharedEntity) => (
                <Link
                  className="branch-button finance-account-card secondary-card"
                  href={withViewMode(`/entities/${sharedEntity.id}`, viewMode)}
                  key={sharedEntity.id}
                >
                  <span>
                    <strong>{sharedEntity.name}</strong>
                    <small>Acceso compartido</small>
                  </span>
                  <span aria-hidden="true">&gt;</span>
                </Link>
              ))}
            </>
          )}
        </div>

        {canManageAccounts ? (
          <div className="branch-list admin-tools finance-admin-tools">
            <details className="management-details">
              <summary className="branch-button primary-branch finance-account-card">
                <span>Gestion</span>
                <span aria-hidden="true">&gt;</span>
              </summary>

              <div className="branch-list management-actions">
                {canUseFullManagement ? (
                  <Link className="branch-button" href={withViewMode(`/entities/${entity.id}/accounts/new`, viewMode)}>
                    Nueva cuenta
                  </Link>
                ) : null}

                {accounts.map((account) => (
                  <div className="account-management" key={account.id}>
                    <h3 className="management-account-title">{account.name}</h3>
                    <div className="branch-list">
                      <Link className="branch-button" href={withViewMode(`/entities/${entity.id}/accounts/${account.id}/import`, viewMode)}>
                        Subir Excel
                      </Link>
                      <Link className="branch-button" href={withViewMode(`/entities/${entity.id}/accounts/${account.id}/imports`, viewMode)}>
                        Historial de importaciones
                      </Link>
                      <Link className="branch-button" href={withViewMode(`/entities/${entity.id}/accounts/${account.id}/cash`, viewMode)} hidden={!canUseFullManagement}>
                        Añadir ingresos/gastos en efectivo
                      </Link>
                      <button className="branch-button disabled" type="button" disabled hidden={!canUseFullManagement}>
                        Exportar datos
                      </button>
                      <Link className="branch-button" href={withViewMode(`/entities/${entity.id}/accounts/${account.id}/edit`, viewMode)} hidden={!canUseFullManagement}>
                        Modificar cuenta
                      </Link>
                      {account.active ? (
                        <form action={deactivateBankAccount.bind(null, entity.id, account.id)} hidden={!canUseFullManagement}>
                          <button className="branch-button danger-branch" type="submit">
                            Desactivar cuenta
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        ) : isPersonalView ? (
          <div className="branch-list admin-tools finance-admin-tools">
            <button className="branch-button disabled" type="button" disabled>
              Gestion
            </button>
          </div>
        ) : null}

        {isPersonalView ? (
          <nav className="mobile-bottom-nav compact-personal-nav" aria-label="Navegacion personal">
            <Link className="mobile-bottom-nav-item active" href={withViewMode(`/entities/${entity.id}`, viewMode)}>
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

async function listSharedEntitiesForCris(currentEntityId: string) {
  const { entities } = await listEconomicEntities();

  return entities.filter(
    (entity) => entity.active && entity.id !== currentEntityId && normalizeName(entity.name) === "casa"
  );
}

function isCrisEntity(name: string) {
  const normalizedName = normalizeName(name);
  return normalizedName === "cris" || normalizedName === "cris bea" || normalizedName === "bea";
}

function normalizeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
