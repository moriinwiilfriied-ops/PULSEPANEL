"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listPendingWithdrawals,
  listRecentWithdrawals,
  decideWithdrawal,
  type PendingWithdrawalRow,
  type RecentWithdrawalRow,
} from "@/src/lib/supabaseCampaigns";
import { common, withdrawals as copy } from "@/src/lib/uiCopy";
import { dash } from "@/src/lib/dashboardTheme";
import { PanelCard } from "@/src/components/ui/PanelCard";
import { MetricCard } from "@/src/components/ui/MetricCard";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

type Tab = "pending" | "history";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`;
}

function truncateUserId(uid: string): string {
  return uid.length > 12 ? `${uid.slice(0, 6)}…${uid.slice(-4)}` : uid;
}

export default function WithdrawalsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [pendingList, setPendingList] = useState<PendingWithdrawalRow[]>([]);
  const [historyList, setHistoryList] = useState<RecentWithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(() => {
    setError(null);
    setLoading(true);
    Promise.all([listPendingWithdrawals(), listRecentWithdrawals()])
      .then(([pending, history]) => {
        setPendingList(pending);
        setHistoryList(history);
      })
      .catch(() => setError(copy.loadError))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
    });
    Promise.all([listPendingWithdrawals(), listRecentWithdrawals()])
      .then(([pending, history]) => {
        if (!cancelled) {
          setPendingList(pending);
          setHistoryList(history);
        }
      })
      .catch(() => {
        if (!cancelled) setError(copy.loadError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        text: decision === "paid" ? copy.successPaid : copy.successRejected,
      });
      load();
    },
    [load]
  );

  return (
    <div className={dash.page}>
      <div className={dash.container}>
        {/* 1. Header */}
        <header className={dash.hero + " mb-8 border border-dash-border-subtle/50"}>
          <h1 className={dash.headlineHero}>{copy.title}</h1>
          <p className="text-dash-text-secondary mt-2 max-w-2xl text-base">
            {copy.subtitle}
          </p>
        </header>

        {/* 2. Synthèse : métriques réelles */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <MetricCard label={copy.metricPending} value={String(pendingList.length)} />
            <MetricCard label={copy.metricHistory} value={String(historyList.length)} />
          </div>
        )}

        {/* 3. Onglets */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-dash-text-muted uppercase tracking-wider mr-1">{copy.segmentLabel}</span>
          {([{ value: "pending" as const, label: copy.tabPending }, { value: "history" as const, label: copy.tabHistory }] as const).map(
            ({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === value
                    ? "bg-dash-surface-2 text-dash-text shadow-[var(--dash-shadow-sm)]"
                    : "text-dash-text-muted hover:bg-dash-surface-2/70 hover:text-dash-text-secondary"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>

        {/* Message succès / erreur action */}
        {message && (
          <PanelCard
            className={`mb-6 ${message.type === "success" ? "bg-emerald-950/20 border border-emerald-500/20" : "bg-red-950/20 border border-red-500/20"}`}
          >
            <p className={`text-sm ${message.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
              {message.text}
            </p>
          </PanelCard>
        )}

        {/* 4. Corps : loading / error / empty / liste */}
        {loading ? (
          <div className={`${dash.card} p-8 text-center`}>
            <p className="text-dash-text-muted">{common.loading}</p>
          </div>
        ) : error ? (
          <PanelCard className="py-12 px-6 text-center border border-dash-border-subtle/50">
            <p className="text-dash-text font-medium mb-1">{common.errorTitle}</p>
            <p className="text-sm text-dash-text-muted mb-6">{error}</p>
            <button type="button" onClick={load} className={`rounded-lg ${dash.btn} ${dash.btnSecondary} px-5 py-2.5`}>
              {copy.retry}
            </button>
          </PanelCard>
        ) : tab === "pending" ? (
          pendingList.length === 0 ? (
            <PanelCard className="py-12 px-6 text-center border border-dash-border-subtle/50">
              <p className="text-dash-text font-medium mb-1">{copy.emptyPending}</p>
              <p className="text-sm text-dash-text-muted">{copy.subtitle}</p>
            </PanelCard>
          ) : (
            <ul className="space-y-1">
              {pendingList.map((w) => (
                <li key={w.id}>
                  <div className={`${dash.card} ${dash.cardHover} grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 sm:gap-4 items-center p-4`}>
                    <div className="min-w-0">
                      <p className="font-mono text-sm text-dash-text-muted">{truncateUserId(w.user_id)}</p>
                      <p className="text-xs text-dash-text-muted mt-0.5">{formatDate(w.created_at)}</p>
                    </div>
                    <p className="text-lg font-semibold text-dash-text tabular-nums">{formatAmount(w.amount_cents)}</p>
                    <span className="flex items-center">
                      <StatusBadge variant="warning">{copy.tabPending}</StatusBadge>
                    </span>
                    <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleDecide(w.id, "paid")}
                        disabled={actionId !== null}
                        className={`rounded-lg ${dash.btn} bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-sm`}
                      >
                        {actionId === w.id ? "…" : copy.markPaid}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecide(w.id, "rejected")}
                        disabled={actionId !== null}
                        className={`rounded-lg ${dash.btn} ${dash.btnDanger}`}
                      >
                        {copy.reject}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : historyList.length === 0 ? (
          <PanelCard className="py-12 px-6 text-center border border-dash-border-subtle/50">
            <p className="text-dash-text font-medium mb-1">{copy.emptyHistory}</p>
            <p className="text-sm text-dash-text-muted">{copy.subtitle}</p>
          </PanelCard>
        ) : (
          <ul className="space-y-1">
            {historyList.map((w) => (
              <li key={w.id}>
                <div className={`${dash.card} ${dash.cardHover} grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 sm:gap-4 items-center p-4`}>
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-dash-text-muted">{truncateUserId(w.user_id)}</p>
                    <p className="text-xs text-dash-text-muted mt-0.5">
                      {formatDate(w.created_at)}
                      {w.decided_at ? ` → ${formatDate(w.decided_at)}` : ""}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-dash-text tabular-nums">{formatAmount(w.amount_cents)}</p>
                  <StatusBadge variant={w.status === "paid" ? "success" : "danger"}>
                    {w.status === "paid" ? copy.statusPaid : copy.statusRejected}
                  </StatusBadge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
