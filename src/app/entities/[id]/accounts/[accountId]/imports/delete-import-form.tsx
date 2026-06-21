"use client";

import { deleteImport } from "./actions";

type DeleteImportFormProps = {
  entityId: string;
  accountId: string;
  importId: string;
  fileName: string;
};

export function DeleteImportForm({ entityId, accountId, importId, fileName }: DeleteImportFormProps) {
  const deleteAction = deleteImport.bind(null, entityId, accountId, importId);

  return (
    <form
      action={deleteAction}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Se borraran la importacion "${fileName}" y todos sus movimientos. Esta accion no se puede deshacer. ¿Continuar?`
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <button className="button danger" type="submit">
        Borrar importacion
      </button>
    </form>
  );
}
