import Link from "next/link";
import { notFound } from "next/navigation";
import { updateEconomicEntity } from "@/app/entities/actions";
import { EntityForm } from "@/app/entities/entity-form";
import { getEconomicEntity } from "@/lib/economic-entities";

type EditEntityPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditEntityPage({ params }: EditEntityPageProps) {
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
          <h1>Editar entidad</h1>
        </div>

        <div className="panel stack">
          <EntityForm
            action={updateEconomicEntity.bind(null, entity.id)}
            entity={entity}
            submitLabel="Guardar cambios"
            showActive
          />
          <Link className="text-link" href={`/entities/${entity.id}`}>
            Volver a la entidad
          </Link>
        </div>
      </section>
    </main>
  );
}
