"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getOrgMembership,
  getOrgBalance,
  listOrgLedger,
  type OrgBalance,
  type OrgLedgerRow,
} from "@/src/lib/supabase";
import { getLedgerReasonLabel } from "@/src/lib/ledgerReasonLabels";
import { common, billing as copy } from "@/src/lib/uiCopy";

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

  useEffect(() => {
    setLoading(true);
    setError(null);
    getOrgMembership()
      .then((m) => {
        const id = m?.orgId ?? null;
        setOrgId(id);
        if (!id) {
          setBalance(null);
          setLedger([]);
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

  const handleExportCsv = useCallback(() => {
    if (ledger.length === 0) {
      setToast("Rien à exporter.");
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
    setToast("Export CSV généré.");
  }, [ledger]);

  const handleExportJson = useCallback(() => {
    if (ledger.length === 0) {
      setToast("Rien à exporter.");
      return;
    }
    const json = JSON.stringify(ledger, null, 2);
    downloadTextFile("facturation-transactions.json", "application/json", json);
    setToast("Export JSON généré.");
  }, [ledger]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  /* Hooks must stay above conditional returns */

  const availableCents = balance?.available_cents ?? 0;
  const spentCents = balance?.spent_cents ?? 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <main className="mx-auto max-w-4xl px-6 py-8">
          <p className="text-zinc-500 dark:text-zinc-400 py-8">{common.loading}</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <main className="mx-auto max-w-4xl px-6 py-8">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </main>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <main className="mx-auto max-w-4xl px-6 py-8">
          <p className="text-zinc-600 dark:text-zinc-400">{common.connectRequired}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
          Facturation
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Crédit dispo</p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
              {(availableCents / 100).toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              €
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Dépensé</p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
              {(spentCents / 100).toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              €
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Transactions
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Exporter CSV
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Exporter JSON
            </button>
          </div>
        </div>
        {toast && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3" role="status">
            {toast}
          </p>
        )}
        {ledger.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400 py-4">
            {copy.emptyLedger}
          </p>
        ) : (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                    Date
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                    Raison
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400 text-right">
                    Montant
                  </th>
                  <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">
                    Campagne
                  </th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row, i) => (
                  <tr
                    key={`${row.created_at}-${i}`}
                    className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                  >
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {getLedgerReasonLabel(row.reason)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        row.amount_cents > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {formatEuros(row.amount_cents)}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 max-w-[200px] truncate" title={row.campaign_title ?? row.campaign_id ?? undefined}>
                      {campaignDisplay(row)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
