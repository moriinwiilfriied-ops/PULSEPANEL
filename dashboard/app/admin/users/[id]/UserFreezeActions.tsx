"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dash } from "@/src/lib/dashboardTheme";
import { PanelCard } from "@/src/components/ui/PanelCard";

const inputClass = "mt-1 block w-full rounded-[var(--dash-radius)] border border-dash-border bg-dash-surface-2 px-3 py-2 text-sm text-dash-text placeholder:text-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent/30";
const labelClass = "block text-sm font-medium text-dash-text";

export function UserFreezeActions({
  userId,
  withdrawalsFrozen,
}: {
  userId: string;
  withdrawalsFrozen: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState<"freeze" | "unfreeze" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [freezeReason, setFreezeReason] = useState("");

  const submitFreeze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!adminNote.trim() || !freezeReason.trim()) {
      setError("Note admin et motif du gel obligatoires.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/freeze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freeze: true,
          reason: freezeReason.trim(),
          admin_note: adminNote.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erreur.");
        return;
      }
      router.refresh();
      setActive(null);
      setAdminNote("");
      setFreezeReason("");
    } finally {
      setLoading(false);
    }
  };

  const submitUnfreeze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!adminNote.trim()) {
      setError("Note admin obligatoire.");
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
        setError(data.error ?? "Erreur.");
        return;
      }
      router.refresh();
      setActive(null);
      setAdminNote("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h2 className={dash.sectionTitle}>Gel retraits</h2>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {active === null && (
        <div className="flex gap-2">
          {!withdrawalsFrozen && (
            <button
              type="button"
              onClick={() => setActive("freeze")}
              className={`${dash.btn} ${dash.btnDanger}`}
            >
              Geler les retraits
            </button>
          )}
          {withdrawalsFrozen && (
            <button
              type="button"
              onClick={() => setActive("unfreeze")}
              className={`${dash.btn} bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/25`}
            >
              Dégeler les retraits
            </button>
          )}
        </div>
      )}
      {active === "freeze" && (
        <PanelCard>
          <form onSubmit={submitFreeze} className="space-y-3">
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
              <button type="submit" disabled={loading} className={`${dash.btn} ${dash.btnDanger}`}>
                {loading ? "…" : "Geler"}
              </button>
              <button type="button" onClick={() => { setActive(null); setError(null); }} className={`${dash.btn} ${dash.btnSecondary}`}>
                Annuler
              </button>
            </div>
          </form>
        </PanelCard>
      )}
      {active === "unfreeze" && (
        <PanelCard>
          <form onSubmit={submitUnfreeze} className="space-y-3">
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
              <button type="submit" disabled={loading} className={`${dash.btn} bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/25`}>
                {loading ? "…" : "Dégeler"}
              </button>
              <button type="button" onClick={() => { setActive(null); setError(null); }} className={`${dash.btn} ${dash.btnSecondary}`}>
                Annuler
              </button>
            </div>
          </form>
        </PanelCard>
      )}
    </div>
  );
}
