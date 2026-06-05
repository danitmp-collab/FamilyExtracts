import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { signOut } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace();

  return (
    <main className="page">
      <section className="shell">
        <div className="row">
          <div>
            <h1>Familyextracts</h1>
            <p className="muted">Sesion iniciada como {user.email}</p>
          </div>

          <form action={signOut}>
            <button className="button secondary" type="submit">
              Salir
            </button>
          </form>
        </div>

        <div className="panel stack">
          <h2>Workspace familiar</h2>
          <p className="muted">
            {workspace.name} esta configurado para gestionar las entidades economicas
            familiares.
          </p>
          <Link className="button" href="/entities">
            Ver entidades economicas
          </Link>
        </div>
      </section>
    </main>
  );
}
