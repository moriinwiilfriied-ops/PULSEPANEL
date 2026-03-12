/**
 * Choix explicite d’organisation lorsque l’utilisateur a plusieurs memberships.
 * Le middleware redirige ici si plusieurs orgs et pas de cookie valide.
 */

import { redirect } from "next/navigation";
import { getDashboardUser, getDashboardOrgMemberships } from "@/src/lib/dashboardAuth";
import { selectOrg as copy } from "@/src/lib/uiCopy";
import { dash } from "@/src/lib/dashboardTheme";
import { PanelCard } from "@/src/components/ui/PanelCard";
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
    <div className={`${dash.page} flex items-center justify-center px-4`}>
      <PanelCard className="w-full max-w-md">
        <h1 className="text-xl font-semibold text-dash-text mb-2">{copy.title}</h1>
        <p className="text-sm text-dash-text-secondary mb-6">{copy.hint}</p>
        <SelectOrgForm memberships={memberships} />
      </PanelCard>
    </div>
  );
}
