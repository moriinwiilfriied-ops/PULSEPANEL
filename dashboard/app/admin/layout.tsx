import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession, clearAdminCookie } from "@/src/lib/adminAuth";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/withdrawals", label: "Withdrawals" },
  { href: "/admin/flags", label: "Flags" },
  { href: "/admin/campaigns", label: "Campaigns" },
  { href: "/admin/ledger", label: "Ledger" },
  { href: "/admin/webhooks", label: "Webhooks" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {session ? (
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between flex-wrap gap-2">
            <nav className="flex items-center gap-4 flex-wrap">
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mr-2">
                Admin
              </span>
              {NAV.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline"
              >
                Dashboard
              </Link>
              <form action={async () => {
                "use server";
                await clearAdminCookie();
                redirect("/admin/login");
              }}>
                <button
                  type="submit"
                  className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline"
                >
                  Déconnexion
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
