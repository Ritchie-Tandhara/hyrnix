"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  ScanSearch,
  Sparkles,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { useActingUser } from "./ActingUserContext";
import { isAdminOrHr } from "@/lib/roles";
import HyrnixLogo from "./HyrnixLogo";

const LINKS = [
  { href: "/", label: "Overview", icon: LayoutDashboard, adminOnly: false },
  { href: "/people", label: "People", icon: Users, adminOnly: false },
  { href: "/policy-lab", label: "Policy Lab", icon: FlaskConical, adminOnly: true },
  { href: "/process-xray", label: "Process X-Ray", icon: ScanSearch, adminOnly: false },
  { href: "/hyrnix-iq", label: "HYRNIX IQ", icon: Sparkles, adminOnly: false },
  { href: "/analytics", label: "Analytics", icon: BarChart3, adminOnly: true },
  { href: "/administration", label: "Administration", icon: ShieldCheck, adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { actingUser } = useActingUser();
  const admin = isAdminOrHr(actingUser?.role);
  const links = LINKS.filter((l) => !l.adminOnly || admin);

  return (
    <aside className="hidden w-64 flex-shrink-0 border-r border-border bg-surface md:flex md:flex-col">
      <div className="flex items-center gap-2 px-6 py-6">
        <HyrnixLogo size={32} />
        <span className="text-lg font-semibold tracking-tight text-foreground">HYRNIX</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {links.map((link) => {
          const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              <Icon size={18} strokeWidth={2} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-5 text-xs text-muted-foreground">
        P0 slice · People Operations Decision &amp; Automation Platform
      </div>
    </aside>
  );
}
