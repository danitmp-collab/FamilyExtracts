import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatImportDate,
  formatMoney,
  formatTransactionDate,
  getImportDetailForAccount,
  getImportStatusLabel
} from "@/lib/import-history";

type ImportDetailPageProps = {
  params: Promise<{
    id: string;
    accountId: string;
    importId: string;
  }>;
};

export default async function ImportDetailPage({ params }: ImportDetailPageProps) {
  const { id, accountId, importId } = await params;
  const { workspace, entity, account, importRecord, transactions } = await getImportDetailForAccount(
    id,
    accountId,
    importId
  );

  if (!entity || !account || !importRecord) {
    notFound();
  }

  return (
    <main className="page">
      <section className="shell">
        <div className="row">
          <div>
            <p className="eyebrow">{workspace.name} / {entity.name} / {account.name}</p>
            <h1>{importRecord.file_name}</h1>
            <p className="muted">{formatImportDate(importRecord.created_at)}</p>
          </div>

          <div className="actions">
            <Link className="button secondary" href={`/entities/${entity.id}/accounts/${account.id}/imports`}>
              Historial
            </Link>
            <Link className="button secondary" href={`/entities/${entity.id}/accounts/${account.id}/movements`}>
              Movimientos
            </Link>
          </div>
        </div>

        <div className="panel stack">
          <h2>Informacion general</h2>
          <div className="definition-grid">
            <div className="definition-row">
              <span>Archivo</span>
              <strong>{importRecord.file_name}</strong>
            </div>
            <div className="definition-row">
              <span>Estado</span>
              <strong>{getImportStatusLabel(importRecord.status)}</strong>
            </div>
            <div className="definition-row">
              <span>Cuenta</span>
              <strong>{account.name}</strong>
            </div>
            <div className="definition-row">
              <span>Entidad</span>
              <strong>{entity.name}</strong>
            </div>
          </div>
        </div>

        <div className="summary-grid">
          <div>
            <span>Filas totales</span>
            <strong>{importRecord.rows_total}</strong>
          </div>
          <div>
            <span>Insertadas</span>
            <strong>{importRecord.rows_imported}</strong>
          </div>
          <div>
            <span>Duplicadas</span>
            <strong>{importRecord.rows_duplicates}</strong>
          </div>
          <div>
            <span>Con error</span>
            <strong>{importRecord.rows_failed}</strong>
          </div>
        </div>

        <div className="panel stack">
          <h2>Movimientos asociados</h2>
          {transactions.length === 0 ? (
            <p className="muted">Esta importacion no tiene movimientos insertados.</p>
          ) : (
            <div className="table-wrap">
              <table className="table movements-table">
                <thead>
                  <tr>
                    <th>F. operativa</th>
                    <th>F. valor</th>
                    <th>Concepto</th>
                    <th>Grupo</th>
                    <th>Importe</th>
                    <th>Saldo</th>
                    <th>Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{formatTransactionDate(transaction.fecha_operativa)}</td>
                      <td>{formatTransactionDate(transaction.fecha_valor)}</td>
                      <td>{transaction.concepto_original}</td>
                      <td>{transaction.grupo_concepto}</td>
                      <td>{formatMoney(transaction.importe)}</td>
                      <td>{formatMoney(transaction.saldo)}</td>
                      <td>{transaction.referencia ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
