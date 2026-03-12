"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dash } from "@/src/lib/dashboardTheme";
import { PanelCard } from "@/src/components/ui/PanelCard";

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
      <h2 className={dash.sectionTitle}>Changer le statut</h2>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {currentStatus === "active" && (
          <>
            <button
              type="button"
              onClick={() => setActive("pause")}
              className={`${dash.btn} ${dash.btnWarning}`}
            >
              Mettre en pause
            </button>
            <button
              type="button"
              onClick={() => setActive("complete")}
              className={`${dash.btn} ${dash.btnSecondary}`}
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
              className={`${dash.btn} bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/25`}
            >
              Reprendre
            </button>
            <button
              type="button"
              onClick={() => setActive("complete")}
              className={`${dash.btn} ${dash.btnSecondary}`}
            >
              Terminer
            </button>
          </>
        )}
        {currentStatus === "completed" && (
          <button
            type="button"
            onClick={() => setActive("resume")}
            className={`${dash.btn} bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/25`}
          >
            Reprendre (réactiver)
          </button>
        )}
      </div>

      {active === "pause" && (
        <PanelCard className="space-y-2">
          <p className="text-sm text-dash-text-secondary">
            Mettre cette campagne en pause. Les réponses ne seront plus acceptées.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatus("paused")}
              disabled={loading}
              className={`${dash.btn} ${dash.btnWarning}`}
            >
              {loading ? "…" : "Confirmer pause"}
            </button>
            <button type="button" onClick={() => { setActive(null); setError(null); }} className={`${dash.btn} ${dash.btnSecondary}`}>
              Annuler
            </button>
          </div>
        </PanelCard>
      )}
      {active === "resume" && (
        <PanelCard className="space-y-2">
          <p className="text-sm text-dash-text-secondary">
            Reprendre la campagne (statut actif). Le billing existant reste inchangé.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatus("active")}
              disabled={loading}
              className={`${dash.btn} bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/25`}
            >
              {loading ? "…" : "Confirmer reprise"}
            </button>
            <button type="button" onClick={() => { setActive(null); setError(null); }} className={`${dash.btn} ${dash.btnSecondary}`}>
              Annuler
            </button>
          </div>
        </PanelCard>
      )}
      {active === "complete" && (
        <PanelCard className="space-y-2">
          <p className="text-sm text-dash-text-secondary">
            Marquer la campagne comme terminée. Les réponses ne seront plus acceptées.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatus("completed")}
              disabled={loading}
              className={`${dash.btn} ${dash.btnSecondary}`}
            >
              {loading ? "…" : "Confirmer terminer"}
            </button>
            <button type="button" onClick={() => { setActive(null); setError(null); }} className={`${dash.btn} ${dash.btnGhost}`}>
              Annuler
            </button>
          </div>
        </PanelCard>
      )}
    </div>
  );
}
