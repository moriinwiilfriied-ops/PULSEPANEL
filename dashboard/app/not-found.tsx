/**
 * Page 404 — Dashboard PulsePanel
 * Affichée lorsque la route n'existe pas (not-found).
 */

import Link from "next/link";
import { notFound as copy } from "@/src/lib/uiCopy";
import { dash } from "@/src/lib/dashboardTheme";
import { PanelCard } from "@/src/components/ui/PanelCard";

export default function NotFoundPage() {
  return (
    <div className={`${dash.page} flex items-center justify-center px-4`}>
      <PanelCard className="w-full max-w-md">
        <h1 className="text-xl font-semibold text-dash-text mb-3">{copy.title}</h1>
        <p className="text-dash-text-secondary mb-6">{copy.message}</p>
        <Link href="/" className={`${dash.btn} ${dash.btnPrimary}`}>
          {copy.backToHome}
        </Link>
      </PanelCard>
    </div>
  );
}
