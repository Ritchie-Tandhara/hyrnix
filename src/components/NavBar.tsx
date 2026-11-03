"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActingUser } from "./ActingUserContext";

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
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
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
                    active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Acting as</span>
          {loading ? (
            <span className="text-slate-400">loading…</span>
          ) : (
            <select
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-800"
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
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {actingUser.department}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
