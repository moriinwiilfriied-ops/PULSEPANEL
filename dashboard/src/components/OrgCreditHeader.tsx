"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getOrgMembership, getOrgBalance, orgTopupDev } from "@/src/lib/supabase";
import { supabase } from "@/src/lib/supabase";

const QUICK_AMOUNTS_CENTS = [1000, 5000, 20000];

export function OrgCreditHeader() {
  const [membership, setMembership] = useState<{ orgId: string; role: string } | null>(null);
  const [availableCents, setAvailableCents] = useState<number | null>(null);
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState("10");
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupError, setTopupError] = useState<string | null>(null);
  const [stripeLoading, setStripeLoading] = useState<number | null>(null);

  const orgId = membership?.orgId ?? null;
  const isDev = process.env.NODE_ENV === "development";

  const loadBalance = async () => {
    const m = await getOrgMembership();
    setMembership(m ?? null);
    if (m?.orgId) {
      const balance = await getOrgBalance(m.orgId);
      setAvailableCents(balance ? balance.available_cents : null);
    } else {
      setAvailableCents(null);
    }
  };

  useEffect(() => {
    loadBalance();
  }, []);

  const handleStripeCheckout = async (amountCents: number) => {
    if (!orgId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setTopupError("Connectez-vous pour recharger.");
      return;
    }
    setStripeLoading(amountCents);
    setTopupError(null);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orgId, amountCents }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setTopupError(data.error ?? "Erreur lors du paiement.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setTopupError("Réponse invalide.");
    } catch {
      setTopupError("Erreur réseau.");
    } finally {
      setStripeLoading(null);
    }
  };

  const handleTopupDev = async () => {
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
              {isDev && membership && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500 truncate max-w-[120px]" title={`${orgId} (${membership.role})`}>
                  {orgId.slice(0, 8)}… {membership.role}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setTopupOpen(true);
                  setTopupError(null);
                }}
                className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-emerald-700"
              >
                Recharger
              </button>
              {isDev && (
                <button
                  type="button"
                  onClick={() => {
                    setTopupOpen(true);
                    setTopupError(null);
                    setTopupAmount("10");
                  }}
                  className="rounded-lg border border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 text-sm font-medium text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                >
                  Recharger (DEV)
                </button>
              )}
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
          aria-label="Recharger le compte"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl p-6 mx-4 max-w-sm w-full border border-zinc-200 dark:border-zinc-700">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Recharger
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
              Montants rapides (paiement Stripe)
            </p>
            <div className="flex gap-2 mb-4">
              {QUICK_AMOUNTS_CENTS.map((cents) => (
                <button
                  key={cents}
                  type="button"
                  onClick={() => handleStripeCheckout(cents)}
                  disabled={stripeLoading !== null}
                  className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50"
                >
                  {stripeLoading === cents ? "…" : `${cents / 100} €`}
                </button>
              ))}
            </div>
            {topupError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                {topupError}
              </p>
            )}
            {isDev && (
              <>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-2 border-t border-zinc-200 dark:border-zinc-700 pt-3 mt-3">
                  DEV : recharge directe (sans Stripe)
                </p>
                <input
                  type="text"
                  inputMode="decimal"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  placeholder="10,00"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-zinc-100 mb-2"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleTopupDev}
                    disabled={topupLoading}
                    className="rounded-lg bg-amber-600 text-white px-4 py-2 text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
                  >
                    {topupLoading ? "…" : "Recharger (DEV)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTopupOpen(false);
                      setTopupError(null);
                    }}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Fermer
                  </button>
                </div>
              </>
            )}
            {!isDev && (
              <button
                type="button"
                onClick={() => {
                  setTopupOpen(false);
                  setTopupError(null);
                }}
                className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Fermer
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
