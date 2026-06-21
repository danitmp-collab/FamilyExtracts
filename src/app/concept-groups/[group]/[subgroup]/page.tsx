import Link from "next/link";
import { notFound } from "next/navigation";
import { MobileBottomNav } from "@/app/mobile-bottom-nav";
import { getGroupLabel, listConceptSubgroupMovements } from "@/lib/concept-groups";
import { formatMoney, formatTransactionDate } from "@/lib/import-history";

type ConceptSubgroupMovementsPageProps = {
  params: Promise<{
    group: string;
    subgroup: string;
  }>;
};

export default async function ConceptSubgroupMovementsPage({ params }: ConceptSubgroupMovementsPageProps) {
  const { group, subgroup } = await params;
  const { workspace, group: groupLabel, subgroup: subgroupLabel, movements } =
    await listConceptSubgroupMovements(group, subgroup);

  if (!getGroupLabel(group)) {
    notFound();
  }

  return (
    <main className="page finance-page finance-detail-page">
      <section className="shell finance-shell">
        <div className="row finance-topbar">
          <div>
            <p className="eyebrow">{workspace.name} / {groupLabel}</p>
            <h1>{subgroupLabel ?? "Subgrupo"}</h1>
            <p className="muted">{movements.length} movimientos incluidos.</p>
          </div>

          <Link className="button secondary finance-ghost-action" href={`/concept-groups/${group}`}>
            Volver a subgrupos
          </Link>
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
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => {
                    const amount = Number(movement.importe);
                    const balance = movement.saldo === null ? null : Number(movement.saldo);

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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <MobileBottomNav active="accounts" />
      </section>
    </main>
  );
}
