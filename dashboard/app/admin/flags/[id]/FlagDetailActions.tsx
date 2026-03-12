"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dash } from "@/src/lib/dashboardTheme";
import { PanelCard } from "@/src/components/ui/PanelCard";

const inputClass = "mt-1 block w-full rounded-[var(--dash-radius)] border border-dash-border bg-dash-surface-2 px-3 py-2 text-sm text-dash-text placeholder:text-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent/30";
const labelClass = "block text-sm font-medium text-dash-text";

export function FlagDetailActions({
  flagId,
  userId,
  userWithdrawalsFrozen,
}: {
  flagId: string;
  userId: string | null;
  userWithdrawalsFrozen: boolean;
}) {
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [freezeReason, setFreezeReason] = useState("");

  const submitReview = async (action: string, extra: Record<string, string> = {}) => {
    setError(null);
    if (!adminNote.trim()) {
      setError("Note admin obligatoire.");
      return;
    }
    if (action === "freeze" && !freezeReason.trim()) {
      setError("Motif du gel obligatoire.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/flags/${flagId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          admin_note: adminNote.trim(),
          ...(action === "freeze" ? { withdrawals_frozen_reason: freezeReason.trim() } : {}),
          ...extra,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erreur.");
        return;
      }
      router.refresh();
      setActiveAction(null);
      setAdminNote("");
      setFreezeReason("");
    } finally {
      setLoading(false);
    }
  };

  const submitUnfreeze = async () => {
    if (!userId) return;
    setError(null);
    if (!adminNote.trim()) {
      setError("Note admin obligatoire pour dégeler.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/freeze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freeze: false, admin_note: adminNote.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erreur dégel.");
        return;
      }
      router.refresh();
      setActiveAction(null);
      setAdminNote("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className={dash.sectionTitle}>Actions</h2>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {activeAction === null && (
          <>
            <button
              type="button"
              onClick={() => setActiveAction("legit")}
              className={`${dash.btn} ${dash.btnSecondary}`}
            >
              Marquer légitime
            </button>
            <button
              type="button"
              onClick={() => setActiveAction("watch")}
              className={`${dash.btn} ${dash.btnSecondary}`}
            >
              Mettre sous surveillance
            </button>
            {userId && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveAction("freeze")}
                  className={`${dash.btn} ${dash.btnDanger}`}
                >
                  Geler les retraits du user
                </button>
                {userWithdrawalsFrozen && (
                  <button
                    type="button"
                    onClick={() => setActiveAction("unfreeze")}
                    className={`${dash.btn} bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/25`}
                  >
                    Dégeler les retraits
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>

      {activeAction && activeAction !== "unfreeze" && (
        <PanelCard>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitReview(activeAction);
            }}
            className="space-y-3"
          >
            <p className="text-sm text-dash-text-secondary">
              {activeAction === "legit" && "Marquer ce flag comme légitime."}
              {activeAction === "watch" && "Mettre ce user sous surveillance."}
              {activeAction === "freeze" && "Geler les retraits de ce user (motif obligatoire)."}
            </p>
            <label className={labelClass}>
              Note admin (obligatoire)
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className={inputClass}
                rows={2}
                required
              />
            </label>
            {activeAction === "freeze" && (
              <label className={labelClass}>
                Motif du gel (obligatoire)
                <input
                  type="text"
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  className={inputClass}
                  required
                />
              </label>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className={`${dash.btn} ${dash.btnSecondary}`}
              >
                {loading ? "…" : "Confirmer"}
              </button>
              <button
                type="button"
                onClick={() => { setActiveAction(null); setError(null); }}
                className={`${dash.btn} ${dash.btnGhost}`}
              >
                Annuler
              </button>
            </div>
          </form>
        </PanelCard>
      )}

      {activeAction === "unfreeze" && (
        <PanelCard>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitUnfreeze();
            }}
            className="space-y-3"
          >
            <p className="text-sm text-dash-text-secondary">
              Dégeler les retraits de ce user. Note admin obligatoire.
            </p>
            <label className={labelClass}>
              Note admin (obligatoire)
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className={inputClass}
                rows={2}
                required
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className={`${dash.btn} bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/25`}
              >
                {loading ? "…" : "Dégeler"}
              </button>
              <button
                type="button"
                onClick={() => { setActiveAction(null); setError(null); }}
                className={`${dash.btn} ${dash.btnGhost}`}
              >
                Annuler
              </button>
            </div>
          </form>
        </PanelCard>
      )}
    </div>
  );
}
