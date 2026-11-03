"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  ScanSearch,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

const LINKS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/people", label: "People", icon: Users },
  { href: "/policy-lab", label: "Policy Lab", icon: FlaskConical },
  { href: "/process-xray", label: "Process X-Ray", icon: ScanSearch },
  { href: "/hyrnix-iq", label: "HYRNIX IQ", icon: Sparkles },
  { href: "/administration", label: "Administration", icon: ShieldCheck },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-shrink-0 border-r border-border bg-surface md:flex md:flex-col">
      <div className="flex items-center gap-2 px-6 py-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          H
        </span>
        <span className="text-lg font-semibold tracking-tight text-foreground">HYRNIX</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {LINKS.map((link) => {
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
