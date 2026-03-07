"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  listPendingWithdrawals,
  decideWithdrawal,
  type PendingWithdrawalRow,
} from "@/src/lib/supabaseCampaigns";

export default function WithdrawalsPage() {
  const [list, setList] = useState<PendingWithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listPendingWithdrawals()
      .then(setList)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDecide = useCallback(
    async (id: string, decision: "paid" | "rejected") => {
      setActionId(id);
      setMessage(null);
      const result = await decideWithdrawal(id, decision);
      setActionId(null);
      if (result.error) {
        setMessage({ type: "error", text: result.error.message });
        return;
      }
      setMessage({
        type: "success",
        text:
          decision === "paid"
            ? "Retrait marqué comme payé."
            : "Retrait refusé. Le montant a été remboursé.",
      });
      load();
    },
    [load]
  );

  const truncateUserId = (uid: string) =>
    uid.length > 12 ? `${uid.slice(0, 6)}…${uid.slice(-4)}` : uid;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            PulsePanel
          </h1>
          <nav className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Campagnes
            </Link>
            <Link
              href="/withdrawals"
              className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              Retraits
            </Link>
            <Link
              href="/campaigns/new"
              className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90"
            >
              Créer une campagne
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <h2 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-4">
          Retraits en attente
        </h2>

        {message && (
          <div
            className={`mb-4 rounded-lg px-4 py-3 text-sm ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                : "bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <p className="text-zinc-500 dark:text-zinc-400 py-8">Chargement…</p>
        ) : list.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400 py-8">
            Aucun retrait en attente.
          </p>
        ) : (
          <ul className="space-y-3">
            {list.map((w) => (
              <li
                key={w.id}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex flex-wrap items-center gap-4">
                  <span className="font-mono text-sm text-zinc-500 dark:text-zinc-400">
                    {truncateUserId(w.user_id)}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {(w.amount_cents / 100).toFixed(2)} €
                  </span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    {new Date(w.created_at).toLocaleString("fr-FR")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDecide(w.id, "paid")}
                    disabled={actionId !== null}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {actionId === w.id ? "…" : "Payer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecide(w.id, "rejected")}
                    disabled={actionId !== null}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Refuser
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
