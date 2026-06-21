import Link from "next/link";
import { notFound } from "next/navigation";
import { MobileBottomNav } from "@/app/mobile-bottom-nav";
import { getMovementForAccount } from "@/lib/movements";
import { getViewMode, withViewMode, type ViewModeSearchParams } from "@/lib/view-mode";
import { updateMovementNote } from "../../actions";

type MovementNotePageProps = {
  params: Promise<{
    id: string;
    accountId: string;
    movementId: string;
  }>;
  searchParams: Promise<ViewModeSearchParams & { returnTo?: string }>;
};

export default async function MovementNotePage({ params, searchParams }: MovementNotePageProps) {
  const { id, accountId, movementId } = await params;
  const rawSearchParams = await searchParams;
  const viewMode = getViewMode(rawSearchParams);
  const { workspace, entity, account, movement } = await getMovementForAccount(id, accountId, movementId);
  const returnTo = getReturnTo(rawSearchParams.returnTo) ?? withViewMode(`/entities/${id}/accounts/${accountId}/movements/${movementId}`, viewMode);
  const action = updateMovementNote.bind(null, id, accountId, movementId);

  if (!entity || !account || !movement) {
    notFound();
  }

  return (
    <main className="page finance-page finance-detail-page">
      <section className="shell finance-shell">
        <div className="row finance-topbar">
          <div>
            <p className="eyebrow">{workspace.name} / {entity.name} / {account.name}</p>
            <h1>Editar nota</h1>
          </div>
        </div>

        <div className="panel stack finance-account-panel">
          <p className="muted">{movement.concepto_original || movement.concepto_normalizado}</p>
          <form className="form" action={action}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <label className="field">
              <span>Nota</span>
              <input className="input" type="text" name="note" defaultValue={movement.note ?? ""} maxLength={140} placeholder="Ej. seguro coche, seguro casa..." />
            </label>
            <button className="button" type="submit">
              Guardar nota
            </button>
            <Link className="button secondary finance-ghost-action" href={returnTo}>
              Cancelar
            </Link>
          </form>
        </div>
        <MobileBottomNav active="accounts" personalHomeHref={withViewMode(`/entities/${entity.id}`, viewMode)} viewMode={viewMode} />
      </section>
    </main>
  );
}

function getReturnTo(value: string | string[] | undefined) {
  const returnTo = Array.isArray(value) ? value[0] : value;
  return returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : null;
}
