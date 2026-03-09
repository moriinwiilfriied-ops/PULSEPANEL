"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Gel retraits
      </h2>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {active === null && (
        <div className="flex gap-2">
          {!withdrawalsFrozen && (
            <button
              type="button"
              onClick={() => setActive("freeze")}
              className="text-sm px-3 py-1.5 rounded border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30"
            >
              Geler les retraits
            </button>
          )}
          {withdrawalsFrozen && (
            <button
              type="button"
              onClick={() => setActive("unfreeze")}
              className="text-sm px-3 py-1.5 rounded border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30"
            >
              Dégeler les retraits
            </button>
          )}
        </div>
      )}
      {active === "freeze" && (
        <form onSubmit={submitFreeze} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
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
            <button type="submit" disabled={loading} className="text-sm px-3 py-1.5 rounded border border-red-600 bg-red-100 dark:bg-red-900/40 disabled:opacity-50">
              {loading ? "…" : "Geler"}
            </button>
            <button type="button" onClick={() => { setActive(null); setError(null); }} className="text-sm px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-600">
              Annuler
            </button>
          </div>
        </form>
      )}
      {active === "unfreeze" && (
        <form onSubmit={submitUnfreeze} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
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
            <button type="submit" disabled={loading} className="text-sm px-3 py-1.5 rounded border border-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 disabled:opacity-50">
              {loading ? "…" : "Dégeler"}
            </button>
            <button type="button" onClick={() => { setActive(null); setError(null); }} className="text-sm px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-600">
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
