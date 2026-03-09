"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PAYMENT_CHANNELS = [
  { value: "bank_transfer", label: "Virement bancaire" },
  { value: "paypal", label: "PayPal" },
  { value: "other", label: "Autre" },
] as const;

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
      <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Actions
      </h2>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setActiveTab(activeTab === "reject" ? null : "reject"); setError(null); }}
          className="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 px-4 py-2 text-sm font-medium text-red-800 dark:text-red-200"
        >
          Rejeter
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab(activeTab === "paid" ? null : "paid"); setError(null); }}
          className="rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2 text-sm font-medium text-emerald-800 dark:text-emerald-200"
        >
          Marquer payé
        </button>
      </div>

      {activeTab === "reject" && (
        <form onSubmit={handleReject} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3 max-w-lg">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Motif de rejet <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
            placeholder="Ex: Coordonnées bancaires invalides"
            required
          />
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Note admin <span className="text-red-500">*</span>
          </label>
          <textarea
            value={rejectAdminNote}
            onChange={(e) => setRejectAdminNote(e.target.value)}
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm min-h-[80px]"
            placeholder="Trace pour l’équipe"
            required
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-red-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {loading ? "…" : "Rejeter le retrait"}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(null)}
              className="rounded border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {activeTab === "paid" && (
        <form onSubmit={handleMarkPaid} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3 max-w-lg">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Marquer payé uniquement après avoir effectué le virement / paiement externe.
          </p>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Référence externe <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={externalRef}
            onChange={(e) => setExternalRef(e.target.value)}
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
            placeholder="N° virement, ID transaction…"
            required
          />
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Canal de paiement <span className="text-red-500">*</span>
          </label>
          <select
            value={paymentChannel}
            onChange={(e) => setPaymentChannel(e.target.value)}
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
            required
          >
            <option value="">Choisir</option>
            {PAYMENT_CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Note admin <span className="text-red-500">*</span>
          </label>
          <textarea
            value={paidAdminNote}
            onChange={(e) => setPaidAdminNote(e.target.value)}
            className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm min-h-[80px]"
            placeholder="Ex: Virement du 07/03, compte XXX"
            required
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmationPaid}
              onChange={(e) => setConfirmationPaid(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-600"
            />
            <span>Je confirme que le paiement externe a déjà été effectué.</span>
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !confirmationPaid}
              className="rounded bg-emerald-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {loading ? "…" : "Marquer payé"}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(null)}
              className="rounded border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
