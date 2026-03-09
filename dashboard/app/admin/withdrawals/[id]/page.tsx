import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminWithdrawalDetail } from "@/src/lib/adminData";
import { WithdrawalDetailActions } from "./WithdrawalDetailActions";

function formatDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminWithdrawalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getAdminWithdrawalDetail(id);
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/withdrawals"
          className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline"
        >
          ← Retours liste
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Retrait {detail.id.slice(0, 8)}…
        </h1>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <p><span className="text-zinc-500 dark:text-zinc-400">id</span> <span className="font-mono">{detail.id}</span></p>
          <p><span className="text-zinc-500 dark:text-zinc-400">created_at</span> {formatDate(detail.created_at)}</p>
          <p><span className="text-zinc-500 dark:text-zinc-400">user_id</span> <span className="font-mono">{detail.user_id}</span></p>
          <p><span className="text-zinc-500 dark:text-zinc-400">amount</span> {(detail.amount_cents / 100).toFixed(2)} €</p>
          <p><span className="text-zinc-500 dark:text-zinc-400">status</span> <span className={detail.status === "pending" ? "text-amber-600" : detail.status === "paid" ? "text-emerald-600" : "text-zinc-500"}>{detail.status}</span></p>
          <p><span className="text-zinc-500 dark:text-zinc-400">method</span> {detail.method ?? "—"}</p>
          <p><span className="text-zinc-500 dark:text-zinc-400">note (user)</span> {detail.note ? detail.note.slice(0, 80) + (detail.note.length > 80 ? "…" : "") : "—"}</p>
          <p><span className="text-zinc-500 dark:text-zinc-400">decided_at</span> {formatDate(detail.decided_at)}</p>
          <p><span className="text-zinc-500 dark:text-zinc-400">decided_by</span> {detail.decided_by ?? "—"}</p>
          {detail.rejection_reason ? <p><span className="text-zinc-500 dark:text-zinc-400">rejection_reason</span> {detail.rejection_reason}</p> : null}
          {detail.external_reference ? <p><span className="text-zinc-500 dark:text-zinc-400">external_reference</span> {detail.external_reference}</p> : null}
          {detail.payment_channel ? <p><span className="text-zinc-500 dark:text-zinc-400">payment_channel</span> {detail.payment_channel}</p> : null}
          {detail.admin_note ? <p><span className="text-zinc-500 dark:text-zinc-400">admin_note</span> {detail.admin_note}</p> : null}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
          Contexte user
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <p><span className="text-zinc-500 dark:text-zinc-400">trust</span> {detail.user_trust_level ?? "—"} ({detail.user_trust_score ?? "—"})</p>
          <p><span className="text-zinc-500 dark:text-zinc-400">pending</span> {(detail.user_pending_cents / 100).toFixed(2)} €</p>
          <p><span className="text-zinc-500 dark:text-zinc-400">available</span> {(detail.user_available_cents / 100).toFixed(2)} €</p>
          <p><span className="text-zinc-500 dark:text-zinc-400">withdrawals</span> {detail.user_withdrawals_count}</p>
          <p><span className="text-zinc-500 dark:text-zinc-400">flags</span> {detail.user_flags_count}</p>
        </div>
      </div>

      {detail.status === "pending" && (
        <WithdrawalDetailActions withdrawalId={detail.id} />
      )}
    </div>
  );
}
