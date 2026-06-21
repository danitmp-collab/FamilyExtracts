"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function BackButton() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  if (
    pathname === "/login" ||
    pathname === "/dashboard" ||
    pathname === "/entities" ||
    pathname.startsWith("/entities/") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/concept-groups") ||
    pathname.startsWith("/categories") ||
    /^\/entities\/[^/]+$/.test(pathname) ||
    /^\/entities\/[^/]+\/accounts\/[^/]+$/.test(pathname) ||
    pathname.startsWith("/auth/")
  ) {
    return null;
  }

  const isPersonalView = searchParams.get("mode") === "personal";
  const entityId = pathname.match(/^\/entities\/([^/]+)/)?.[1];
  const homeHref = isPersonalView && entityId ? `/entities/${entityId}?mode=personal` : "/dashboard";

  if (isPersonalView) {
    return null;
  }

  return (
    <nav className="back-navigation" aria-label="Navegacion secundaria">
      <button
        className="back-button"
        type="button"
        onClick={() => {
          if (window.history.length > 1) {
            router.back();
            return;
          }

          router.push(homeHref);
        }}
      >
        <span aria-hidden="true">&lt;</span>
        Atras
      </button>
      <Link className="back-button home-link" href={homeHref}>
        Inicio
      </Link>
    </nav>
  );
}

export function MobileBackNavButton() {
  const router = useRouter();

  return (
    <button
      className="mobile-bottom-nav-item mobile-bottom-nav-button"
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }

        router.push("/dashboard");
      }}
    >
      <span className="mobile-nav-icon nav-back" aria-hidden="true" />
      <span>Atras</span>
    </button>
  );
}
