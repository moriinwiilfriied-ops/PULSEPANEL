import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminCampaignDetail } from "@/src/lib/adminData";
import { CampaignStatusActions } from "./CampaignStatusActions";
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
  });
}

function truncateId(id: string | null | undefined) {
  if (!id) return "—";
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

const labelClass = "text-dash-text-muted";
const valueClass = "text-dash-text";

export default async function AdminCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getAdminCampaignDetail(id);
  if (!c) notFound();

  return (
    <div className={dash.page}>
      <div className={dash.container}>
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/campaigns" className={dash.link}>
            ← Liste campagnes
          </Link>
          <h1 className={dash.headlineSection}>
            Campagne {truncateId(c.id)}
          </h1>
        </div>

        <DashboardSection title="Détail">
          <PanelCard className="space-y-3">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <dt className={labelClass}>id</dt>
              <dd className={`font-mono text-xs break-all ${valueClass}`}>{c.id}</dd>
              <dt className={labelClass}>org</dt>
              <dd className={valueClass}>{c.org_name ?? truncateId(c.org_id)}</dd>
              <dt className={labelClass}>org_id</dt>
              <dd className={`font-mono text-xs break-all ${valueClass}`}>{c.org_id ?? "—"}</dd>
              <dt className={labelClass}>status</dt>
              <dd className={valueClass}>
                <StatusBadge variant={c.status === "active" ? "success" : c.status === "paused" ? "warning" : "neutral"}>
                  {c.status}
                </StatusBadge>
              </dd>
              <dt className={labelClass}>template / template_key</dt>
              <dd className={valueClass}>{c.template ?? "—"} / {c.template_key ?? "—"}</dd>
              <dt className={labelClass}>question</dt>
              <dd className={`max-w-md ${valueClass}`}>{c.question ?? "—"}</dd>
              <dt className={labelClass}>name</dt>
              <dd className={valueClass}>{c.name ?? "—"}</dd>
              <dt className={labelClass}>quota</dt>
              <dd className={valueClass}>{c.quota}</dd>
              <dt className={labelClass}>responses_count</dt>
              <dd className={valueClass}>{c.responses_count}</dd>
              <dt className={labelClass}>reward_cents</dt>
              <dd className={valueClass}>{(c.reward_cents / 100).toFixed(2)} €</dd>
              <dt className={labelClass}>cost_per_response_cents</dt>
              <dd className={valueClass}>{(c.cost_per_response_cents / 100).toFixed(2)} €</dd>
              <dt className={labelClass}>cost_total_cents</dt>
              <dd className={valueClass}>{(c.cost_total_cents / 100).toFixed(2)} €</dd>
              <dt className={labelClass}>billing_status</dt>
              <dd className={valueClass}>{c.billing_status ?? "—"}</dd>
              <dt className={labelClass}>created_at</dt>
              <dd className={valueClass}>{formatDate(c.created_at)}</dd>
            </dl>
          </PanelCard>
        </DashboardSection>

        <DashboardSection title="Qualité (vue campaign_quality_stats)" className="mt-6">
          <PanelCard className="space-y-3">
            {(c.total_responses != null || c.pct_valid != null) ? (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <dt className={labelClass}>total_responses</dt>
                <dd className={valueClass}>{c.total_responses ?? "—"}</dd>
                <dt className={labelClass}>valid_responses</dt>
                <dd className={valueClass}>{c.valid_responses ?? "—"}</dd>
                <dt className={labelClass}>invalid_responses</dt>
                <dd className={valueClass}>{c.invalid_responses ?? "—"}</dd>
                <dt className={labelClass}>pct_valid</dt>
                <dd className={valueClass}>{c.pct_valid != null ? `${Number(c.pct_valid).toFixed(1)} %` : "—"}</dd>
                <dt className={labelClass}>pct_too_fast</dt>
                <dd className={valueClass}>{c.pct_too_fast != null ? `${Number(c.pct_too_fast).toFixed(1)} %` : "—"}</dd>
                <dt className={labelClass}>pct_empty</dt>
                <dd className={valueClass}>{c.pct_empty != null ? `${Number(c.pct_empty).toFixed(1)} %` : "—"}</dd>
              </dl>
            ) : (
              <p className="text-sm text-dash-text-muted">
                Aucune donnée qualité pour cette campagne (pas encore de réponses ou vue vide).
              </p>
            )}
            <p className="text-xs text-dash-text-muted">
              Source : vue <code className={dash.devBlock}>campaign_quality_stats</code> (too_fast, empty_answer).
            </p>
          </PanelCard>
        </DashboardSection>

        <DashboardSection title="Flags liés à la campagne" className="mt-6">
          <PanelCard className="space-y-3">
            <p className="text-sm text-dash-text">
              Nombre de flags (réponses too_fast / empty_answer) : <strong>{c.flags_count}</strong>
            </p>
            <p className="text-xs text-dash-text-muted">
              Voir la liste <Link href="/admin/flags" className={dash.link}>Flags</Link> et filtrer par campaign_id / response si besoin.
            </p>
          </PanelCard>
        </DashboardSection>

        <DashboardSection title="Statut" className="mt-6">
          <PanelCard>
            <CampaignStatusActions campaignId={c.id} currentStatus={c.status} />
          </PanelCard>
        </DashboardSection>

        <div className="flex flex-wrap gap-2 text-sm mt-6 items-center">
          <Link href={`/campaigns/${c.id}`} className={dash.link}>
            Ouvrir dans le dashboard org (campagne) →
          </Link>
          <span className="text-dash-text-muted">|</span>
          <span className="text-dash-text-muted">
            Export CSV/JSON : depuis le détail campagne du dashboard org (membre de l&apos;org).
          </span>
        </div>
      </div>
    </div>
  );
}
