import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession, validateAndSetAdminCookie, isAdminEnabled } from "@/src/lib/adminAuth";

async function loginAction(formData: FormData) {
  "use server";
  const pass = formData.get("passphrase") as string | null;
  if (!pass?.trim()) return;
  const ok = await validateAndSetAdminCookie(pass.trim());
  if (ok) redirect("/admin");
}

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin");

  const enabled = isAdminEnabled();
  if (!enabled) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center p-4">
        <div className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 max-w-sm text-center">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Admin désactivé
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Définir <code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">ADMIN_DASHBOARD_PASSPHRASE</code> pour activer l’accès.
          </p>
          <Link
            href="/"
            className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
          >
            Retour au dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center p-4">
      <div className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 max-w-sm w-full">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Admin PulsePanel
        </h1>
        <form action={loginAction} className="space-y-4">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Passphrase
          </label>
          <input
            name="passphrase"
            type="password"
            autoComplete="current-password"
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 text-sm"
            placeholder="Passphrase admin"
          />
          <button
            type="submit"
            className="w-full rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-2 text-sm font-medium hover:opacity-90"
          >
            Accéder
          </button>
        </form>
        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400 text-center">
          <Link href="/" className="hover:underline">
            Retour au dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
