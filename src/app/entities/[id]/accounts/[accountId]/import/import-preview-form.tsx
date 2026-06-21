"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  completeExcelImport,
  previewExcelImport,
  type CompleteImportState,
  type ImportPreviewState
} from "./actions";

type ImportPreviewFormProps = {
  entityId: string;
  accountId: string;
};

export function ImportPreviewForm({ entityId, accountId }: ImportPreviewFormProps) {
  const previewAction = previewExcelImport.bind(null, entityId, accountId);
  const completeAction = completeExcelImport.bind(null, entityId, accountId);
  const [state, formAction, isPending] = useActionState<ImportPreviewState, FormData>(
    previewAction,
    {
      preview: null,
      error: null
    }
  );
  const [completeState, completeFormAction, isCompleting] = useActionState<
    CompleteImportState,
    FormData
  >(completeAction, {
    importId: null,
    rowsTotal: 0,
    rowsImported: 0,
    rowsDuplicates: 0,
    rowsFailed: 0,
    error: null
  });
  const isCompleted = Boolean(completeState.importId);

  return (
    <div className="stack">
      {!isCompleted ? (
        <form className="form finance-form" action={formAction}>
          <label className="field">
            <span>Archivo Excel</span>
            <input className="input" type="file" name="file" accept=".xlsx" required />
          </label>

          <button className="button" type="submit" disabled={isPending}>
            {isPending ? "Leyendo archivo" : "Ver vista previa"}
          </button>
        </form>
      ) : null}

      {state.error ? <p className="error">{state.error}</p> : null}
      {completeState.error ? <p className="error">{completeState.error}</p> : null}
      {isCompleted ? (
        <section className="success-panel stack finance-success-panel" aria-live="polite">
          <div>
            <h2>Importacion completada</h2>
            <p className="muted">La vista previa se ha cerrado para evitar dobles confirmaciones.</p>
          </div>

          <div className="summary-grid compact-summary finance-summary-grid">
            <div>
              <span>Importados</span>
              <strong>{completeState.rowsImported}</strong>
            </div>
            <div>
              <span>Duplicados</span>
              <strong>{completeState.rowsDuplicates}</strong>
            </div>
            <div>
              <span>Errores</span>
              <strong>{completeState.rowsFailed}</strong>
            </div>
          </div>

          <div className="actions">
            <Link className="button" href={`/entities/${entityId}/accounts/${accountId}/movements`}>
              Ver movimientos
            </Link>
            <Link className="button secondary finance-ghost-action" href={`/entities/${entityId}/accounts/${accountId}/imports`}>
              Ver historial de importaciones
            </Link>
            <Link className="button secondary finance-ghost-action" href={`/entities/${entityId}/accounts/${accountId}/import`}>
              Subir otro Excel
            </Link>
          </div>
        </section>
      ) : null}

      {state.preview && !isCompleted ? (
        <section className="stack">
          <div className="summary-grid finance-summary-grid">
            <div>
              <span>Filas totales</span>
              <strong>{state.preview.summary.rows_total}</strong>
            </div>
            <div>
              <span>Filas validas</span>
              <strong>{state.preview.summary.rows_valid}</strong>
            </div>
            <div>
              <span>Filas nuevas</span>
              <strong>{state.preview.summary.rows_new}</strong>
            </div>
            <div>
              <span>Duplicadas</span>
              <strong>{state.preview.summary.rows_duplicates}</strong>
            </div>
            <div>
              <span>Filas con error</span>
              <strong>{state.preview.summary.rows_error}</strong>
            </div>
          </div>

          <div className="panel stack finance-account-panel">
            <h2>Columnas detectadas</h2>
            <div className="definition-grid">
              {Object.entries(state.preview.detectedColumns).map(([key, value]) => (
                <div className="definition-row" key={key}>
                  <span>{key}</span>
                  <strong>{value ?? "-"}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="panel stack finance-account-panel">
            <h2>Vista previa</h2>
            <form className="actions" action={completeFormAction}>
              <input type="hidden" name="preview" value={JSON.stringify(state.preview)} />
              <button className="button" type="submit" disabled={isCompleting || state.preview.summary.rows_new === 0}>
                {isCompleting ? "Guardando importacion" : "Confirmar importacion"}
              </button>
            </form>
            <div className="table-wrap">
              <table className="table preview-table">
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Estado</th>
                    <th>F. operativa</th>
                    <th>F. valor</th>
                    <th>Concepto</th>
                    <th>Normalizado</th>
                    <th>Grupo</th>
                    <th>Importe</th>
                    <th>Saldo</th>
                    <th>Referencia</th>
                    <th>Errores</th>
                  </tr>
                </thead>
                <tbody>
                  {state.preview.rows.map((row) => (
                    <tr key={row.rowNumber} className={getRowClassName(row.status)}>
                      <td data-label="Fila">{row.rowNumber}</td>
                      <td data-label="Estado">
                        <span className={`status ${row.status}`}>{getStatusLabel(row.status)}</span>
                      </td>
                      <td data-label="F. operativa">{row.fecha_operativa ?? "-"}</td>
                      <td data-label="F. valor">{row.fecha_valor ?? "-"}</td>
                      <td data-label="Concepto">
                        <strong className="table-card-title">{row.concepto_original || "-"}</strong>
                      </td>
                      <td data-label="Normalizado">{row.concepto_normalizado}</td>
                      <td data-label="Grupo">{row.grupo_concepto}</td>
                      <td className={row.importe !== null && row.importe < 0 ? "money-negative" : undefined} data-label="Importe">
                        {formatAmount(row.importe)}
                      </td>
                      <td className={row.saldo !== null && row.saldo < 0 ? "money-negative" : undefined} data-label="Saldo">
                        {formatAmount(row.saldo)}
                      </td>
                      <td data-label="Referencia">{row.referencia ?? "-"}</td>
                      <td data-label="Errores">{row.errors.length > 0 ? row.errors.join(" ") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function formatAmount(value: number | null) {
  if (value === null) {
    return "-";
  }

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    currencyDisplay: "symbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function getRowClassName(status: "new" | "duplicate" | "error") {
  if (status === "duplicate") {
    return "row-duplicate";
  }

  if (status === "error") {
    return "row-error";
  }

  return undefined;
}

function getStatusLabel(status: "new" | "duplicate" | "error") {
  if (status === "duplicate") {
    return "Duplicada";
  }

  if (status === "error") {
    return "Error";
  }

  return "Nueva";
}
