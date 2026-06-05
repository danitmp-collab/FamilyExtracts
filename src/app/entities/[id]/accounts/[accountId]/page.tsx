import Link from "next/link";
import { notFound } from "next/navigation";
import { deactivateBankAccount } from "@/app/entities/[id]/accounts/actions";
import { getBankAccountForEntity } from "@/lib/bank-accounts";

type AccountPageProps = {
  params: Promise<{
    id: string;
    accountId: string;
  }>;
};

export default async function AccountPage({ params }: AccountPageProps) {
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
            <h1>{account.name}</h1>
            <p className="muted">{account.bank_name || "Banco no indicado"}</p>
          </div>

          <div className="actions">
            <Link className="button secondary" href={`/entities/${entity.id}`}>
              Entidad
            </Link>
            <Link className="button" href={`/entities/${entity.id}/accounts/${account.id}/edit`}>
              Editar
            </Link>
            <Link className="button secondary" href={`/entities/${entity.id}/accounts/${account.id}/imports`}>
              Historial
            </Link>
            <Link className="button secondary" href={`/entities/${entity.id}/accounts/${account.id}/movements`}>
              Movimientos
            </Link>
          </div>
        </div>

        <div className="panel stack">
          <div className="definition-grid">
            <span>Estado</span>
            <strong>{account.active ? "Activa" : "Inactiva"}</strong>
            <span>Banco</span>
            <strong>{account.bank_name || "-"}</strong>
            <span>IBAN</span>
            <strong>{account.iban_last4 ? `**** ${account.iban_last4}` : "-"}</strong>
            <span>Moneda</span>
            <strong>{account.currency}</strong>
          </div>

          <div className="actions">
            <Link className="button" href={`/entities/${entity.id}/accounts/${account.id}/import`}>
              Subir Excel
            </Link>
            <Link className="button secondary" href={`/entities/${entity.id}/accounts/${account.id}/imports`}>
              Ver importaciones
            </Link>
            <Link className="button secondary" href={`/entities/${entity.id}/accounts/${account.id}/movements`}>
              Ver movimientos
            </Link>
            {account.active ? (
              <form action={deactivateBankAccount.bind(null, entity.id, account.id)}>
                <button className="button secondary" type="submit">
                  Desactivar cuenta
                </button>
              </form>
            ) : null}
          </div>
          <p className="muted">La importacion definitiva se abordara en fases posteriores.</p>
        </div>
      </section>
    </main>
  );
}
