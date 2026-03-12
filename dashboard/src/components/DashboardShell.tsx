"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrgCreditHeader } from "@/src/components/OrgCreditHeader";
import { RailTooltip } from "@/src/components/ui/RailTooltip";

const NAV = [
  { href: "/campaigns", label: "Campagnes", icon: "campaigns" },
  { href: "/billing", label: "Facturation", icon: "billing" },
  { href: "/withdrawals", label: "Retraits", icon: "withdrawals" },
] as const;

const SHELL_EXCLUDED = ["/login", "/no-access", "/select-org", "/auth/callback"];

/* Rail : 148px (md), 176px (lg) — labels entiers, sans troncature */

function NavIcon({ icon, active }: { icon: string; active: boolean }) {
  const className = active ? "text-dash-text" : "text-dash-text-muted group-hover:text-dash-text-secondary";
  const size = 20;
  switch (icon) {
    case "campaigns":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "billing":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M2 10h20" />
          <path d="M6 14h.01" />
          <path d="M10 14h.01" />
          <path d="M14 14h.01" />
        </svg>
      );
    case "withdrawals":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    default:
      return null;
  }
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const skipShell = pathname && SHELL_EXCLUDED.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (skipShell) return <>{children}</>;

  const isHome = pathname === "/";

  return (
    <div className="min-h-screen flex bg-dash-bg">
      {/* Rail latéral — branding PulsePanel + navigation premium + CTA */}
      <aside
        className="hidden md:flex md:w-[148px] lg:w-[176px] md:flex-col md:flex-shrink-0 bg-dash-surface border-r border-dash-border-subtle z-10 transition-[width] duration-200"
        aria-label="Navigation principale"
      >
        <div className="flex flex-col w-full py-8 px-4 gap-1 min-h-0">
          {/* Branding : Accueil = PulsePanel */}
          <RailTooltip label="Accueil" side="right">
            <Link
              href="/"
              className={`flex items-center gap-3 w-full rounded-xl px-3 py-2.5 transition-[color,background-color,box-shadow] duration-150 focus:outline-none focus:ring-2 focus:ring-dash-accent/40 focus:ring-offset-2 focus:ring-offset-dash-surface ${
                isHome
                  ? "bg-dash-surface-2 text-dash-text shadow-[var(--dash-shadow-sm)]"
                  : "text-dash-text-muted hover:bg-dash-surface-2/70 hover:text-dash-text-secondary"
              }`}
            >
              <span
                className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 text-sm font-semibold tracking-tight ${
                  isHome ? "bg-dash-surface-3 text-dash-text" : "bg-dash-surface-2/80 text-dash-text-secondary"
                }`}
                aria-hidden
              >
                P
              </span>
              <span className="text-[11px] font-semibold tracking-tight text-inherit whitespace-nowrap">PulsePanel</span>
            </Link>
          </RailTooltip>
          <div className="h-px bg-dash-border-subtle my-2" role="presentation" />
          <p className="px-3 text-[10px] font-medium text-dash-text-muted uppercase tracking-wider mb-0.5" aria-hidden>Menu</p>
          {/* Navigation */}
          {NAV.map(({ href, label, icon }) => {
            const active = pathname?.startsWith(href);
            return (
              <RailTooltip key={href} label={label} side="right">
                <Link
                  href={href}
                  className={`group flex items-center gap-3 w-full rounded-xl px-3 py-2.5 transition-[color,background-color,box-shadow,border-color] duration-150 focus:outline-none focus:ring-2 focus:ring-dash-accent/40 focus:ring-offset-2 focus:ring-offset-dash-surface border-l-2 ${
                    active
                      ? "bg-dash-surface-2 text-dash-text shadow-[var(--dash-shadow-sm)] border-dash-accent/70"
                      : "border-transparent text-dash-text-muted hover:bg-dash-surface-2/70 hover:text-dash-text-secondary hover:border-dash-border-subtle"
                  }`}
                >
                  <span className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg">
                    <NavIcon icon={icon} active={active} />
                  </span>
                  <span className="text-[11px] font-medium text-inherit hidden md:inline whitespace-nowrap">{label}</span>
                </Link>
              </RailTooltip>
            );
          })}
          <div className="flex-1 min-h-[20px]" />
          <div className="h-px bg-dash-border-subtle my-2" role="presentation" />
          <RailTooltip label="Nouvelle campagne" side="right">
            <Link
              href="/campaigns/new"
              className="flex items-center gap-2 w-full rounded-xl pl-3 pr-5 py-2.5 bg-dash-text text-dash-bg text-[11px] font-semibold hover:opacity-90 transition-opacity duration-150 focus:outline-none focus:ring-2 focus:ring-dash-accent/40 focus:ring-offset-2 focus:ring-offset-dash-surface"
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="hidden md:inline whitespace-nowrap">Nouvelle campagne</span>
            </Link>
          </RailTooltip>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <OrgCreditHeader />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
