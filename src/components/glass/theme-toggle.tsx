import { useEffect, useState } from "react";
import { applyTheme, resolveTheme, setTheme, type Theme } from "@/lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = resolveTheme();
    setThemeState(t);
    applyTheme(t);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setThemeState(next);
    setTheme(next);
  };

  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "מעבר למצב בהיר" : "מעבר למצב כהה"}
      title={isDark ? "מצב בהיר" : "מצב כהה"}
      className={`glass-btn inline-flex h-10 w-10 items-center justify-center rounded-full text-lg ${className}`}
      suppressHydrationWarning
    >
      {mounted ? (isDark ? "☀️" : "🌙") : "🌗"}
    </button>
  );
}
