"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { getOrgMembership, getOrgBalance, orgTopupDev } from "@/src/lib/supabase";
import { supabase } from "@/src/lib/supabase";
import { dash } from "@/src/lib/dashboardTheme";

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
      ? `${(availableCents / 100).toFixed(2)} €`
      : "—";

  const closeTopup = useCallback(() => {
    setTopupOpen(false);
    setTopupError(null);
  }, []);

  useEffect(() => {
    if (!topupOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTopup();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [topupOpen, closeTopup]);

  const topupModal = topupOpen && typeof document !== "undefined" && (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Recharger le compte"
      onClick={(e) => e.target === e.currentTarget && closeTopup()}
    >
      <div
        className="rounded-2xl bg-dash-surface-2 p-6 max-w-sm w-full shadow-[var(--dash-shadow)] border border-dash-border-subtle"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-dash-text mb-1">
          Recharger
        </h3>
        <p className="text-sm text-dash-text-secondary mb-4">
          Montants rapides (paiement Stripe)
        </p>
        <div className="flex gap-2 mb-4">
          {QUICK_AMOUNTS_CENTS.map((cents) => (
            <button
              key={cents}
              type="button"
              onClick={() => handleStripeCheckout(cents)}
              disabled={stripeLoading !== null}
              className="flex-1 rounded-md bg-dash-surface-3 py-2 text-sm font-medium text-dash-text hover:bg-dash-surface-2/80 disabled:opacity-50 transition-colors"
            >
              {stripeLoading === cents ? "…" : `${cents / 100} €`}
            </button>
          ))}
        </div>
        {topupError && (
          <p className="text-sm text-red-400 mb-3">{topupError}</p>
        )}
        {isDev && (
          <>
            <p className="text-[10px] text-dash-text-muted/90 pt-3 mt-3 mb-2">
              DEV : recharge directe (sans Stripe)
            </p>
            <input
              type="text"
              inputMode="decimal"
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              placeholder="10,00"
              className="w-full rounded-lg bg-dash-surface-3 border border-dash-border-subtle px-3 py-2 text-sm text-dash-text placeholder:text-dash-text-muted mb-2"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTopupDev}
                disabled={topupLoading}
                className="rounded-md bg-amber-500/20 text-amber-400 px-3 py-1.5 text-sm font-medium hover:bg-amber-500/30 disabled:opacity-50"
              >
                {topupLoading ? "…" : "Recharger (DEV)"}
              </button>
              <button
                type="button"
                onClick={closeTopup}
                className={`rounded-md ${dash.btn} ${dash.btnSecondary}`}
              >
                Fermer
              </button>
            </div>
          </>
        )}
        {!isDev && (
          <button
            type="button"
            onClick={closeTopup}
            className={`rounded-md ${dash.btn} ${dash.btnSecondary} w-full mt-2`}
          >
            Fermer
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <header className="bg-dash-surface/95 backdrop-blur-sm border-b border-dash-border-subtle flex-shrink-0">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between gap-4 min-h-[56px]">
          <Link href="/" className="md:hidden text-lg font-semibold text-dash-text tracking-tight">
            PulsePanel
          </Link>
          <Link href="/" className="hidden md:inline-flex items-center text-sm font-semibold text-dash-text tracking-tight hover:text-dash-text-secondary transition-colors duration-150">
            PulsePanel
          </Link>
          <div className="flex items-center gap-3 sm:gap-5 ml-auto">
            {orgId && (
              <>
                <div className="flex items-center gap-2 rounded-lg bg-dash-surface-2/80 px-3 py-1.5 border border-dash-border-subtle/50">
                  <span className="text-[10px] font-medium text-dash-text-muted uppercase tracking-wider">Crédit</span>
                  <span className="text-sm font-semibold text-dash-text tabular-nums">{creditLabel}</span>
                </div>
                {isDev && membership && (
                  <span className="hidden xl:inline text-[10px] text-dash-text-muted/70 truncate max-w-[64px]" title={`${orgId} (${membership.role})`}>{orgId.slice(0, 6)}…</span>
                )}
                <button type="button" onClick={() => { setTopupOpen(true); setTopupError(null); }} className={`rounded-lg ${dash.btn} ${dash.btnPrimary} px-4 py-2`}>
                  Recharger
                </button>
                {isDev && (
                  <button type="button" onClick={() => { setTopupOpen(true); setTopupError(null); setTopupAmount("10"); }} className="rounded-md px-1.5 py-0.5 text-[10px] font-normal text-dash-text-muted/80 hover:text-dash-text-muted hover:bg-dash-surface-2/50" title="Recharge directe (DEV)">DEV</button>
                )}
              </>
            )}
            <nav className="md:hidden flex items-center gap-2 pl-2">
              <Link href="/billing" className={`text-sm ${dash.link}`}>Facturation</Link>
              <Link href="/withdrawals" className={`text-sm ${dash.link}`}>Retraits</Link>
              <Link href="/campaigns/new" className={`rounded-lg ${dash.btn} ${dash.btnPrimary} text-sm px-3 py-1.5`}>Nouvelle campagne</Link>
            </nav>
          </div>
        </div>
      </header>
      {topupModal && createPortal(topupModal, document.body)}
    </>
  );
}
