import Link from "next/link";
import { MobileBackNavButton } from "./back-button";
import { signOut } from "./dashboard/actions";

type MobileBottomNavProps = {
  active?: "home" | "accounts" | "settings";
  personalHomeHref?: string;
  viewMode?: string;
};

export function MobileBottomNav({ active = "accounts", personalHomeHref = "/dashboard", viewMode }: MobileBottomNavProps) {
  if (viewMode === "personal") {
    return (
      <nav className="mobile-bottom-nav compact-personal-nav" aria-label="Navegacion personal">
        <Link className="mobile-bottom-nav-item" href={personalHomeHref}>
          <span className="mobile-nav-icon nav-home" aria-hidden="true" />
          <span>Inicio</span>
        </Link>
        <MobileBackNavButton />
        <form className="mobile-bottom-nav-form" action={signOut}>
          <button className="mobile-bottom-nav-item mobile-bottom-nav-button" type="submit">
            <span className="mobile-nav-icon nav-exit" aria-hidden="true" />
            <span>Salir</span>
          </button>
        </form>
      </nav>
    );
  }

  return (
    <nav className="mobile-bottom-nav entity-bottom-nav" aria-label="Navegacion principal">
      <Link className={`mobile-bottom-nav-item${active === "home" ? " active" : ""}`} href="/dashboard">
        <span className="mobile-nav-icon nav-home" aria-hidden="true" />
        <span>Inicio</span>
      </Link>
      <MobileBackNavButton />
      <Link className={`mobile-bottom-nav-item${active === "accounts" ? " active" : ""}`} href="/entities">
        <span className="mobile-nav-icon nav-accounts" aria-hidden="true" />
        <span>Cuentas</span>
      </Link>
      <Link className={`mobile-bottom-nav-item${active === "settings" ? " active" : ""}`} href="/settings">
        <span className="mobile-nav-icon nav-settings" aria-hidden="true" />
        <span>Ajustes</span>
      </Link>
    </nav>
  );
}
