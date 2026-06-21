import Link from "next/link";
import { notFound } from "next/navigation";
import { MobileBottomNav } from "@/app/mobile-bottom-nav";
import { createCashMovement } from "./actions";
import { getBankAccountForEntity } from "@/lib/bank-accounts";
import { getViewMode, withViewMode, type ViewModeSearchParams } from "@/lib/view-mode";

type CashMovementPageProps = {
  params: Promise<{
    id: string;
    accountId: string;
  }>;
  searchParams: Promise<ViewModeSearchParams & { error?: string }>;
};

const errorMessages: Record<string, string> = {
  invalid: "Completa fecha, concepto, tipo e importe con una cantidad mayor que cero.",
  save: "No se pudo guardar el movimiento en efectivo."
};

export default async function CashMovementPage({ params, searchParams }: CashMovementPageProps) {
  const { id, accountId } = await params;
  const rawSearchParams = await searchParams;
  const viewMode = getViewMode(rawSearchParams);
  const { workspace, entity, account } = await getBankAccountForEntity(id, accountId);
  const action = createCashMovement.bind(null, id, accountId, rawSearchParams);
  const today = new Date().toISOString().slice(0, 10);

  if (!entity || !account) {
    notFound();
  }

  return (
    <main className="page finance-page finance-detail-page">
      <section className="shell finance-shell">
        <div className="row finance-topbar">
          <div>
            <p className="eyebrow">{workspace.name} / {entity.name}</p>
            <h1>Añadir efectivo</h1>
          </div>
        </div>

        <div className="panel stack finance-account-panel">
          {rawSearchParams.error ? <p className="error">{errorMessages[rawSearchParams.error] ?? errorMessages.save}</p> : null}

          <form className="form" action={action}>
            <label className="field">
              <span>Fecha</span>
              <input className="input" type="date" name="date" defaultValue={today} required />
            </label>

            <label className="field">
              <span>Concepto</span>
              <input className="input" type="text" name="concept" placeholder="Ej. Comida, regalo, ingreso caja" required />
            </label>

            <label className="field">
              <span>Tipo</span>
              <select className="input" name="type" defaultValue="expense" required>
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
              </select>
            </label>

            <label className="field">
              <span>Cantidad en euros</span>
              <input className="input" type="number" name="amount" min="0.01" step="0.01" inputMode="decimal" required />
            </label>

            <button className="button" type="submit">
              Guardar movimiento
            </button>
            <Link className="button secondary finance-ghost-action" href={withViewMode(`/entities/${entity.id}/accounts/${account.id}`, viewMode)}>
              Cancelar
            </Link>
          </form>
        </div>
        <MobileBottomNav active="accounts" personalHomeHref={withViewMode(`/entities/${entity.id}`, viewMode)} viewMode={viewMode} />
      </section>
    </main>
  );
}
