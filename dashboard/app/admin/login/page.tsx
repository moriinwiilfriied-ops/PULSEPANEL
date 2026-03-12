import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession, validateAndSetAdminCookie, isAdminEnabled } from "@/src/lib/adminAuth";
import { admin as copy } from "@/src/lib/uiCopy";
import { dash } from "@/src/lib/dashboardTheme";
import { PanelCard } from "@/src/components/ui/PanelCard";

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
      <div className={`${dash.page} flex items-center justify-center px-4`}>
        <PanelCard className="w-full max-w-sm">
          <h1 className="text-xl font-semibold text-dash-text mb-3">{copy.loginDisabled}</h1>
          <p className="text-sm text-dash-text-secondary mb-6">
            {copy.loginDisabledHint}{" "}
            <code className="bg-dash-surface-2 px-1 rounded text-xs">ADMIN_DASHBOARD_PASSPHRASE</code>
          </p>
          <Link href="/" className={dash.link}>
            {copy.loginBack}
          </Link>
        </PanelCard>
      </div>
    );
  }

  return (
    <div className={`${dash.page} flex items-center justify-center px-4`}>
      <PanelCard className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-dash-text mb-4">{copy.loginTitle}</h1>
        <form action={loginAction} className="space-y-4">
          <label className="block text-sm font-medium text-dash-text">
            Passphrase
          </label>
          <input
            name="passphrase"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-[var(--dash-radius)] border border-dash-border bg-dash-surface-2 px-3 py-2 text-dash-text placeholder:text-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent/30 text-sm"
            placeholder="Passphrase admin"
          />
          <button type="submit" className={`w-full ${dash.btn} ${dash.btnPrimary}`}>
            Accéder
          </button>
        </form>
        <p className="mt-4 text-xs text-dash-text-muted text-center">
          <Link href="/" className={dash.link}>
            {copy.loginBack}
          </Link>
        </p>
      </PanelCard>
    </div>
  );
}
