import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountForm } from "@/app/entities/[id]/accounts/account-form";
import { updateBankAccount } from "@/app/entities/[id]/accounts/actions";
import { getBankAccountForEntity } from "@/lib/bank-accounts";

type EditAccountPageProps = {
  params: Promise<{
    id: string;
    accountId: string;
  }>;
};

export default async function EditAccountPage({ params }: EditAccountPageProps) {
  const { id, accountId } = await params;
  const { workspace, entity, account } = await getBankAccountForEntity(id, accountId);

  if (!entity || !account) {
    notFound();
  }

  return (
    <main className="page">
      <section className="shell">
        <div>
          <p className="eyebrow">{workspace.name} / {entity.name}</p>
          <h1>Editar cuenta bancaria</h1>
        </div>

        <div className="panel stack">
          <AccountForm
            account={account}
            action={updateBankAccount.bind(null, entity.id, account.id)}
            submitLabel="Guardar cambios"
            showActive
          />
          <Link className="text-link" href={`/entities/${entity.id}/accounts/${account.id}`}>
            Volver a la cuenta
          </Link>
        </div>
      </section>
    </main>
  );
}
