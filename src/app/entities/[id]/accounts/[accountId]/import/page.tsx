import Link from "next/link";
import { notFound } from "next/navigation";
import { ImportPreviewForm } from "./import-preview-form";
import { getBankAccountForEntity } from "@/lib/bank-accounts";

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

  return (
    <main className="page">
      <section className="shell">
        <div className="row">
          <div>
            <p className="eyebrow">{workspace.name} / {entity.name}</p>
            <h1>Subir Excel</h1>
            <p className="muted">Cuenta: {account.name}</p>
          </div>

          <Link className="button secondary" href={`/entities/${entity.id}/accounts/${account.id}`}>
            Volver a la cuenta
          </Link>
        </div>

        <div className="panel stack">
          <p className="muted">
            La entidad y la cuenta se toman de esta pantalla. El nombre del archivo no se usa
            para deducirlas.
          </p>
          <ImportPreviewForm entityId={entity.id} accountId={account.id} />
        </div>
      </section>
    </main>
  );
}
