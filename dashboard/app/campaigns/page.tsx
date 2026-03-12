"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCampaigns } from "@/src/lib/supabaseCampaigns";
import type { Campaign } from "@/src/lib/mockData";
import { common, campaignsList as copy } from "@/src/lib/uiCopy";
import { dash } from "@/src/lib/dashboardTheme";
import { PanelCard } from "@/src/components/ui/PanelCard";
import { CampaignListRow } from "@/src/components/campaign/CampaignListRow";

type StatusFilter = "all" | "active" | "paused" | "completed";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [actionCampaignId, setActionCampaignId] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setLoading(true);
    getCampaigns()
      .then(setCampaigns)
      .catch(() => setError(copy.loadError))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    getCampaigns()
      .then((data) => {
        if (!cancelled) setCampaigns(data);
      })
      .catch(() => {
        if (!cancelled) setError(copy.loadError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return campaigns;
    return campaigns.filter((c) => c.status === statusFilter);
  }, [campaigns, statusFilter]);

  return (
    <div className={dash.page}>
      <div className={dash.container}>
        {/* 1. Header de page */}
        <header className={dash.hero + " mb-8 border border-dash-border-subtle/50"}>
          <h1 className={dash.headlineHero}>{copy.title}</h1>
          <p className="text-dash-text-secondary mt-2 max-w-2xl text-base">
            {copy.subtitle}
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

        {/* 2. Barre d'outils : filtre par statut */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-dash-text-muted uppercase tracking-wider mr-1">{copy.filterSegmentLabel}</span>
          {(
            [
              { value: "all" as const, label: copy.filterAll },
              { value: "active" as const, label: copy.filterActive },
              { value: "paused" as const, label: copy.filterPaused },
              { value: "completed" as const, label: copy.filterCompleted },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === value
                  ? "bg-dash-surface-2 text-dash-text shadow-[var(--dash-shadow-sm)]"
                  : "text-dash-text-muted hover:bg-dash-surface-2/70 hover:text-dash-text-secondary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 3. Corps : loading / error / empty / liste */}
        {loading ? (
          <div className={`${dash.card} p-8 text-center`}>
            <p className="text-dash-text-muted">{common.loading}</p>
          </div>
        ) : error ? (
          <PanelCard className="py-12 px-6 text-center border border-dash-border-subtle/50">
            <p className="text-dash-text font-medium mb-1">{common.errorTitle}</p>
            <p className="text-sm text-dash-text-muted mb-6">{error}</p>
            <button type="button" onClick={load} className={`rounded-lg ${dash.btn} ${dash.btnSecondary} px-5 py-2.5`}>
              {copy.retry}
            </button>
          </PanelCard>
        ) : filtered.length === 0 ? (
          <PanelCard className="py-12 px-6 text-center border border-dash-border-subtle/50">
            <p className="text-dash-text font-medium mb-1">
              {statusFilter === "all" ? copy.emptyTitle : `Aucune campagne ${statusFilter === "active" ? "active" : statusFilter === "paused" ? "en pause" : "terminée"}`}
            </p>
            <p className="text-sm text-dash-text-muted mb-6">
              {statusFilter === "all" ? copy.empty : copy.emptyFilterHint}
            </p>
            {statusFilter === "all" && (
              <Link href="/campaigns/new" className={`inline-block rounded-lg ${dash.btn} ${dash.btnPrimary} px-5 py-2.5`}>
                {copy.ctaNewCampaign}
              </Link>
            )}
          </PanelCard>
        ) : (
          <ul className="space-y-1">
            {filtered.map((c) => (
              <CampaignListRow
                key={c.id}
                campaign={c}
                disabled={actionCampaignId !== null}
                onRefresh={load}
                onActionStart={() => setActionCampaignId(c.id)}
                onActionEnd={() => setActionCampaignId(null)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
