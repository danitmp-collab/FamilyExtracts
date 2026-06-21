import Link from "next/link";
import { notFound } from "next/navigation";
import { MobileBottomNav } from "@/app/mobile-bottom-nav";
import { DeleteImportForm } from "./delete-import-form";
import { canManageEconomicEntity } from "@/lib/economic-entities";
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
  searchParams: Promise<{
    delete?: string;
    rows?: string;
  }>;
};

export default async function ImportsPage({ params, searchParams }: ImportsPageProps) {
  const { id, accountId } = await params;
  const deleteStatus = await searchParams;
  const { workspace, entity, account, imports } = await listImportsForAccount(id, accountId);

  if (!entity || !account) {
    notFound();
  }

  const canDeleteImports = await canManageEconomicEntity(entity.id);

  return (
    <main className="page finance-page finance-detail-page">
      <section className="shell finance-shell">
        <div className="row finance-topbar">
          <div>
            <p className="eyebrow">{workspace.name} / {entity.name}</p>
            <h1>Historial de importaciones</h1>
            <p className="muted">Cuenta: {account.name}</p>
          </div>

          <div className="actions">
            <Link className="button secondary finance-ghost-action" href={`/entities/${entity.id}/accounts/${account.id}`}>
              Cuenta
            </Link>
            <Link className="button" href={`/entities/${entity.id}/accounts/${account.id}/import`}>
              Subir Excel
            </Link>
          </div>
        </div>

        <div className="panel stack finance-account-panel">
          {deleteStatus.delete === "success" ? (
            <p className="success">
              Importacion borrada. Movimientos eliminados: {Number(deleteStatus.rows ?? 0)}.
            </p>
          ) : null}
          {deleteStatus.delete === "error" ? (
            <p className="error">No se pudo borrar la importacion.</p>
          ) : null}
          {deleteStatus.delete === "forbidden" ? (
            <p className="error">No tienes permiso para borrar importaciones de esta entidad.</p>
          ) : null}
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
                      <td data-label="Fecha">{formatImportDate(importRecord.created_at)}</td>
                      <td data-label="Archivo">
                        <strong className="table-card-title">{importRecord.file_name}</strong>
                      </td>
                      <td data-label="Estado">
                        <span className={`status import-${importRecord.status}`}>
                          {getImportStatusLabel(importRecord.status)}
                        </span>
                      </td>
                      <td data-label="Total">{importRecord.rows_total}</td>
                      <td data-label="Insertadas">{importRecord.rows_imported}</td>
                      <td data-label="Duplicadas">{importRecord.rows_duplicates}</td>
                      <td data-label="Error">{importRecord.rows_failed}</td>
                      <td data-label="Acciones">
                        <div className="actions">
                          <Link
                            className="button secondary finance-ghost-action"
                            href={`/entities/${entity.id}/accounts/${account.id}/imports/${importRecord.id}`}
                          >
                            Ver detalle
                          </Link>
                          {canDeleteImports && importRecord.file_name !== "Movimiento manual en efectivo" ? (
                            <DeleteImportForm
                              entityId={entity.id}
                              accountId={account.id}
                              importId={importRecord.id}
                              fileName={importRecord.file_name}
                            />
                          ) : null}
                        </div>
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
