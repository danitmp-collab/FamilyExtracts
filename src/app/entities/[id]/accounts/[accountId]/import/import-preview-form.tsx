"use client";

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
    rowsImported: 0,
    error: null
  });

  return (
    <div className="stack">
      <form className="form" action={formAction}>
        <label className="field">
          <span>Archivo Excel</span>
          <input className="input" type="file" name="file" accept=".xlsx" required />
        </label>

        <button className="button" type="submit" disabled={isPending}>
          {isPending ? "Leyendo archivo" : "Ver vista previa"}
        </button>
      </form>

      {state.error ? <p className="error">{state.error}</p> : null}
      {completeState.error ? <p className="error">{completeState.error}</p> : null}
      {completeState.importId ? (
        <p className="success">
          Importacion completada. Movimientos importados: {completeState.rowsImported}.
        </p>
      ) : null}

      {state.preview ? (
        <section className="stack">
          <div className="summary-grid">
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

          <div className="panel stack">
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

          <div className="panel stack">
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
                      <td>{row.rowNumber}</td>
                      <td>
                        <span className={`status ${row.status}`}>{getStatusLabel(row.status)}</span>
                      </td>
                      <td>{row.fecha_operativa ?? "-"}</td>
                      <td>{row.fecha_valor ?? "-"}</td>
                      <td>{row.concepto_original || "-"}</td>
                      <td>{row.concepto_normalizado}</td>
                      <td>{row.grupo_concepto}</td>
                      <td>{formatAmount(row.importe)}</td>
                      <td>{formatAmount(row.saldo)}</td>
                      <td>{row.referencia ?? "-"}</td>
                      <td>{row.errors.length > 0 ? row.errors.join(" ") : "-"}</td>
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
