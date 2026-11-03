"use client";

import { useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("hyrnix-theme", theme);
  } catch {
    // ignore storage failures (private mode, blocked storage)
  }
}

// The inline script in layout.tsx sets data-theme on <html> before React hydrates,
// so reading it here in the lazy initializer matches the client's first paint.
function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "dark" ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  const toggle = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className="flex h-8 w-14 items-center rounded-full border border-border bg-surface-muted px-1 transition"
      suppressHydrationWarning
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs transition ${
          theme === "dark" ? "translate-x-6" : "translate-x-0"
        }`}
        suppressHydrationWarning
      >
        {theme === "dark" ? "🌙" : "☀"}
      </span>
    </button>
  );
}
