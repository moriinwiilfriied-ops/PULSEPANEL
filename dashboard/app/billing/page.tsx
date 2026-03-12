"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getOrgMembership,
  getOrgBalance,
  listOrgLedger,
  type OrgBalance,
  type OrgLedgerRow,
} from "@/src/lib/supabase";
import { getLedgerReasonLabel } from "@/src/lib/ledgerReasonLabels";
import { common, billing as copy } from "@/src/lib/uiCopy";
import { dash } from "@/src/lib/dashboardTheme";
import { MetricCard } from "@/src/components/ui/MetricCard";
import { PanelCard } from "@/src/components/ui/PanelCard";

function formatEuros(cents: number): string {
  const value = Math.abs(cents) / 100;
  const formatted = value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return cents >= 0 ? `+${formatted} €` : `-${formatted} €`;
}

function truncateId(id: string | null): string {
  if (!id) return "—";
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function formatDate(createdAt: string): string {
  return new Date(createdAt).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function campaignDisplay(row: OrgLedgerRow): string {
  const title = row.campaign_title?.trim();
  if (title) return title;
  if (row.campaign_id) return truncateId(row.campaign_id);
  return "—";
}

function addUtf8Bom(s: string): string {
  return "\uFEFF" + s;
}

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(
  rows: Array<Record<string, string | number | null | undefined>>,
  headers: string[]
): string {
  const headerLine = headers.map((h) => csvEscape(h)).join(",");
  const dataLines = rows.map((row) =>
    headers.map((h) => csvEscape(row[h])).join(",")
  );
  return [headerLine, ...dataLines].join("\r\n");
}

function downloadTextFile(filename: string, mime: string, content: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const CSV_HEADERS = ["created_at", "label", "amount_eur", "campaign_title_or_id"] as const;

export default function BillingPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [balance, setBalance] = useState<OrgBalance | null>(null);
  const [ledger, setLedger] = useState<OrgLedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setLoading(true);
    getOrgMembership()
      .then((m) => {
        const id = m?.orgId ?? null;
        setOrgId(id);
        if (!id) {
          setBalance(null);
          setLedger([]);
          setLoading(false);
          return;
        }
        return Promise.all([
          getOrgBalance(id),
          listOrgLedger(id, 100),
        ]).then(([bal, ledgerRes]) => {
          setBalance(bal ?? null);
          if (ledgerRes.error) {
            setError(ledgerRes.error);
            setLedger([]);
          } else {
            setLedger(ledgerRes.data ?? []);
          }
        });
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
    getOrgMembership()
      .then((m) => {
        if (cancelled) return null;
        const id = m?.orgId ?? null;
        setOrgId(id);
        if (!id) {
          setBalance(null);
          setLedger([]);
          return null;
        }
        return Promise.all([
          getOrgBalance(id),
          listOrgLedger(id, 100),
        ]).then(([bal, ledgerRes]) => {
          if (cancelled) return;
          setBalance(bal ?? null);
          if (ledgerRes.error) {
            setError(ledgerRes.error);
            setLedger([]);
          } else {
            setLedger(ledgerRes.data ?? []);
          }
        });
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

  const handleExportCsv = useCallback(() => {
    if (ledger.length === 0) {
      setToast(copy.toastNoExport);
      return;
    }
    const rows: Array<Record<string, string | number | null | undefined>> = ledger.map((row) => ({
      created_at: formatDate(row.created_at),
      label: getLedgerReasonLabel(row.reason),
      amount_eur: (row.amount_cents / 100).toFixed(2).replace(".", ","),
      campaign_title_or_id: campaignDisplay(row),
    }));
    const csv = toCsv(rows, [...CSV_HEADERS]);
    downloadTextFile("facturation-transactions.csv", "text/csv;charset=utf-8", addUtf8Bom(csv));
    setToast(copy.toastCsvDone);
  }, [ledger]);

  const handleExportJson = useCallback(() => {
    if (ledger.length === 0) {
      setToast(copy.toastNoExport);
      return;
    }
    const json = JSON.stringify(ledger, null, 2);
    downloadTextFile("facturation-transactions.json", "application/json", json);
    setToast(copy.toastJsonDone);
  }, [ledger]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const availableCents = balance?.available_cents ?? 0;
  const spentCents = balance?.spent_cents ?? 0;

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

        {/* Early exits: loading, error, no org */}
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
        ) : !orgId ? (
          <PanelCard className="py-12 px-6 text-center border border-dash-border-subtle/50">
            <p className="text-dash-text font-medium mb-1">{copy.noOrg}</p>
            <p className="text-sm text-dash-text-muted">Rechargez la page ou sélectionnez une organisation depuis le sélecteur.</p>
          </PanelCard>
        ) : (
          <>
            {/* 2. Synthèse : crédit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <MetricCard
                label={copy.metricCredit}
                value={`${(availableCents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
              />
              <MetricCard
                label={copy.metricSpent}
                value={`${(spentCents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
              />
            </div>

            {/* 3. Historique des transactions */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
              <h2 className={dash.sectionTitle}>{copy.sectionTransactions}</h2>
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleExportCsv} className={`rounded-lg ${dash.btn} ${dash.btnSecondary} py-1.5 px-3 text-sm`}>
                  {copy.exportCsv}
                </button>
                <button type="button" onClick={handleExportJson} className={`rounded-lg ${dash.btn} ${dash.btnSecondary} py-1.5 px-3 text-sm`}>
                  {copy.exportJson}
                </button>
              </div>
            </div>
            {toast && <p className="text-sm text-dash-text-secondary mb-3" role="status">{toast}</p>}
            {ledger.length === 0 ? (
              <PanelCard className="py-12 px-6 text-center border border-dash-border-subtle/50">
                <p className="text-dash-text font-medium mb-1">{copy.emptyLedger}</p>
                <p className="text-sm text-dash-text-muted">{copy.subtitle}</p>
              </PanelCard>
            ) : (
              <PanelCard className="p-0 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-dash-border-subtle">
                      <th className="px-4 py-3 font-medium text-dash-text-muted">Date</th>
                      <th className="px-4 py-3 font-medium text-dash-text-muted">Raison</th>
                      <th className="px-4 py-3 font-medium text-dash-text-muted text-right">Montant</th>
                      <th className="px-4 py-3 font-medium text-dash-text-muted">Campagne</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((row, i) => (
                      <tr key={`${row.created_at}-${i}`} className="border-b border-dash-border-subtle last:border-0">
                        <td className="px-4 py-3 text-dash-text-secondary">{formatDate(row.created_at)}</td>
                        <td className="px-4 py-3 text-dash-text-secondary">{getLedgerReasonLabel(row.reason)}</td>
                        <td className={`px-4 py-3 text-right font-semibold tabular-nums ${row.amount_cents > 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {formatEuros(row.amount_cents)}
                        </td>
                        <td className="px-4 py-3 text-dash-text-muted max-w-[200px] truncate" title={row.campaign_title ?? row.campaign_id ?? undefined}>
                          {campaignDisplay(row)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </PanelCard>
            )}
          </>
        )}
      </div>
    </div>
  );
}
