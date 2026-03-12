import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession, clearAdminCookie } from "@/src/lib/adminAuth";
import { admin as copy } from "@/src/lib/uiCopy";

const NAV = [
  { href: "/admin", label: copy.navOverview },
  { href: "/admin/users", label: copy.navUsers },
  { href: "/admin/withdrawals", label: copy.navWithdrawals },
  { href: "/admin/flags", label: copy.navFlags },
  { href: "/admin/campaigns", label: copy.navCampaigns },
  { href: "/admin/ledger", label: copy.navLedger },
  { href: "/admin/webhooks", label: copy.navWebhooks },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  return (
    <div className="min-h-screen bg-dash-bg text-dash-text">
      {session ? (
        <header className="border-b border-dash-border-subtle bg-dash-surface/95 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between flex-wrap gap-2">
            <nav className="flex items-center gap-4 flex-wrap">
              <span className="text-sm font-medium text-dash-text-muted mr-2">
                Admin
              </span>
              {NAV.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm text-dash-text-secondary hover:text-dash-text transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm text-dash-text-muted hover:text-dash-text transition-colors"
              >
                {copy.backDashboard}
              </Link>
              <form action={async () => {
                "use server";
                await clearAdminCookie();
                redirect("/admin/login");
              }}>
                <button
                  type="submit"
                  className="text-sm text-dash-text-muted hover:text-dash-text transition-colors"
                >
                  {copy.logout}
                </button>
              </form>
            </div>
          </div>
        </header>
      ) : null}
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
