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

export default function NavBar() {
  const pathname = usePathname();
  const { employees, actingUserId, actingUser, setActingUserId, loading } = useActingUser();

  const adminOrHr = employees.filter((e) => e.role === "ADMIN" || e.role === "HR");

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-semibold tracking-tight text-primary">
            HYRNIX
          </Link>
          <nav className="flex gap-1">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">Acting as</span>
          {loading ? (
            <span className="text-muted-foreground">loading…</span>
          ) : (
            <select
              className="rounded-md border border-border bg-surface px-2 py-1 text-foreground"
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
            <span className="rounded bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
              {actingUser.department}
            </span>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
