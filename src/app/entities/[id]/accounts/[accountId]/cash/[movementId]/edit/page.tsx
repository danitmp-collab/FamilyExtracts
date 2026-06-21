import Link from "next/link";
import { notFound } from "next/navigation";
import { MobileBottomNav } from "@/app/mobile-bottom-nav";
import { updateCashMovement } from "../../actions";
import { getBankAccountForEntity } from "@/lib/bank-accounts";
import { createClient } from "@/lib/supabase/server";
import { getViewMode, withViewMode, type ViewModeSearchParams } from "@/lib/view-mode";

type EditCashMovementPageProps = {
  params: Promise<{
    id: string;
    accountId: string;
    movementId: string;
  }>;
  searchParams: Promise<ViewModeSearchParams & { error?: string }>;
};

type CashMovement = {
  id: string;
  fecha_operativa: string;
  concepto_normalizado: string;
  grupo_concepto: string;
  importe: number | string;
  referencia: string | null;
};

const errorMessages: Record<string, string> = {
  invalid: "Completa fecha, concepto, tipo e importe con una cantidad mayor que cero.",
  "not-found": "Este movimiento no existe o no es un movimiento manual en efectivo.",
  save: "No se pudo guardar el movimiento en efectivo."
};

export default async function EditCashMovementPage({ params, searchParams }: EditCashMovementPageProps) {
  const { id, accountId, movementId } = await params;
  const rawSearchParams = await searchParams;
  const viewMode = getViewMode(rawSearchParams);
  const { workspace, entity, account } = await getBankAccountForEntity(id, accountId);

  if (!entity || !account) {
    notFound();
  }

  const supabase = await createClient();
  const { data: movement, error } = await supabase
    .from("transactions")
    .select("id, fecha_operativa, concepto_normalizado, grupo_concepto, importe, referencia")
    .eq("workspace_id", workspace.id)
    .eq("economic_entity_id", entity.id)
    .eq("bank_account_id", account.id)
    .eq("id", movementId)
    .eq("referencia", "manual-efectivo")
    .maybeSingle<CashMovement>();

  if (error || !movement) {
    notFound();
  }

  const amount = Math.abs(Number(movement.importe));
  const type = Number(movement.importe) >= 0 ? "income" : "expense";
  const action = updateCashMovement.bind(null, entity.id, account.id, movement.id, rawSearchParams);

  return (
    <main className="page finance-page finance-detail-page">
      <section className="shell finance-shell">
        <div className="row finance-topbar">
          <div>
            <p className="eyebrow">{workspace.name} / {entity.name} / {account.name}</p>
            <h1>Editar efectivo</h1>
          </div>
        </div>

        <div className="panel stack finance-account-panel">
          {rawSearchParams.error ? <p className="error">{errorMessages[rawSearchParams.error] ?? errorMessages.save}</p> : null}

          <form className="form" action={action}>
            <label className="field">
              <span>Fecha</span>
              <input className="input" type="date" name="date" defaultValue={movement.fecha_operativa} required />
            </label>

            <label className="field">
              <span>Concepto</span>
              <input className="input" type="text" name="concept" defaultValue={movement.grupo_concepto} required />
            </label>

            <label className="field">
              <span>Tipo</span>
              <select className="input" name="type" defaultValue={type} required>
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
              </select>
            </label>

            <label className="field">
              <span>Cantidad en euros</span>
              <input className="input" type="number" name="amount" min="0.01" step="0.01" inputMode="decimal" defaultValue={amount.toFixed(2)} required />
            </label>

            <button className="button" type="submit">
              Guardar cambios
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
