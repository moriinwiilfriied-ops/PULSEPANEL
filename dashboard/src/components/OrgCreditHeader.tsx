"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentOrgId, getOrgBalance, orgTopupDev } from "@/src/lib/supabase";

export function OrgCreditHeader() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [availableCents, setAvailableCents] = useState<number | null>(null);
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState("10");
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupError, setTopupError] = useState<string | null>(null);

  const loadBalance = async () => {
    const id = await getCurrentOrgId();
    setOrgId(id ?? null);
    if (id) {
      const balance = await getOrgBalance(id);
      setAvailableCents(balance ? balance.available_cents : null);
    } else {
      setAvailableCents(null);
    }
  };

  useEffect(() => {
    loadBalance();
  }, []);

  const handleTopup = async () => {
    if (!orgId) return;
    const euros = parseFloat(topupAmount.replace(",", "."));
    if (Number.isNaN(euros) || euros <= 0) {
      setTopupError("Montant invalide");
      return;
    }
    const amountCents = Math.round(euros * 100);
    setTopupLoading(true);
    setTopupError(null);
    const result = await orgTopupDev(orgId, amountCents);
    setTopupLoading(false);
    if (result.ok) {
      setAvailableCents(result.available_cents);
      setTopupOpen(false);
      setTopupAmount("10");
    } else {
      setTopupError(result.error);
    }
  };

  const creditLabel =
    availableCents !== null
      ? `Crédit: ${(availableCents / 100).toFixed(2)} €`
      : "Crédit: —";

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <Link
          href="/"
          className="text-xl font-semibold text-zinc-900 dark:text-zinc-100"
        >
          PulsePanel
        </Link>
        <div className="flex items-center gap-4">
          {orgId && (
            <>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {creditLabel}
              </span>
              <button
                type="button"
                onClick={() => {
                  setTopupOpen(true);
                  setTopupError(null);
                }}
                className="rounded-lg border border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 text-sm font-medium text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
              >
                Recharger (DEV)
              </button>
            </>
          )}
          <nav className="flex items-center gap-4">
            <Link
              href="/withdrawals"
              className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
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
      </div>

      {topupOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label="Recharger le compte (DEV)"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl p-6 mx-4 max-w-sm w-full border border-zinc-200 dark:border-zinc-700">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Recharger (DEV)
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Montant en euros (ex: 10,00)
            </p>
            <input
              type="text"
              inputMode="decimal"
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              placeholder="10,00"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-zinc-100 mb-3"
            />
            {topupError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                {topupError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTopup}
                disabled={topupLoading}
                className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-50"
              >
                {topupLoading ? "…" : "Recharger"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTopupOpen(false);
                  setTopupError(null);
                }}
                className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
