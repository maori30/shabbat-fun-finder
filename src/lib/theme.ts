/**
 * Theme utility for Liquid Glass.
 *
 * Applies the `.dark` class on <html> so every glass token in
 * `src/styles.css` (glass-panel, glass-card, glass-badge-*, etc.)
 * switches to its dark variant. Persists the choice in localStorage
 * and falls back to the OS preference.
 */

export type Theme = "light" | "dark";
const KEY = "kiflay-theme";

export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(KEY);
  return v === "light" || v === "dark" ? v : null;
}

export function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function setTheme(theme: Theme) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, theme);
  applyTheme(theme);
}

/** Inline script injected in <head> to prevent light-mode flash on load. */
export const themeBootstrapScript = `(() => {
  try {
    var k = '${KEY}';
    var s = localStorage.getItem(k);
    var d = s ? s === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (d) document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = d ? 'dark' : 'light';
  } catch (_) {}
})();`;
