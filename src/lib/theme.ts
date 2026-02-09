export const THEME_STORAGE_KEY = "siam-theme";

export type ThemeChoice = "light" | "dark" | "night" | "auto";

/** Resolved theme applied to the document (light, dark, or night). */
export type ResolvedTheme = "light" | "dark" | "night";

export function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Resolve stored choice to the actual theme to apply. */
export function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  if (choice === "auto") {
    return getSystemPrefersDark() ? "dark" : "light";
  }
  return choice;
}

export function applyTheme(resolved: ResolvedTheme): void {
  const html = document.documentElement;
  html.setAttribute("data-theme", resolved);
  if (resolved === "dark" || resolved === "night") {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }
}

export function getStoredTheme(): ThemeChoice {
  if (typeof window === "undefined") return "auto";
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "night" || v === "auto") return v;
  } catch {
    /* ignore */
  }
  return "auto";
}

export function setStoredTheme(choice: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    /* ignore */
  }
}
