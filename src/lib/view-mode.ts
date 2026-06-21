export type ViewMode = "admin" | "personal";

export type ViewModeSearchParams = Record<string, string | string[] | undefined>;

export function getViewMode(searchParams: ViewModeSearchParams): ViewMode {
  return getFirstValue(searchParams.mode) === "personal" ? "personal" : "admin";
}

export function withViewMode(href: string, mode: ViewMode) {
  if (mode === "admin") {
    return href;
  }

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}mode=personal`;
}

function getFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
