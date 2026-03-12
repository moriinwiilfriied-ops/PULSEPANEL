import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminUserDetail } from "@/src/lib/adminData";
import { UserFreezeActions } from "./UserFreezeActions";
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

const labelClass = "text-dash-text-muted";
const valueClass = "text-dash-text";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAdminUserDetail(id);
  if (!user) notFound();

  return (
    <div className={dash.page}>
      <div className={dash.container}>
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/users" className={dash.link}>
            ← Liste users
          </Link>
          <h1 className={dash.headlineSection}>
            User {user.id.slice(0, 8)}…
          </h1>
        </div>

        <DashboardSection title="Profil">
          <PanelCard className="space-y-3">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <dt className={labelClass}>id</dt>
              <dd className={`font-mono text-xs break-all ${valueClass}`}>{user.id}</dd>
              <dt className={labelClass}>created_at</dt>
              <dd className={valueClass}>{formatDate(user.created_at)}</dd>
              <dt className={labelClass}>trust</dt>
              <dd className={valueClass}>{user.trust_level ?? "—"} ({user.trust_score})</dd>
              <dt className={labelClass}>onboarding</dt>
              <dd className={valueClass}>{user.onboarding_completed ? "oui" : "non"}</dd>
              <dt className={labelClass}>region</dt>
              <dd className={valueClass}>{user.region ?? "—"}</dd>
              <dt className={labelClass}>last_activity</dt>
              <dd className={valueClass}>{formatDate(user.last_activity)}</dd>
            </dl>
          </PanelCard>
        </DashboardSection>

        <DashboardSection title="Soldes et comptages" className="mt-6">
          <PanelCard className="space-y-3">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <dt className={labelClass}>pending</dt>
              <dd className={valueClass}>{(user.pending_cents / 100).toFixed(2)} €</dd>
              <dt className={labelClass}>available</dt>
              <dd className={valueClass}>{(user.available_cents / 100).toFixed(2)} €</dd>
              <dt className={labelClass}>withdrawals (count)</dt>
              <dd className={valueClass}>{user.withdrawals_count}</dd>
              <dt className={labelClass}>flags (count)</dt>
              <dd className={valueClass}>{user.flags_count}</dd>
            </dl>
          </PanelCard>
        </DashboardSection>

        {user.daily_limit_status && (
          <DashboardSection
            title="Plafonds du jour (UTC)"
            className="mt-6"
          >
            <PanelCard className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {(user.daily_limit_status.remaining_valid_responses_today <= 0 ||
                  user.daily_limit_status.remaining_reward_cents_today <= 0 ||
                  user.daily_limit_status.remaining_withdrawal_requests_today <= 0) && (
                  <StatusBadge variant="warning">daily limited</StatusBadge>
                )}
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <dt className={labelClass}>trust_level</dt>
                <dd className={valueClass}>{user.daily_limit_status.trust_level}</dd>
                <dt className={labelClass}>réponses aujourd&apos;hui</dt>
                <dd className={valueClass}>{user.daily_limit_status.valid_responses_today} / {user.daily_limit_status.max_valid_responses_per_day}</dd>
                <dt className={labelClass}>gains aujourd&apos;hui</dt>
                <dd className={valueClass}>{(user.daily_limit_status.reward_cents_today / 100).toFixed(2)} € / {(user.daily_limit_status.max_reward_cents_per_day / 100).toFixed(2)} €</dd>
                <dt className={labelClass}>demandes retrait aujourd&apos;hui</dt>
                <dd className={valueClass}>{user.daily_limit_status.withdrawal_requests_today} / {user.daily_limit_status.max_withdrawal_requests_per_day}</dd>
                <dt className={labelClass}>reste réponses</dt>
                <dd className={valueClass}>{user.daily_limit_status.remaining_valid_responses_today}</dd>
                <dt className={labelClass}>reste gains (cents)</dt>
                <dd className={valueClass}>{user.daily_limit_status.remaining_reward_cents_today}</dd>
                <dt className={labelClass}>reste demandes retrait</dt>
                <dd className={valueClass}>{user.daily_limit_status.remaining_withdrawal_requests_today}</dd>
                {user.daily_limit_status.shared_device_users_count != null && (
                  <>
                    <dt className={labelClass}>shared_device_users_count</dt>
                    <dd className={valueClass}>{user.daily_limit_status.shared_device_users_count}</dd>
                  </>
                )}
                {user.daily_limit_status.open_flags_count != null && (
                  <>
                    <dt className={labelClass}>open_flags_count</dt>
                    <dd className={valueClass}>{user.daily_limit_status.open_flags_count}</dd>
                  </>
                )}
              </dl>
            </PanelCard>
          </DashboardSection>
        )}

        <DashboardSection title="État retraits (cashout)" className="mt-6">
          <PanelCard className="space-y-3">
            {user.risk_control ? (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <dt className={labelClass}>gelé</dt>
                <dd className={valueClass}>
                  {user.risk_control.withdrawals_frozen ? (
                    <StatusBadge variant="danger">Oui</StatusBadge>
                  ) : (
                    "Non"
                  )}
                </dd>
                {user.risk_control.withdrawals_frozen && (
                  <>
                    <dt className={labelClass}>motif</dt>
                    <dd className={valueClass}>{user.risk_control.withdrawals_frozen_reason ?? "—"}</dd>
                    <dt className={labelClass}>gelé à</dt>
                    <dd className={valueClass}>{formatDate(user.risk_control.withdrawals_frozen_at)}</dd>
                    <dt className={labelClass}>gelé par</dt>
                    <dd className={valueClass}>{user.risk_control.withdrawals_frozen_by ?? "—"}</dd>
                  </>
                )}
                <dt className={labelClass}>admin_note</dt>
                <dd className={`max-w-md ${valueClass}`}>{user.risk_control.admin_note ?? "—"}</dd>
                <dt className={labelClass}>updated_at</dt>
                <dd className={valueClass}>{formatDate(user.risk_control.updated_at)}</dd>
              </dl>
            ) : (
              <p className="text-sm text-dash-text-secondary">
                Aucun contrôle risque (retraits actifs).
              </p>
            )}
            <UserFreezeActions userId={user.id} withdrawalsFrozen={user.withdrawals_frozen} />
          </PanelCard>
        </DashboardSection>

        <DashboardSection title="Devices (installations)" className="mt-6">
          <PanelCard className="space-y-3">
            {user.devices.length === 0 ? (
              <p className="text-sm text-dash-text-muted">Aucun device enregistré.</p>
            ) : (
              <>
                <p className="text-sm text-dash-text-secondary">
                  {user.devices.length} device(s) connu(s). Hash abrégé, platform, first/last seen.
                </p>
                <ul className="space-y-2 text-sm">
                  {user.devices.map((d) => (
                    <li key={d.id} className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
                      <span className={valueClass} title={d.device_hash}>{d.device_hash.slice(0, 16)}…</span>
                      <span className={labelClass}>{d.platform ?? "—"}</span>
                      <span className={labelClass}>{d.app_version ?? "—"}</span>
                      <span className={valueClass}>first: {formatDate(d.first_seen_at)}</span>
                      <span className={valueClass}>last: {formatDate(d.last_seen_at)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {user.shared_device_signals.length > 0 && (
              <div className="mt-3 pt-3 border-t border-dash-border-subtle">
                <p className="text-sm font-medium text-amber-400">
                  Même device_hash que d&apos;autres comptes
                </p>
                <ul className="mt-1 space-y-1 text-sm">
                  {user.shared_device_signals.map((s) => (
                    <li key={s.device_hash}>
                      <span className="font-mono text-xs text-dash-text">{s.device_hash.slice(0, 16)}…</span>
                      {" "}→ {s.other_users_count} autre(s) user(s){" "}
                      {s.other_user_ids.slice(0, 5).map((uid) => (
                        <Link key={uid} href={`/admin/users/${uid}`} className={`${dash.link} font-mono text-xs mr-1`}>
                          {uid.slice(0, 8)}…
                        </Link>
                      ))}
                      {s.other_user_ids.length > 5 ? ` (+${s.other_user_ids.length - 5})` : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </PanelCard>
        </DashboardSection>

        <div className="flex flex-wrap gap-2 text-sm mt-6">
          <Link href={`/admin/withdrawals?searchId=${user.id}`} className={dash.link}>
            Voir les retraits de ce user →
          </Link>
          <Link href={`/admin/flags?search_user_id=${user.id}`} className={dash.link}>
            Voir les flags de ce user →
          </Link>
        </div>
      </div>
    </div>
  );
}
