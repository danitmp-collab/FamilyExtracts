import Link from "next/link";
import { createEconomicEntity } from "@/app/entities/actions";
import { EntityForm } from "@/app/entities/entity-form";
import { getCurrentWorkspace } from "@/lib/workspace";

export default async function NewEntityPage() {
  const workspace = await getCurrentWorkspace();

  return (
    <main className="page">
      <section className="shell">
        <div>
          <p className="eyebrow">{workspace.name}</p>
          <h1>Nueva entidad</h1>
        </div>

        <div className="panel stack">
          <EntityForm action={createEconomicEntity} submitLabel="Crear entidad" />
          <Link className="text-link" href="/entities">
            Volver al listado
          </Link>
        </div>
      </section>
    </main>
  );
}
