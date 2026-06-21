import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/dashboard/actions";
import { isTestUserSelectorEnabled, listTestUserViews } from "@/lib/test-users";

export default async function TestUsersPage() {
  if (!isTestUserSelectorEnabled()) {
    redirect("/dashboard");
  }

  const { workspace, views } = await listTestUserViews();

  return (
    <main className="page">
      <section className="shell">
        <div className="row">
          <div>
            <p className="eyebrow">{workspace.name}</p>
            <h1>Entrar como</h1>
            <p className="muted">Selector temporal para revisar cada vista durante las pruebas.</p>
          </div>

          <div className="actions">
            <Link className="button secondary" href="/dashboard">
              Dashboard
            </Link>
            <form action={signOut}>
              <button className="button secondary" type="submit">
                Salir
              </button>
            </form>
          </div>
        </div>

        <div className="persona-grid">
          {views.map((view) => (
            <article className="panel persona-card" key={view.key}>
              <div>
                <p className="eyebrow">{getScopeLabel(view.scope)}</p>
                <h2>{view.label}</h2>
                <p className="muted">{view.description}</p>
              </div>

              {(view.scope === "entity" || view.scope === "account") && !view.entity ? (
                <p className="error">No existe todavia una entidad con este nombre.</p>
              ) : null}

              <Link
                className={
                  (view.scope === "entity" || view.scope === "account") && !view.entity
                    ? "button secondary disabled"
                    : "button"
                }
                href={view.href}
                aria-disabled={(view.scope === "entity" || view.scope === "account") && !view.entity}
              >
                Ver pantalla
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function getScopeLabel(scope: "all" | "entity" | "account") {
  if (scope === "all") {
    return "Todas las cuentas";
  }

  if (scope === "account") {
    return "Cuenta de Taller";
  }

  return "Vista individual";
}
