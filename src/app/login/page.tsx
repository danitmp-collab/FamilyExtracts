import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signIn } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const errors: Record<string, string> = {
  "missing-fields": "Introduce email y contrasena.",
  "invalid-credentials": "No se ha podido iniciar sesion con esos datos."
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;
  const errorMessage = error ? errors[error] : null;

  return (
    <main className="page">
      <section className="panel stack">
        <div>
          <h1>Familyextracts</h1>
          <p className="muted">Acceso al control financiero familiar.</p>
        </div>

        <form className="form" action={signIn}>
          <label className="field">
            <span>Email</span>
            <input className="input" type="email" name="email" autoComplete="email" required />
          </label>

          <label className="field">
            <span>Contrasena</span>
            <input
              className="input"
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>

          {errorMessage ? <p className="error">{errorMessage}</p> : null}

          <button className="button" type="submit">
            Entrar
          </button>
        </form>
      </section>
    </main>
  );
}
