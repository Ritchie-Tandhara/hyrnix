"use client";

export default function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("hyrnix-theme", next);
    } catch {
      // ignore storage failures (private mode, blocked storage)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light/dark theme"
      title="Toggle light/dark theme"
      className="theme-toggle"
    >
      <span className="theme-toggle-knob" aria-hidden />
    </button>
  );
}
