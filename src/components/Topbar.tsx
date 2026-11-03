"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActingUser } from "./ActingUserContext";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/people", label: "People" },
  { href: "/policy-lab", label: "Policy Lab" },
  { href: "/process-xray", label: "Process X-Ray" },
  { href: "/hyrnix-iq", label: "HYRNIX IQ" },
  { href: "/administration", label: "Administration" },
];

export default function Topbar() {
  const pathname = usePathname();
  const { employees, actingUserId, actingUser, setActingUserId, loading } = useActingUser();

  const adminOrHr = employees.filter((e) => e.role === "ADMIN" || e.role === "HR");

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link href="/" className="text-base font-semibold tracking-tight text-primary md:hidden">
          HYRNIX
        </Link>

        <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
          Acting as you build toward the full platform —{" "}
          <span className="font-medium text-foreground">HYRNIX IQ, Policy Lab &amp; Process X-Ray share one dataset.</span>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3 text-sm md:flex-none">
          <span className="hidden text-muted-foreground sm:inline">Acting as</span>
          {loading ? (
            <span className="text-muted-foreground">loading…</span>
          ) : (
            <select
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-foreground"
              value={actingUserId ?? ""}
              onChange={(e) => setActingUserId(e.target.value)}
            >
              {adminOrHr.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.role})
                </option>
              ))}
            </select>
          )}
          {actingUser && (
            <span className="hidden rounded bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent sm:inline">
              {actingUser.department}
            </span>
          )}
          <ThemeToggle />
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-t border-border px-3 py-2 md:hidden">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-muted"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
