"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActingUser } from "./ActingUserContext";
import ThemeToggle from "./ThemeToggle";
import { isAdminOrHr } from "@/lib/roles";
import { ChevronDown } from "lucide-react";

const LINKS = [
  { href: "/", label: "Overview", adminOnly: false },
  { href: "/people", label: "People", adminOnly: false },
  { href: "/policy-lab", label: "Policy Lab", adminOnly: true },
  { href: "/process-xray", label: "Process X-Ray", adminOnly: false },
  { href: "/hyrnix-iq", label: "HYRNIX IQ", adminOnly: false },
  { href: "/analytics", label: "Analytics", adminOnly: true },
  { href: "/administration", label: "Administration", adminOnly: true },
];

const ROLE_ORDER = ["ADMIN", "HR", "MANAGER", "EMPLOYEE"];
const ROLE_GROUP_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  HR: "HR",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
};

export default function Topbar() {
  const pathname = usePathname();
  const { employees, actingUserId, actingUser, setActingUserId, loading } = useActingUser();

  const admin = isAdminOrHr(actingUser?.role);
  const links = LINKS.filter((l) => !l.adminOnly || admin);

  const employeesByRole = ROLE_ORDER.map((role) => ({
    role,
    members: employees.filter((e) => e.role === role).sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((g) => g.members.length > 0);

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
            <div className="relative w-48 flex-shrink-0 sm:w-56">
              <select
                className="w-full appearance-none truncate rounded-md border border-border bg-surface py-1.5 pl-2 pr-7 text-foreground"
                value={actingUserId ?? ""}
                onChange={(e) => setActingUserId(e.target.value)}
              >
                {employeesByRole.map((group) => (
                  <optgroup key={group.role} label={ROLE_GROUP_LABEL[group.role] ?? group.role}>
                    {group.members.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.department})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown
                size={14}
                strokeWidth={2.5}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
            </div>
          )}
          {actingUser && (
            <>
              <span className="hidden w-20 flex-shrink-0 truncate rounded bg-primary-soft px-2 py-0.5 text-center text-xs font-medium text-primary sm:inline-block">
                {ROLE_GROUP_LABEL[actingUser.role] ?? actingUser.role}
              </span>
              <span className="hidden w-24 flex-shrink-0 truncate rounded bg-accent-soft px-2 py-0.5 text-center text-xs font-medium text-accent sm:inline-block">
                {actingUser.department}
              </span>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-t border-border px-3 py-2 md:hidden">
        {links.map((link) => {
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
