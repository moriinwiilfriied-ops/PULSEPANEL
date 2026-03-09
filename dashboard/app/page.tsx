"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCampaigns } from "@/src/lib/supabaseCampaigns";
import { getCurrentOrgId } from "@/src/lib/supabase";
import { getOrgPilotKpis, formatTimeToQuota } from "@/src/lib/pilotKpis";
import type { Campaign } from "@/src/lib/mockData";
import type { OrgPilotKpis } from "@/src/lib/pilotKpis";
import { home as copy } from "@/src/lib/uiCopy";

export default function Home() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<OrgPilotKpis | null>(null);

  useEffect(() => {
    getCampaigns().then(setCampaigns).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getCurrentOrgId().then((orgId) => {
      if (orgId) getOrgPilotKpis(orgId).then(setKpis);
      else setKpis(null);
    });
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h2 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {copy.title}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          {copy.intro}
        </p>

        <div className="flex flex-wrap gap-3 mb-6">
          <Link
            href="/campaigns/new"
            className="rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            {copy.ctaNewCampaign}
          </Link>
          <Link
            href="/billing"
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {copy.ctaBilling}
          </Link>
        </div>

        {kpis && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Campagnes actives</p>
              <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{kpis.active_campaigns}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Terminées</p>
              <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{kpis.completed_campaigns}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Crédit</p>
              <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                {(kpis.credit_available_cents / 100).toFixed(2)} €
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Réponses total</p>
              <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{kpis.total_responses}</p>
            </div>
            {kpis.avg_time_to_quota_seconds != null && (
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Temps moyen quota</p>
                <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatTimeToQuota(kpis.avg_time_to_quota_seconds)}
                </p>
              </div>
            )}
            {kpis.avg_pct_valid != null && (
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Qualité moy. (% valides)</p>
                <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{kpis.avg_pct_valid} %</p>
              </div>
            )}
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 sm:col-span-2">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Repeat</p>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {kpis.repeat.campaigns_count} campagne{kpis.repeat.campaigns_count !== 1 ? "s" : ""} lancée{kpis.repeat.campaigns_count !== 1 ? "s" : ""}
                {kpis.repeat.campaigns_after_first > 0
                  ? ` · ${kpis.repeat.campaigns_after_first} après la première`
                  : ""}
              </p>
              {kpis.repeat.repeat_eligible && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Pour relancer un test : ouvrez une campagne terminée puis « Créer une V2 ».
                </p>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-zinc-500 dark:text-zinc-400 py-8">{copy.loading}</p>
        ) : !campaigns.length ? (
          <p className="text-zinc-500 dark:text-zinc-400 py-8">
            {copy.empty}
          </p>
        ) : (
          <ul className="space-y-3">
            {campaigns.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/campaigns/${c.id}`}
                  className="block rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {c.name}
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        {c.template} · {(c.responsesCount ?? 0)} / {c.quota} réponses
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${
                        c.status === "active"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : c.status === "paused"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {c.status === "active" ? "Actif" : c.status === "paused" ? "En pause" : "Terminée"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
