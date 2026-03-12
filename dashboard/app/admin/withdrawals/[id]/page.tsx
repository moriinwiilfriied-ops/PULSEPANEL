import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminWithdrawalDetail } from "@/src/lib/adminData";
import { WithdrawalDetailActions } from "./WithdrawalDetailActions";
import { dash } from "@/src/lib/dashboardTheme";
import { PanelCard } from "@/src/components/ui/PanelCard";
import { DashboardSection } from "@/src/components/ui/DashboardSection";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

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
    <div className={dash.page}>
      <div className={dash.container}>
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/withdrawals" className={dash.link}>
            ← Retour à la liste
          </Link>
          <h1 className={dash.headlineSection}>
            Retrait {detail.id.slice(0, 8)}…
          </h1>
        </div>

        <PanelCard className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <p><span className="text-dash-text-muted">id</span> <span className="font-mono text-dash-text">{detail.id}</span></p>
            <p><span className="text-dash-text-muted">created_at</span> <span className="text-dash-text">{formatDate(detail.created_at)}</span></p>
            <p><span className="text-dash-text-muted">user_id</span> <span className="font-mono text-dash-text">{detail.user_id}</span></p>
            <p><span className="text-dash-text-muted">amount</span> <span className="text-dash-text">{(detail.amount_cents / 100).toFixed(2)} €</span></p>
            <p><span className="text-dash-text-muted">status</span>{" "}
              {detail.status === "pending" ? (
                <StatusBadge variant="warning">En attente</StatusBadge>
              ) : detail.status === "paid" ? (
                <StatusBadge variant="success">Payé</StatusBadge>
              ) : (
                <StatusBadge variant="danger">Refusé</StatusBadge>
              )}
            </p>
            <p><span className="text-dash-text-muted">method</span> <span className="text-dash-text">{detail.method ?? "—"}</span></p>
            <p><span className="text-dash-text-muted">note (user)</span> <span className="text-dash-text">{detail.note ? detail.note.slice(0, 80) + (detail.note.length > 80 ? "…" : "") : "—"}</span></p>
            <p><span className="text-dash-text-muted">decided_at</span> <span className="text-dash-text">{formatDate(detail.decided_at)}</span></p>
            <p><span className="text-dash-text-muted">decided_by</span> <span className="text-dash-text">{detail.decided_by ?? "—"}</span></p>
            {detail.rejection_reason ? <p><span className="text-dash-text-muted">rejection_reason</span> <span className="text-dash-text">{detail.rejection_reason}</span></p> : null}
            {detail.external_reference ? <p><span className="text-dash-text-muted">external_reference</span> <span className="text-dash-text">{detail.external_reference}</span></p> : null}
            {detail.payment_channel ? <p><span className="text-dash-text-muted">payment_channel</span> <span className="text-dash-text">{detail.payment_channel}</span></p> : null}
            {detail.admin_note ? <p><span className="text-dash-text-muted">admin_note</span> <span className="text-dash-text">{detail.admin_note}</span></p> : null}
          </div>
        </PanelCard>

        <DashboardSection title="Contexte user" className="mt-6">
          <PanelCard>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <p><span className="text-dash-text-muted">trust</span> <span className="text-dash-text">{detail.user_trust_level ?? "—"} ({detail.user_trust_score ?? "—"})</span></p>
              <p><span className="text-dash-text-muted">pending</span> <span className="text-dash-text">{(detail.user_pending_cents / 100).toFixed(2)} €</span></p>
              <p><span className="text-dash-text-muted">available</span> <span className="text-dash-text">{(detail.user_available_cents / 100).toFixed(2)} €</span></p>
              <p><span className="text-dash-text-muted">withdrawals</span> <span className="text-dash-text">{detail.user_withdrawals_count}</span></p>
              <p><span className="text-dash-text-muted">flags</span> <span className="text-dash-text">{detail.user_flags_count}</span></p>
            </div>
          </PanelCard>
        </DashboardSection>

        {detail.status === "pending" && (
          <div className="mt-6">
            <WithdrawalDetailActions withdrawalId={detail.id} />
          </div>
        )}
      </div>
    </div>
  );
}
