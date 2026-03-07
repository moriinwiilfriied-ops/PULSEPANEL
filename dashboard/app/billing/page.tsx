"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getOrgMembership,
  getOrgBalance,
  listOrgLedger,
  type OrgBalance,
  type OrgLedgerRow,
} from "@/src/lib/supabase";

const REASON_LABELS: Record<string, string> = {
  stripe_checkout: "Recharge Stripe",
  topup_dev: "Recharge (DEV)",
  campaign_prepaid: "Débit campagne",
};

function reasonToLabel(reason: string | null): string {
  if (!reason) return "—";
  return REASON_LABELS[reason] ?? reason;
}

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

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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
      .catch(() => setError("Impossible de charger la facturation."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <main className="mx-auto max-w-4xl px-6 py-8">
          <p className="text-zinc-500 dark:text-zinc-400 py-8">Chargement…</p>
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
          <p className="text-zinc-600 dark:text-zinc-400">Connectez-vous.</p>
        </main>
      </div>
    );
  }

  const availableCents = balance?.available_cents ?? 0;
  const spentCents = balance?.spent_cents ?? 0;

  const handleExportCsv = useCallback(() => {
    if (ledger.length === 0) {
      setToast("Rien à exporter.");
      return;
    }
    const header = "created_at,label,amount_eur,campaign_title_or_id";
    const rows = ledger.map((row) => {
      const label = reasonToLabel(row.reason);
      const amountEur = (row.amount_cents / 100).toFixed(2).replace(".", ",");
      const campaign = campaignDisplay(row);
      const escaped = (s: string) =>
        s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      return [formatDate(row.created_at), escaped(label), amountEur, escaped(campaign)].join(",");
    });
    const csv = [header, ...rows].join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    downloadBlob("facturation-transactions.csv", blob);
    setToast("Export CSV généré.");
    setTimeout(() => setToast(null), 3000);
  }, [ledger]);

  const handleExportJson = useCallback(() => {
    if (ledger.length === 0) {
      setToast("Rien à exporter.");
      return;
    }
    const json = JSON.stringify(ledger, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    downloadBlob("facturation-transactions.json", blob);
    setToast("Export JSON généré.");
    setTimeout(() => setToast(null), 3000);
  }, [ledger]);

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
            Aucune transaction.
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
                      {reasonToLabel(row.reason)}
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
