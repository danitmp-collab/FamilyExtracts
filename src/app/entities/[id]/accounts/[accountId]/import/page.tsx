import Link from "next/link";
import { notFound } from "next/navigation";
import { MobileBottomNav } from "@/app/mobile-bottom-nav";
import { ImportPreviewForm } from "./import-preview-form";
import { getBankAccountForEntity } from "@/lib/bank-accounts";
import { canManageEconomicEntity } from "@/lib/economic-entities";

type ImportPageProps = {
  params: Promise<{
    id: string;
    accountId: string;
  }>;
};

export default async function ImportPage({ params }: ImportPageProps) {
  const { id, accountId } = await params;
  const { workspace, entity, account } = await getBankAccountForEntity(id, accountId);

  if (!entity || !account) {
    notFound();
  }

  if (!(await canManageEconomicEntity(entity.id))) {
    notFound();
  }

  return (
    <main className="page finance-page finance-detail-page">
      <section className="shell finance-shell">
        <div className="row finance-topbar">
          <div>
            <p className="eyebrow">{workspace.name} / {entity.name}</p>
            <h1>Subir Excel</h1>
            <p className="muted">Cuenta: {account.name}</p>
          </div>

          <Link className="button secondary finance-ghost-action" href={`/entities/${entity.id}/accounts/${account.id}`}>
            Volver a la cuenta
          </Link>
        </div>

        <div className="panel stack finance-account-panel">
          <p className="muted">
            La entidad y la cuenta se toman de esta pantalla. El nombre del archivo no se usa
            para deducirlas.
          </p>
          <ImportPreviewForm entityId={entity.id} accountId={account.id} />
        </div>
        <MobileBottomNav active="accounts" />
      </section>
    </main>
  );
}
