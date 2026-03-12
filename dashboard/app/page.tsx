"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getCampaigns,
  getTestCampaignForOrg,
  createTestCampaign,
  resetTestCampaign,
  deleteCampaign,
} from "@/src/lib/supabaseCampaigns";
import { getCurrentOrgId } from "@/src/lib/supabase";
import { getOrgPilotKpis, formatTimeToQuota } from "@/src/lib/pilotKpis";
import type { Campaign } from "@/src/lib/mockData";
import type { OrgPilotKpis } from "@/src/lib/pilotKpis";
import { common, home as copy, testSwipe as testCopy } from "@/src/lib/uiCopy";
import { dash } from "@/src/lib/dashboardTheme";
import { PanelCard } from "@/src/components/ui/PanelCard";
import { MetricCard } from "@/src/components/ui/MetricCard";
import { DashboardSection } from "@/src/components/ui/DashboardSection";
import { CampaignListRow } from "@/src/components/campaign/CampaignListRow";

function refreshCampaigns(setCampaigns: (c: Campaign[]) => void, setTestCampaign: (c: Campaign | null) => void) {
  return Promise.all([getCampaigns().then(setCampaigns), getTestCampaignForOrg().then(setTestCampaign)]);
}

export default function Home() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [testCampaign, setTestCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<OrgPilotKpis | null>(null);
  const [testAction, setTestAction] = useState<"create" | "reset" | "delete" | null>(null);
  const [actionCampaignId, setActionCampaignId] = useState<string | null>(null);

  const refresh = useCallback(() => refreshCampaigns(setCampaigns, setTestCampaign), []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    getCurrentOrgId().then((orgId) => {
      if (orgId) getOrgPilotKpis(orgId).then(setKpis);
      else setKpis(null);
    });
  }, []);

  return (
    <div className={dash.page}>
      <div className={dash.container}>
        {/* 1. Header : titre, sous-texte, CTA */}
        <header className={dash.hero + " mb-8 border border-dash-border-subtle/50"}>
          <h1 className={dash.headlineHero}>{copy.title}</h1>
          <p className="text-dash-text-secondary mt-2 max-w-2xl text-base">
            {copy.intro}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Link href="/campaigns/new" className={`rounded-lg ${dash.btn} ${dash.btnPrimary} px-5 py-2.5`}>
              {copy.ctaNewCampaign}
            </Link>
            <Link href="/billing" className={`text-sm ${dash.link}`}>
              {copy.ctaBilling}
            </Link>
          </div>
        </header>

        {/* 2. Bloc métriques */}
        {kpis != null && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <MetricCard label={copy.metricCredit} value={`${(kpis.credit_available_cents / 100).toFixed(2)} €`} />
            <MetricCard label={copy.metricCampaignsActive} value={String(kpis.active_campaigns)} />
            <MetricCard label={copy.metricResponses} value={String(kpis.total_responses)} />
          </div>
        )}

        {/* 3. Zone activité : campagnes récentes + colonne secondaire */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <DashboardSection title="Campagnes récentes">
              {!loading && campaigns.length > 0 && (
                <p className="mb-3">
                  <Link href="/campaigns" className={`text-sm ${dash.link}`}>{copy.linkAllCampaigns}</Link>
                </p>
              )}
              {loading ? (
                <div className={`${dash.card} p-8 text-center`}>
                  <p className="text-dash-text-muted">{common.loading}</p>
                </div>
              ) : !campaigns.length ? (
                <PanelCard className="py-12 px-6 text-center border border-dash-border-subtle/50">
                  <p className="text-dash-text font-medium mb-1">{copy.emptyTitle}</p>
                  <p className="text-sm text-dash-text-muted mb-6">{copy.empty}</p>
                  <Link href="/campaigns/new" className={`inline-block rounded-lg ${dash.btn} ${dash.btnPrimary} px-5 py-2.5`}>
                    {copy.ctaNewCampaign}
                  </Link>
                </PanelCard>
              ) : (
              <ul className="space-y-1">
                {campaigns.map((c) => (
                  <CampaignListRow
                    key={c.id}
                    campaign={c}
                    disabled={actionCampaignId !== null}
                    onRefresh={refresh}
                    onActionStart={() => setActionCampaignId(c.id)}
                    onActionEnd={() => setActionCampaignId(null)}
                  />
                ))}
              </ul>
              )}
            </DashboardSection>
          </div>

          {/* Colonne secondaire : Test swipe + Repeat / KPI */}
          <div className="space-y-6">
            <PanelCard className="bg-amber-500/10 border border-amber-500/20">
              <h3 className="text-sm font-semibold text-amber-200/90">{testCopy.title}</h3>
              <p className="text-xs text-dash-text-muted mt-0.5 mb-4">{testCopy.intro}</p>
              {testCampaign ? (
                <div className="space-y-3">
                  <Link href={`/campaigns/${testCampaign.id}`} className="block rounded-lg bg-amber-600/90 text-white px-3 py-2 text-sm font-medium hover:bg-amber-500 transition-colors text-center">
                    {testCampaign.name} — {(testCampaign.responsesCount ?? 0)} / {testCampaign.quota}
                  </Link>
                  <div className="flex gap-2">
                    <button type="button" disabled={!!testAction} onClick={async () => { setTestAction("reset"); const { error } = await resetTestCampaign(testCampaign.id); if (error) alert(testCopy.errorReset); else refresh(); setTestAction(null); }} className={`flex-1 rounded-md ${dash.btn} ${dash.btnWarning} disabled:opacity-50 text-xs py-1.5`}>{testAction === "reset" ? "…" : testCopy.ctaReset}</button>
                    <button type="button" disabled={!!testAction} onClick={async () => { if (!window.confirm(testCopy.confirmDelete)) return; setTestAction("delete"); const { error } = await deleteCampaign(testCampaign.id); if (error) alert(testCopy.errorDelete); else refresh(); setTestAction(null); }} className={`rounded-md ${dash.btn} ${dash.btnDanger} disabled:opacity-50 text-xs py-1.5`}>{testAction === "delete" ? "…" : testCopy.ctaDelete}</button>
                  </div>
                </div>
              ) : (
                <button type="button" disabled={!!testAction} onClick={async () => { setTestAction("create"); const result = await createTestCampaign(); if ("error" in result) { if (result.error === "activation_failed") { const detail = result.message ? `\n${testCopy.errorActivationDetail}${result.message}` : ""; alert(testCopy.errorActivationFailed + detail); refresh(); } else { const detail = result.error === "creation_failed" && result.message ? `\n${testCopy.errorCreateDetail}${result.message}` : ""; alert(testCopy.errorCreate + detail); } } else refresh(); setTestAction(null); }} className={`w-full rounded-lg ${dash.btn} bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50 py-2`}>{testAction === "create" ? testCopy.creating : testCopy.ctaCreate}</button>
              )}
            </PanelCard>

            {kpis && (
              <div className={dash.cardSecondary + " space-y-3"}>
                <p className={dash.metricLabel}>Résumé</p>
                <p className="text-sm text-dash-text-secondary">
                  {kpis.completed_campaigns} terminée{kpis.completed_campaigns !== 1 ? "s" : ""} · {kpis.total_responses} réponses
                  {kpis.avg_time_to_quota_seconds != null && ` · ${formatTimeToQuota(kpis.avg_time_to_quota_seconds)} moy.`}
                </p>
                <p className={dash.metricLabel}>Repeat</p>
                <p className="text-sm text-dash-text-secondary">
                  {kpis.repeat.campaigns_count} campagne{kpis.repeat.campaigns_count !== 1 ? "s" : ""} lancée{kpis.repeat.campaigns_count !== 1 ? "s" : ""}
                  {kpis.repeat.campaigns_after_first > 0 ? ` · ${kpis.repeat.campaigns_after_first} après 1ère` : ""}
                </p>
                {kpis.repeat.repeat_eligible && <p className="text-xs text-dash-text-muted">Ouvrez une campagne terminée → « Créer une V2 ».</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
