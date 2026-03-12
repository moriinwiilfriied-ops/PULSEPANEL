import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminFlagDetail } from "@/src/lib/adminData";
import { FlagDetailActions } from "./FlagDetailActions";
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

export default async function AdminFlagDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getAdminFlagDetail(id);
  if (!detail) notFound();

  return (
    <div className={dash.page}>
      <div className={dash.container}>
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/flags" className={dash.link}>
            ← Liste flags
          </Link>
          <h1 className={dash.headlineSection}>
            Flag {truncateId(detail.id)}
          </h1>
        </div>

        <DashboardSection title="Détail">
          <PanelCard className="space-y-3">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <dt className={labelClass}>id</dt>
              <dd className={`font-mono text-xs break-all ${valueClass}`}>{detail.id}</dd>
              <dt className={labelClass}>created_at</dt>
              <dd className={valueClass}>{formatDate(detail.created_at)}</dd>
              <dt className={labelClass}>user_id</dt>
              <dd className="font-mono text-xs break-all">
                {detail.user_id ? (
                  <Link href={`/admin/users/${detail.user_id}`} className={dash.link}>
                    {detail.user_id}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
              <dt className={labelClass}>response_id</dt>
              <dd className={`font-mono text-xs break-all ${valueClass}`}>{truncateId(detail.response_id)}</dd>
              <dt className={labelClass}>reason</dt>
              <dd className={valueClass}>{detail.reason ?? "—"}</dd>
              <dt className={labelClass}>severity</dt>
              <dd className={valueClass}>{detail.severity ?? "—"}</dd>
              <dt className={labelClass}>status</dt>
              <dd className={valueClass}>{detail.status ?? "—"}</dd>
              <dt className={labelClass}>admin_note</dt>
              <dd className={`max-w-md ${valueClass}`}>{detail.admin_note ?? "—"}</dd>
              <dt className={labelClass}>reviewed_at</dt>
              <dd className={valueClass}>{formatDate(detail.reviewed_at)}</dd>
              <dt className={labelClass}>reviewed_by</dt>
              <dd className={valueClass}>{detail.reviewed_by ?? "—"}</dd>
            </dl>
          </PanelCard>
        </DashboardSection>

        <DashboardSection title="User (contexte)" className="mt-6">
          <PanelCard className="space-y-3">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <dt className={labelClass}>trust</dt>
              <dd className={valueClass}>{detail.user_trust_level ?? "—"} ({detail.user_trust_score ?? "—"})</dd>
              <dt className={labelClass}>balances</dt>
              <dd className={valueClass}>pending {(detail.user_pending_cents / 100).toFixed(2)} € / available {(detail.user_available_cents / 100).toFixed(2)} €</dd>
              <dt className={labelClass}>withdrawals (count)</dt>
              <dd className={valueClass}>{detail.user_withdrawals_count}</dd>
              <dt className={labelClass}>flags (count)</dt>
              <dd className={valueClass}>{detail.user_flags_count}</dd>
              <dt className={labelClass}>Retraits gelés</dt>
              <dd className={valueClass}>
                {detail.user_withdrawals_frozen ? (
                  <span className="inline-flex items-center gap-1">
                    <StatusBadge variant="danger">Oui</StatusBadge>
                    {" "}{detail.withdrawals_frozen_reason ?? "—"} (depuis {formatDate(detail.withdrawals_frozen_at)}, par {detail.withdrawals_frozen_by ?? "—"})
                  </span>
                ) : (
                  "Non"
                )}
              </dd>
            </dl>
            {detail.user_id && (
              <p className="text-sm mt-2">
                <Link href={`/admin/withdrawals?searchId=${detail.user_id.slice(0, 8)}`} className={dash.link}>
                  Voir les retraits de ce user →
                </Link>
              </p>
            )}
          </PanelCard>
        </DashboardSection>

        {detail.user_id && (detail.user_devices.length > 0 || detail.user_shared_device_signals.length > 0) && (
          <DashboardSection title="Devices (user)" className="mt-6">
            <PanelCard className="space-y-3">
              {detail.user_devices.length > 0 ? (
                <ul className="space-y-1 text-sm font-mono text-xs text-dash-text">
                  {detail.user_devices.map((d) => (
                    <li key={d.id}>
                      {d.device_hash.slice(0, 16)}… · {d.platform ?? "—"} · last: {formatDate(d.last_seen_at)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-dash-text-muted">Aucun device enregistré.</p>
              )}
              {detail.user_shared_device_signals.length > 0 && (
                <p className="text-sm font-medium text-amber-400">
                  Ce user partage au moins un device avec d&apos;autres comptes ({detail.user_shared_device_signals.length} device(s) partagé(s)).
                </p>
              )}
            </PanelCard>
          </DashboardSection>
        )}

        <DashboardSection title="Actions" className="mt-6">
          <PanelCard>
            <FlagDetailActions
              flagId={detail.id}
              userId={detail.user_id}
              userWithdrawalsFrozen={detail.user_withdrawals_frozen}
            />
          </PanelCard>
        </DashboardSection>
      </div>
    </div>
  );
}
