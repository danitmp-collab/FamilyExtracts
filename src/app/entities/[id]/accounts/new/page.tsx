import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountForm } from "@/app/entities/[id]/accounts/account-form";
import { createBankAccount } from "@/app/entities/[id]/accounts/actions";
import { getEconomicEntity } from "@/lib/economic-entities";

type NewAccountPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewAccountPage({ params }: NewAccountPageProps) {
  const { id } = await params;
  const { workspace, entity } = await getEconomicEntity(id);

  if (!entity) {
    notFound();
  }

  return (
    <main className="page">
      <section className="shell">
        <div>
          <p className="eyebrow">{workspace.name}</p>
          <h1>Nueva cuenta bancaria</h1>
          <p className="muted">Entidad: {entity.name}</p>
        </div>

        <div className="panel stack">
          <AccountForm action={createBankAccount.bind(null, entity.id)} submitLabel="Crear cuenta" />
          <Link className="text-link" href={`/entities/${entity.id}`}>
            Volver a la entidad
          </Link>
        </div>
      </section>
    </main>
  );
}
