import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTestUserSelectorEnabled } from "@/lib/test-users";
import { signInWithGoogle } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

const errors: Record<string, string> = {
  "google-oauth": "No se ha podido iniciar sesion con Google."
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    if (isTestUserSelectorEnabled()) {
      redirect("/test-users");
    }

    redirect("/dashboard");
  }

  const { error } = await searchParams;
  const errorMessage = error ? errors[error] : null;

  return (
    <main className="page login-page finance-auth-page">
      <section className="panel stack login-panel finance-auth-card">
        <div className="finance-auth-brand">
          <div className="finance-auth-kicker-row">
            <span className="finance-brand-mark" aria-hidden="true">F</span>
            <p className="eyebrow">Control familiar</p>
          </div>
          <h1 className="login-title">Family_extracts</h1>
          <p className="muted">Acceso al control financiero familiar.</p>
        </div>

        {errorMessage ? <p className="error">{errorMessage}</p> : null}

        <form className="form" action={signInWithGoogle}>
          <button className="button finance-primary-action" type="submit">
            Entrar con Google
          </button>
        </form>

        <div className="finance-auth-preview" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
    </main>
  );
}
