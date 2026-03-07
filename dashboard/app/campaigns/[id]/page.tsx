"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getCampaignStats, updateCampaignStatus, duplicateCampaign } from "@/src/lib/supabaseCampaigns";

type Stats = Awaited<ReturnType<typeof getCampaignStats>>;

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [stats, setStats] = useState<Stats>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadStats = () => {
    setLoading(true);
    getCampaignStats(id).then(setStats).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();
  }, [id]);

  const handleStatus = async (status: "active" | "paused" | "completed") => {
    setActionLoading(true);
    const { error } = await updateCampaignStatus(id, status);
    setActionLoading(false);
    if (!error) loadStats();
  };

  const handleDuplicate = async () => {
    setActionLoading(true);
    const created = await duplicateCampaign(id);
    setActionLoading(false);
    if (created) router.push(`/campaigns/${created.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500">Chargement…</p>
      </div>
    );
  }
  if (!stats) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-600 dark:text-zinc-400">Campagne introuvable.</p>
          <Link href="/" className="mt-4 inline-block text-zinc-900 dark:text-zinc-100 underline">
            Retour à l’accueil
          </Link>
        </div>
      </div>
    );
  }

  const { campaign, responsesCount, quota, distribution, trustAvg, qualityBadge, verbatims } = stats;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Retour
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {campaign.name}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              campaign.status === "active"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                : campaign.status === "paused"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {campaign.status === "active" ? "Actif" : campaign.status === "paused" ? "En pause" : "Terminée"}
          </span>
          <span className="rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2.5 py-0.5 text-xs font-medium">
            {campaign.template}
          </span>
          <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2.5 py-0.5 text-xs font-medium">
            Qualité {qualityBadge}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {campaign.status === "active" && (
            <button
              type="button"
              onClick={() => handleStatus("paused")}
              disabled={actionLoading}
              className="rounded-lg border border-amber-500 text-amber-700 dark:text-amber-400 px-4 py-2 text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-50"
            >
              Pause
            </button>
          )}
          {campaign.status === "paused" && (
            <>
              <button
                type="button"
                onClick={() => handleStatus("active")}
                disabled={actionLoading}
                className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                Reprendre
              </button>
              <button
                type="button"
                onClick={() => handleStatus("completed")}
                disabled={actionLoading}
                className="rounded-lg border border-zinc-400 text-zinc-700 dark:text-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                Terminer
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={actionLoading}
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            Dupliquer
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Réponses</p>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {responsesCount} / {quota}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Trust moyen</p>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {trustAvg}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Récompense / réponse</p>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {campaign.rewardUser} €
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Total (mock)</p>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {campaign.total} €
            </p>
          </div>
        </div>

        {Object.keys(distribution).length > 0 && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              Distribution des réponses
            </h3>
            <ul className="space-y-2">
              {Object.entries(distribution).map(([answer, count]) => (
                <li key={answer} className="flex justify-between items-center">
                  <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[70%]">
                    {answer}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400 text-sm">
                    {count} ({quota ? Math.round((count / quota) * 100) : 0}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
            Verbatims (mock)
          </h3>
          {verbatims.length === 0 ? (
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Aucune réponse pour l’instant.</p>
          ) : (
            <ul className="space-y-3">
              {verbatims.map((r) => (
                <li
                  key={r.id}
                  className="flex justify-between gap-4 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                >
                  <p className="text-zinc-900 dark:text-zinc-100 flex-1">{r.answer}</p>
                  <span className="text-xs text-zinc-500 shrink-0">
                    Trust {r.trustLevel} · {new Date(r.at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
