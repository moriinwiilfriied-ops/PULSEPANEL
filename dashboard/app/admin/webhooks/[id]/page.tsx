import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminWebhookEventDetail } from "@/src/lib/adminData";
import { dash } from "@/src/lib/dashboardTheme";
import { PanelCard } from "@/src/components/ui/PanelCard";
import { DashboardSection } from "@/src/components/ui/DashboardSection";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

function formatDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const labelClass = "text-dash-text-muted";
const valueClass = "text-dash-text";

export default async function AdminWebhookEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getAdminWebhookEventDetail(id);
  if (!row) notFound();

  return (
    <div className={dash.page}>
      <div className={dash.container}>
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/webhooks" className={dash.link}>
            ← Liste webhooks
          </Link>
          <h1 className={dash.headlineSection}>
            Événement {row.event_type}
          </h1>
        </div>

        <DashboardSection title="Métadonnées">
          <PanelCard className="space-y-3">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <dt className={labelClass}>id</dt>
              <dd className={`font-mono text-xs break-all ${valueClass}`}>{row.id}</dd>
              <dt className={labelClass}>event_id</dt>
              <dd className={`font-mono text-xs break-all ${valueClass}`}>{row.event_id}</dd>
              <dt className={labelClass}>event_type</dt>
              <dd className={valueClass}>{row.event_type}</dd>
              <dt className={labelClass}>provider</dt>
              <dd className={valueClass}>{row.provider}</dd>
              <dt className={labelClass}>livemode</dt>
              <dd className={valueClass}>{row.livemode == null ? "—" : row.livemode ? "true" : "false"}</dd>
              <dt className={labelClass}>api_version</dt>
              <dd className={valueClass}>{row.api_version ?? "—"}</dd>
              <dt className={labelClass}>created_ts (Stripe)</dt>
              <dd className={valueClass}>{formatDate(row.created_ts)}</dd>
              <dt className={labelClass}>received_at</dt>
              <dd className={valueClass}>{formatDate(row.received_at)}</dd>
              <dt className={labelClass}>processing_status</dt>
              <dd className={valueClass}>
                {row.processing_status === "error" ? (
                  <StatusBadge variant="danger">{row.processing_status}</StatusBadge>
                ) : row.processing_status === "processed" ? (
                  <StatusBadge variant="success">{row.processing_status}</StatusBadge>
                ) : (
                  row.processing_status
                )}
              </dd>
              <dt className={labelClass}>processed_at</dt>
              <dd className={valueClass}>{formatDate(row.processed_at)}</dd>
              <dt className={labelClass}>source_route</dt>
              <dd className={`font-mono text-xs ${valueClass}`}>{row.source_route ?? "—"}</dd>
            </dl>
          </PanelCard>
        </DashboardSection>

        <DashboardSection title="Références Stripe" className="mt-6">
          <PanelCard className="space-y-3">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <dt className={labelClass}>stripe_checkout_session_id</dt>
              <dd className={`font-mono text-xs break-all ${valueClass}`}>{row.stripe_checkout_session_id ?? "—"}</dd>
              <dt className={labelClass}>stripe_payment_intent_id</dt>
              <dd className={`font-mono text-xs break-all ${valueClass}`}>{row.stripe_payment_intent_id ?? "—"}</dd>
              <dt className={labelClass}>org_id</dt>
              <dd className={`font-mono text-xs break-all ${valueClass}`}>{row.org_id ?? "—"}</dd>
            </dl>
          </PanelCard>
        </DashboardSection>

        {row.processing_error ? (
          <DashboardSection title="Erreur de traitement" className="mt-6">
            <PanelCard className="border-red-500/20 bg-red-500/5">
              <pre className="text-sm text-red-400 whitespace-pre-wrap break-words font-mono">
                {row.processing_error}
              </pre>
            </PanelCard>
          </DashboardSection>
        ) : null}

        <DashboardSection title="payload_summary" className="mt-6">
          <PanelCard>
            <pre className="text-xs bg-dash-surface-3 p-3 rounded-[var(--dash-radius)] overflow-x-auto text-dash-text font-mono">
              {row.payload_summary
                ? JSON.stringify(row.payload_summary, null, 2)
                : "—"}
            </pre>
          </PanelCard>
        </DashboardSection>
      </div>
    </div>
  );
}
