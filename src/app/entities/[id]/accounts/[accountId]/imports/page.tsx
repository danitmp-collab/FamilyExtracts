import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatImportDate,
  getImportStatusLabel,
  listImportsForAccount
} from "@/lib/import-history";

type ImportsPageProps = {
  params: Promise<{
    id: string;
    accountId: string;
  }>;
};

export default async function ImportsPage({ params }: ImportsPageProps) {
  const { id, accountId } = await params;
  const { workspace, entity, account, imports } = await listImportsForAccount(id, accountId);

  if (!entity || !account) {
    notFound();
  }

  return (
    <main className="page">
      <section className="shell">
        <div className="row">
          <div>
            <p className="eyebrow">{workspace.name} / {entity.name}</p>
            <h1>Historial de importaciones</h1>
            <p className="muted">Cuenta: {account.name}</p>
          </div>

          <div className="actions">
            <Link className="button secondary" href={`/entities/${entity.id}/accounts/${account.id}`}>
              Cuenta
            </Link>
            <Link className="button" href={`/entities/${entity.id}/accounts/${account.id}/import`}>
              Subir Excel
            </Link>
          </div>
        </div>

        <div className="panel stack">
          {imports.length === 0 ? (
            <p className="muted">Todavia no hay importaciones para esta cuenta.</p>
          ) : (
            <div className="table-wrap">
              <table className="table imports-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Archivo</th>
                    <th>Estado</th>
                    <th>Total</th>
                    <th>Insertadas</th>
                    <th>Duplicadas</th>
                    <th>Error</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.map((importRecord) => (
                    <tr key={importRecord.id}>
                      <td>{formatImportDate(importRecord.created_at)}</td>
                      <td>
                        <strong>{importRecord.file_name}</strong>
                      </td>
                      <td>
                        <span className={`status import-${importRecord.status}`}>
                          {getImportStatusLabel(importRecord.status)}
                        </span>
                      </td>
                      <td>{importRecord.rows_total}</td>
                      <td>{importRecord.rows_imported}</td>
                      <td>{importRecord.rows_duplicates}</td>
                      <td>{importRecord.rows_failed}</td>
                      <td>
                        <Link
                          className="text-link"
                          href={`/entities/${entity.id}/accounts/${account.id}/imports/${importRecord.id}`}
                        >
                          Ver detalle
                        </Link>
                      </td>
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
