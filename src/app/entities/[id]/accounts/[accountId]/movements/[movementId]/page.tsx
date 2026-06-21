import Link from "next/link";
import { notFound } from "next/navigation";
import { MobileBottomNav } from "@/app/mobile-bottom-nav";
import { getCategoryTypeLabel, listCategories, type CategoryType } from "@/lib/categories";
import { formatImportDate, formatMoney, formatTransactionDate } from "@/lib/import-history";
import { getMovementType, getMovementTypeLabel, getMovementForAccount } from "@/lib/movements";
import { getViewMode, withViewMode, type ViewModeSearchParams } from "@/lib/view-mode";
import { updateMovementCategory } from "../actions";

type MovementDetailPageProps = {
  params: Promise<{
    id: string;
    accountId: string;
    movementId: string;
  }>;
  searchParams: Promise<ViewModeSearchParams>;
};

export default async function MovementDetailPage({ params, searchParams }: MovementDetailPageProps) {
  const { id, accountId, movementId } = await params;
  const viewMode = getViewMode(await searchParams);
  const isPersonalView = viewMode === "personal";
  const { workspace, entity, account, movement } = await getMovementForAccount(id, accountId, movementId);
  const { categories } = await listCategories(false);

  if (!entity || !account || !movement) {
    notFound();
  }

  const movementType = getMovementType(movement.importe);
  const movementAmount = Number(movement.importe);
  const movementBalance = movement.saldo === null ? null : Number(movement.saldo);

  return (
    <main className="page finance-page finance-detail-page">
      <section className="shell finance-shell">
        <div className="row finance-topbar">
          <div>
            <p className="eyebrow">{workspace.name} / {entity.name} / {account.name}</p>
            <h1>Detalle de movimiento</h1>
            <p className="muted">{formatTransactionDate(movement.fecha_operativa)}</p>
          </div>

          <Link
            className="button secondary finance-ghost-action"
            href={withViewMode(`/entities/${entity.id}/accounts/${account.id}/movements`, viewMode)}
          >
            Volver a movimientos
          </Link>
        </div>

        <div className="panel stack finance-account-panel">
          <div className="summary-grid compact-summary finance-summary-grid">
            <div>
              <span>Importe</span>
              <strong className={movementAmount < 0 ? "money-negative" : undefined}>{formatMoney(movement.importe)}</strong>
            </div>
            <div>
              <span>Tipo</span>
              <strong>{getMovementTypeLabel(movementType)}</strong>
            </div>
            <div>
              <span>Categoria</span>
              <strong>{movement.categories?.name ?? "Sin categoria"}</strong>
            </div>
          </div>

          <div className="definition-grid">
            <div className="definition-row">
              <span>Fecha operativa</span>
              <strong>{formatTransactionDate(movement.fecha_operativa)}</strong>
            </div>
            <div className="definition-row">
              <span>Fecha valor</span>
              <strong>{formatTransactionDate(movement.fecha_valor)}</strong>
            </div>
            <div className="definition-row">
              <span>Concepto original</span>
              <strong>{movement.concepto_original || "-"}</strong>
            </div>
            <div className="definition-row">
              <span>Concepto normalizado</span>
              <strong>{movement.concepto_normalizado}</strong>
            </div>
            <div className="definition-row">
              <span>Grupo concepto</span>
              <strong>{movement.grupo_concepto}</strong>
            </div>
            <div className="definition-row">
              <span>Saldo</span>
              <strong className={movementBalance !== null && movementBalance < 0 ? "money-negative" : undefined}>
                {formatMoney(movement.saldo)}
              </strong>
            </div>
            <div className="definition-row">
              <span>Referencia</span>
              <strong>{movement.referencia ?? "-"}</strong>
            </div>
            <div className="definition-row">
              <span>Nota</span>
              <strong>{movement.note ?? "-"}</strong>
            </div>
            {!isPersonalView ? (
              <div className="definition-row">
                <span>Importacion</span>
                <strong>
                  {movement.imports ? (
                    <Link
                      className="text-link"
                      href={`/entities/${entity.id}/accounts/${account.id}/imports/${movement.import_id}`}
                    >
                      {movement.imports.file_name} - {formatImportDate(movement.imports.created_at)}
                    </Link>
                  ) : (
                    "-"
                  )}
                </strong>
              </div>
            ) : null}
          </div>

          <Link
            className="button secondary finance-ghost-action"
            href={withViewMode(`/entities/${entity.id}/accounts/${account.id}/movements/${movement.id}/note`, viewMode)}
          >
            Editar nota
          </Link>
        </div>

        {!isPersonalView ? (
          <div className="panel stack finance-account-panel">
            <h2>Categoria manual</h2>
            <form className="form" action={updateMovementCategory.bind(null, entity.id, account.id, movement.id)}>
              <label className="field">
                <span>Categoria</span>
                <select className="input" name="categoryId" defaultValue={movement.category_id ?? ""}>
                  <option value="">Sin categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({getCategoryTypeLabel(category.type as CategoryType)})
                    </option>
                  ))}
                </select>
              </label>

              <button className="button" type="submit">
                Guardar categoria
              </button>
            </form>
          </div>
        ) : null}
        <MobileBottomNav active="accounts" personalHomeHref={withViewMode(`/entities/${entity.id}`, viewMode)} viewMode={viewMode} />
      </section>
    </main>
  );
}
