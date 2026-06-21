import Link from "next/link";
import { MobileBottomNav } from "@/app/mobile-bottom-nav";
import { formatMoney } from "@/lib/import-history";
import { listConceptGroups } from "@/lib/concept-groups";

export default async function ConceptGroupsPage() {
  const { workspace, groups } = await listConceptGroups();

  return (
    <main className="page finance-page finance-detail-page">
      <section className="shell finance-shell">
        <div className="row finance-topbar">
          <div>
            <p className="eyebrow">{workspace.name}</p>
            <h1>Grupos de concepto</h1>
            <p className="muted">Navegacion calculada desde los conceptos importados.</p>
          </div>

          <Link className="button secondary finance-ghost-action" href="/dashboard">
            Dashboard
          </Link>
        </div>

        <div className="panel stack finance-account-panel">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Grupo</th>
                  <th>Movimientos</th>
                  <th>Ingresos</th>
                  <th>Gastos</th>
                  <th>Balance</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.slug}>
                    <td data-label="Grupo">
                      <strong className="table-card-title">{group.label}</strong>
                    </td>
                    <td data-label="Movimientos">{group.movements}</td>
                    <td className="amount-income" data-label="Ingresos">{formatMoney(group.income)}</td>
                    <td className="amount-expense" data-label="Gastos">{formatMoney(group.expenses)}</td>
                    <td className={group.balance >= 0 ? "amount-income" : "amount-expense"} data-label="Balance">
                      {formatMoney(group.balance)}
                    </td>
                    <td data-label="Accion">
                      {group.movements > 0 ? (
                        <Link className="text-link" href={`/concept-groups/${group.slug}`}>
                          Ver subgrupos
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <MobileBottomNav active="accounts" />
      </section>
    </main>
  );
}
