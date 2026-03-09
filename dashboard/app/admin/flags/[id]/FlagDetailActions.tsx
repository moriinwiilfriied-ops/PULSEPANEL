"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Actions
      </h2>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {activeAction === null && (
          <>
            <button
              type="button"
              onClick={() => setActiveAction("legit")}
              className="text-sm px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900"
            >
              Marquer légitime
            </button>
            <button
              type="button"
              onClick={() => setActiveAction("watch")}
              className="text-sm px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900"
            >
              Mettre sous surveillance
            </button>
            {userId && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveAction("freeze")}
                  className="text-sm px-3 py-1.5 rounded border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30"
                >
                  Geler les retraits du user
                </button>
                {userWithdrawalsFrozen && (
                  <button
                    type="button"
                    onClick={() => setActiveAction("unfreeze")}
                    className="text-sm px-3 py-1.5 rounded border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30"
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitReview(activeAction);
          }}
          className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-3"
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {activeAction === "legit" && "Marquer ce flag comme légitime."}
            {activeAction === "watch" && "Mettre ce user sous surveillance."}
            {activeAction === "freeze" && "Geler les retraits de ce user (motif obligatoire)."}
          </p>
          <label className="block text-sm">
            Note admin (obligatoire)
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              className="mt-1 block w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 p-2 text-sm"
              rows={2}
              required
            />
          </label>
          {activeAction === "freeze" && (
            <label className="block text-sm">
              Motif du gel (obligatoire)
              <input
                type="text"
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
                className="mt-1 block w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 p-2 text-sm"
                required
              />
            </label>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="text-sm px-3 py-1.5 rounded border border-zinc-600 bg-zinc-200 dark:bg-zinc-700 disabled:opacity-50"
            >
              {loading ? "…" : "Confirmer"}
            </button>
            <button
              type="button"
              onClick={() => { setActiveAction(null); setError(null); }}
              className="text-sm px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-600"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {activeAction === "unfreeze" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitUnfreeze();
          }}
          className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-3"
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Dégeler les retraits de ce user. Note admin obligatoire.
          </p>
          <label className="block text-sm">
            Note admin (obligatoire)
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              className="mt-1 block w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 p-2 text-sm"
              rows={2}
              required
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="text-sm px-3 py-1.5 rounded border border-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 disabled:opacity-50"
            >
              {loading ? "…" : "Dégeler"}
            </button>
            <button
              type="button"
              onClick={() => { setActiveAction(null); setError(null); }}
              className="text-sm px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-600"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
