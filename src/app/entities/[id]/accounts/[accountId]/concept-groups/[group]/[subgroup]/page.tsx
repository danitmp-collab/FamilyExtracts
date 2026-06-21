import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCashMovement } from "@/app/entities/[id]/accounts/[accountId]/cash/actions";
import { MobileBottomNav } from "@/app/mobile-bottom-nav";
import {
  buildConceptGroupFilterQuery,
  listConceptSubgroupMovementsForAccount,
  parseConceptGroupFilters
} from "@/lib/concept-groups";
import { formatMoney, formatTransactionDate } from "@/lib/import-history";
import { withViewMode, getViewMode, type ViewModeSearchParams } from "@/lib/view-mode";

type AccountConceptSubgroupMovementsPageProps = {
  params: Promise<{
    id: string;
    accountId: string;
    group: string;
    subgroup: string;
  }>;
  searchParams: Promise<ViewModeSearchParams>;
};

export default async function AccountConceptSubgroupMovementsPage({
  params,
  searchParams
}: AccountConceptSubgroupMovementsPageProps) {
  const { id, accountId, group, subgroup } = await params;
  const rawSearchParams = await searchParams;
  const viewMode = getViewMode(rawSearchParams);
  const filters = parseConceptGroupFilters(rawSearchParams);
  const filterQuery = buildConceptGroupFilterQuery(filters);
  const { workspace, entity, account, group: groupLabel, subgroup: subgroupLabel, movements } =
    await listConceptSubgroupMovementsForAccount(id, accountId, group, subgroup, filters);

  if (!entity || !account || !groupLabel) {
    notFound();
  }

  return (
    <main className="page finance-page finance-detail-page">
      <section className="shell finance-shell">
        <div className="row finance-topbar">
          <div>
            <p className="eyebrow">{workspace.name} / {entity.name} / {account.name} / {groupLabel}</p>
            <h1>{subgroupLabel ?? "Subgrupo"}</h1>
            <p className="muted">{movements.length} movimientos incluidos.</p>
          </div>
        </div>

        <div className="panel stack finance-account-panel">
          {movements.length === 0 ? (
            <p className="muted">No hay movimientos para este subgrupo.</p>
          ) : (
            <div className="table-wrap">
              <table className="table movements-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Concepto original</th>
                    <th>Importe</th>
                    <th>Saldo</th>
                    <th>Cuenta</th>
                    <th>Entidad</th>
                    <th>Nota</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => {
                    const amount = Number(movement.importe);
                    const balance = movement.saldo === null ? null : Number(movement.saldo);
                    const isManualCashMovement = movement.referencia === "manual-efectivo";
                    const deleteAction = deleteCashMovement.bind(null, entity.id, account.id, movement.id, rawSearchParams);
                    const returnTo = withViewMode(
                      `/entities/${entity.id}/accounts/${account.id}/concept-groups/${group}/${subgroup}${filterQuery}`,
                      viewMode
                    );
                    const noteHref = withViewMode(
                      `/entities/${entity.id}/accounts/${account.id}/movements/${movement.id}/note?returnTo=${encodeURIComponent(returnTo)}`,
                      viewMode
                    );

                    return (
                      <tr key={movement.id}>
                        <td data-label="Fecha">{formatTransactionDate(movement.fecha_operativa)}</td>
                        <td data-label="Concepto">
                          <strong className="table-card-title">{movement.concepto_original || "-"}</strong>
                        </td>
                        <td className={amount >= 0 ? "amount-income" : "amount-expense"} data-label="Importe">
                          {formatMoney(movement.importe)}
                        </td>
                        <td className={balance !== null && balance < 0 ? "money-negative" : undefined} data-label="Saldo">
                          {formatMoney(movement.saldo)}
                        </td>
                        <td data-label="Cuenta">{movement.bank_accounts?.name ?? "-"}</td>
                        <td data-label="Entidad">{movement.economic_entities?.name ?? "-"}</td>
                        <td data-label="Nota">{movement.note ?? "-"}</td>
                        <td className="actions-cell" data-label="Acciones">
                          <div className="cash-movement-actions">
                            <Link
                              className="button secondary compact-action-button note-action-button"
                              href={noteHref}
                              aria-label="Editar nota"
                            >
                              {movement.note ? "Editar nota" : "Añadir nota"}
                            </Link>
                            {isManualCashMovement ? (
                              <>
                              <Link
                                className="button secondary compact-action-button icon-action-button"
                                href={withViewMode(
                                  `/entities/${entity.id}/accounts/${account.id}/cash/${movement.id}/edit`,
                                  viewMode
                                )}
                                aria-label="Editar movimiento"
                              >
                                <svg aria-hidden="true" viewBox="0 0 24 24">
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                </svg>
                              </Link>
                              <form action={deleteAction}>
                                <button className="button danger compact-action-button icon-action-button" type="submit" aria-label="Borrar movimiento">
                                  <svg aria-hidden="true" viewBox="0 0 24 24">
                                    <path d="M3 6h18" />
                                    <path d="M8 6V4h8v2" />
                                    <path d="M19 6l-1 14H6L5 6" />
                                    <path d="M10 11v5" />
                                    <path d="M14 11v5" />
                                  </svg>
                                </button>
                              </form>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <MobileBottomNav active="accounts" personalHomeHref={withViewMode(`/entities/${entity.id}`, viewMode)} viewMode={viewMode} />
      </section>
    </main>
  );
}
