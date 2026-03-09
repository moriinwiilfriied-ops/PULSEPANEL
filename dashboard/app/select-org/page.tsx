/**
 * Choix explicite d’organisation lorsque l’utilisateur a plusieurs memberships.
 * Le middleware redirige ici si plusieurs orgs et pas de cookie valide.
 */

import { redirect } from "next/navigation";
import { getDashboardUser, getDashboardOrgMemberships } from "@/src/lib/dashboardAuth";
import { SelectOrgForm } from "./SelectOrgForm";

export default async function SelectOrgPage() {
  const user = await getDashboardUser();
  if (!user) redirect("/login");

  const memberships = await getDashboardOrgMemberships();
  if (memberships.length === 0) redirect("/no-access");
  if (memberships.length === 1) {
    const { setDashboardCurrentOrgCookie } = await import("@/src/lib/dashboardAuth");
    await setDashboardCurrentOrgCookie(memberships[0].orgId);
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          Choisir une organisation
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Vous avez accès à plusieurs organisations. Sélectionnez celle à
          utiliser pour cette session.
        </p>
        <SelectOrgForm memberships={memberships} />
      </div>
    </div>
  );
}
