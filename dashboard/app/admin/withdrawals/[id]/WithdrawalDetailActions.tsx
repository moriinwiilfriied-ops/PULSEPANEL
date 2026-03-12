"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dash } from "@/src/lib/dashboardTheme";
import { PanelCard } from "@/src/components/ui/PanelCard";

const PAYMENT_CHANNELS = [
  { value: "bank_transfer", label: "Virement bancaire" },
  { value: "paypal", label: "PayPal" },
  { value: "other", label: "Autre" },
] as const;

const inputClass = "w-full rounded-[var(--dash-radius)] border border-dash-border bg-dash-surface-2 px-3 py-2 text-sm text-dash-text placeholder:text-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent/30";
const labelClass = "block text-sm font-medium text-dash-text";

export function WithdrawalDetailActions({ withdrawalId }: { withdrawalId: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"reject" | "paid" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectAdminNote, setRejectAdminNote] = useState("");

  const [externalRef, setExternalRef] = useState("");
  const [paymentChannel, setPaymentChannel] = useState("");
  const [paidAdminNote, setPaidAdminNote] = useState("");
  const [confirmationPaid, setConfirmationPaid] = useState(false);

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!rejectionReason.trim() || !rejectAdminNote.trim()) {
      setError("Motif de rejet et note admin obligatoires.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/withdrawals/${withdrawalId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "rejected",
          rejection_reason: rejectionReason.trim(),
          admin_note: rejectAdminNote.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erreur lors du rejet.");
        return;
      }
      router.refresh();
      setActiveTab(null);
      setRejectionReason("");
      setRejectAdminNote("");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!externalRef.trim() || !paymentChannel || !paidAdminNote.trim()) {
      setError("Référence externe, canal et note admin obligatoires.");
      return;
    }
    if (!confirmationPaid) {
      setError("Cochez la confirmation que le paiement a déjà été effectué.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/withdrawals/${withdrawalId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "paid",
          external_reference: externalRef.trim(),
          payment_channel: paymentChannel,
          admin_note: paidAdminNote.trim(),
          confirmation_paid: true,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erreur lors du marquage payé.");
        return;
      }
      router.refresh();
      setActiveTab(null);
      setExternalRef("");
      setPaymentChannel("");
      setPaidAdminNote("");
      setConfirmationPaid(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className={dash.sectionTitle}>Actions</h2>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setActiveTab(activeTab === "reject" ? null : "reject"); setError(null); }}
          className={`${dash.btn} ${dash.btnDanger}`}
        >
          Rejeter
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab(activeTab === "paid" ? null : "paid"); setError(null); }}
          className={`${dash.btn} bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/25`}
        >
          Marquer payé
        </button>
      </div>

      {activeTab === "reject" && (
        <PanelCard>
          <form onSubmit={handleReject} className="space-y-3 max-w-lg">
            <label className={labelClass}>
              Motif de rejet <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className={inputClass}
              placeholder="Ex: Coordonnées bancaires invalides"
              required
            />
            <label className={labelClass}>
              Note admin <span className="text-red-400">*</span>
            </label>
            <textarea
              value={rejectAdminNote}
              onChange={(e) => setRejectAdminNote(e.target.value)}
              className={`${inputClass} min-h-[80px]`}
              placeholder="Trace pour l'équipe"
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className={`${dash.btn} ${dash.btnDanger}`}
              >
                {loading ? "…" : "Rejeter le retrait"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab(null)}
                className={`${dash.btn} ${dash.btnSecondary}`}
              >
                Annuler
              </button>
            </div>
          </form>
        </PanelCard>
      )}

      {activeTab === "paid" && (
        <PanelCard>
          <form onSubmit={handleMarkPaid} className="space-y-3 max-w-lg">
            <p className="text-xs text-amber-400">
              Marquer payé uniquement après avoir effectué le virement / paiement externe.
            </p>
            <label className={labelClass}>
              Référence externe <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={externalRef}
              onChange={(e) => setExternalRef(e.target.value)}
              className={inputClass}
              placeholder="N° virement, ID transaction…"
              required
            />
            <label className={labelClass}>
              Canal de paiement <span className="text-red-400">*</span>
            </label>
            <select
              value={paymentChannel}
              onChange={(e) => setPaymentChannel(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Choisir</option>
              {PAYMENT_CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <label className={labelClass}>
              Note admin <span className="text-red-400">*</span>
            </label>
            <textarea
              value={paidAdminNote}
              onChange={(e) => setPaidAdminNote(e.target.value)}
              className={`${inputClass} min-h-[80px]`}
              placeholder="Ex: Virement du 07/03, compte XXX"
              required
            />
            <label className="flex items-center gap-2 text-sm text-dash-text">
              <input
                type="checkbox"
                checked={confirmationPaid}
                onChange={(e) => setConfirmationPaid(e.target.checked)}
                className="rounded border-dash-border bg-dash-surface-2"
              />
              <span>Je confirme que le paiement externe a déjà été effectué.</span>
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading || !confirmationPaid}
                className={`${dash.btn} bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/25`}
              >
                {loading ? "…" : "Marquer payé"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab(null)}
                className={`${dash.btn} ${dash.btnSecondary}`}
              >
                Annuler
              </button>
            </div>
          </form>
        </PanelCard>
      )}
    </div>
  );
}
