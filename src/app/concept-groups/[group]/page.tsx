import Link from "next/link";
import { notFound } from "next/navigation";
import { MobileBottomNav } from "@/app/mobile-bottom-nav";
import { listConceptSubgroups } from "@/lib/concept-groups";
import { formatMoney } from "@/lib/import-history";

type ConceptSubgroupsPageProps = {
  params: Promise<{
    group: string;
  }>;
};

export default async function ConceptSubgroupsPage({ params }: ConceptSubgroupsPageProps) {
  const { group } = await params;
  const { workspace, group: groupLabel, subgroups } = await listConceptSubgroups(group);

  if (!groupLabel) {
    notFound();
  }

  return (
    <main className="page finance-page finance-detail-page">
      <section className="shell finance-shell">
        <div className="row finance-topbar">
          <div>
            <p className="eyebrow">{workspace.name}</p>
            <h1>{groupLabel}</h1>
            <p className="muted">Subgrupos calculados desde concepto normalizado.</p>
          </div>

          <Link className="button secondary finance-ghost-action" href="/concept-groups">
            Volver a grupos
          </Link>
        </div>

        <div className="panel stack finance-account-panel">
          {subgroups.length === 0 ? (
            <p className="muted">No hay movimientos en este grupo.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Subgrupo</th>
                    <th>Movimientos</th>
                    <th>Ingresos</th>
                    <th>Gastos</th>
                    <th>Balance</th>
                    <th>Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {subgroups.map((subgroup) => (
                    <tr key={subgroup.slug}>
                      <td data-label="Subgrupo">
                        <strong className="table-card-title">{subgroup.label}</strong>
                      </td>
                      <td data-label="Movimientos">{subgroup.movements}</td>
                      <td className="amount-income" data-label="Ingresos">{formatMoney(subgroup.income)}</td>
                      <td className="amount-expense" data-label="Gastos">{formatMoney(subgroup.expenses)}</td>
                      <td className={subgroup.balance >= 0 ? "amount-income" : "amount-expense"} data-label="Balance">
                        {formatMoney(subgroup.balance)}
                      </td>
                      <td data-label="Accion">
                        <Link className="text-link" href={`/concept-groups/${group}/${subgroup.slug}`}>
                          Ver movimientos
                        </Link>
                      </td>
                    </tr>
                  ))}
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
