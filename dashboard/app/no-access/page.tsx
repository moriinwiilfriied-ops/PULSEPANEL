/**
 * Affiché lorsque l’utilisateur est authentifié mais n’a aucune organisation.
 * Le middleware redirige ici si org_members est vide pour ce user.
 */

import Link from "next/link";
import { noAccess as copy } from "@/src/lib/uiCopy";
import { dash } from "@/src/lib/dashboardTheme";
import { PanelCard } from "@/src/components/ui/PanelCard";

export default function NoAccessPage() {
  return (
    <div className={`${dash.page} flex items-center justify-center px-4`}>
      <PanelCard className="w-full max-w-md">
        <h1 className="text-xl font-semibold text-dash-text mb-3">{copy.title}</h1>
        <p className="text-dash-text-secondary mb-4">{copy.message}</p>
        <p className="text-sm text-dash-text-muted mb-6">{copy.hint}</p>
        <div className="flex gap-3">
          <Link href="/login" className={`${dash.btn} ${dash.btnSecondary}`}>{copy.action}</Link>
        </div>
      </PanelCard>
    </div>
  );
}
