"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  listPendingWithdrawals,
  listRecentWithdrawals,
  decideWithdrawal,
  type PendingWithdrawalRow,
  type RecentWithdrawalRow,
} from "@/src/lib/supabaseCampaigns";

type Tab = "pending" | "history";

export default function WithdrawalsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [pendingList, setPendingList] = useState<PendingWithdrawalRow[]>([]);
  const [historyList, setHistoryList] = useState<RecentWithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([listPendingWithdrawals(), listRecentWithdrawals()])
      .then(([pending, history]) => {
        setPendingList(pending);
        setHistoryList(history);
      })
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

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

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
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setTab("pending")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === "pending"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            En attente
          </button>
          <button
            type="button"
            onClick={() => setTab("history")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === "history"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            Historique
          </button>
        </div>

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
        ) : tab === "pending" ? (
          pendingList.length === 0 ? (
            <p className="text-zinc-500 dark:text-zinc-400 py-8">
              Aucun retrait en attente.
            </p>
          ) : (
            <ul className="space-y-3">
              {pendingList.map((w) => (
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
                      {formatDate(w.created_at)}
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
          )
        ) : historyList.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400 py-8">
            Aucun retrait dans l'historique.
          </p>
        ) : (
          <ul className="space-y-3">
            {historyList.map((w) => (
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
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                      w.status === "paid"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                    }`}
                  >
                    {w.status === "paid" ? "Payé" : "Refusé"}
                  </span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    {formatDate(w.created_at)}
                    {w.decided_at ? ` → ${formatDate(w.decided_at)}` : ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
