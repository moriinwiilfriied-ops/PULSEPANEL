"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CampaignStatusActions({
  campaignId,
  currentStatus,
}: {
  campaignId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [active, setActive] = useState<"pause" | "resume" | "complete" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStatus = async (status: "paused" | "active" | "completed") => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erreur.");
        return;
      }
      router.refresh();
      setActive(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Changer le statut
      </h2>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {currentStatus === "active" && (
          <>
            <button
              type="button"
              onClick={() => setActive("pause")}
              className="text-sm px-3 py-1.5 rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30"
            >
              Mettre en pause
            </button>
            <button
              type="button"
              onClick={() => setActive("complete")}
              className="text-sm px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-600"
            >
              Terminer
            </button>
          </>
        )}
        {currentStatus === "paused" && (
          <>
            <button
              type="button"
              onClick={() => setActive("resume")}
              className="text-sm px-3 py-1.5 rounded border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30"
            >
              Reprendre
            </button>
            <button
              type="button"
              onClick={() => setActive("complete")}
              className="text-sm px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-600"
            >
              Terminer
            </button>
          </>
        )}
        {currentStatus === "completed" && (
          <button
            type="button"
            onClick={() => setActive("resume")}
            className="text-sm px-3 py-1.5 rounded border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30"
          >
            Reprendre (réactiver)
          </button>
        )}
      </div>

      {active === "pause" && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Mettre cette campagne en pause. Les réponses ne seront plus acceptées.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatus("paused")}
              disabled={loading}
              className="text-sm px-3 py-1.5 rounded border border-amber-600 bg-amber-100 dark:bg-amber-900/40 disabled:opacity-50"
            >
              {loading ? "…" : "Confirmer pause"}
            </button>
            <button type="button" onClick={() => { setActive(null); setError(null); }} className="text-sm px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-600">
              Annuler
            </button>
          </div>
        </div>
      )}
      {active === "resume" && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Reprendre la campagne (statut actif). Le billing existant reste inchangé.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatus("active")}
              disabled={loading}
              className="text-sm px-3 py-1.5 rounded border border-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 disabled:opacity-50"
            >
              {loading ? "…" : "Confirmer reprise"}
            </button>
            <button type="button" onClick={() => { setActive(null); setError(null); }} className="text-sm px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-600">
              Annuler
            </button>
          </div>
        </div>
      )}
      {active === "complete" && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Marquer la campagne comme terminée. Les réponses ne seront plus acceptées.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatus("completed")}
              disabled={loading}
              className="text-sm px-3 py-1.5 rounded border border-zinc-600 bg-zinc-200 dark:bg-zinc-700 disabled:opacity-50"
            >
              {loading ? "…" : "Confirmer terminer"}
            </button>
            <button type="button" onClick={() => { setActive(null); setError(null); }} className="text-sm px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-600">
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
