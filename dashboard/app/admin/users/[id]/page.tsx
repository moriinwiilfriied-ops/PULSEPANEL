import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminUserDetail } from "@/src/lib/adminData";
import { UserFreezeActions } from "./UserFreezeActions";

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

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAdminUserDetail(id);
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/users" className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline">
          ← Liste users
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          User {user.id.slice(0, 8)}…
        </h1>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Profil
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <dt className="text-zinc-500 dark:text-zinc-400">id</dt>
          <dd className="font-mono text-xs break-all">{user.id}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">created_at</dt>
          <dd>{formatDate(user.created_at)}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">trust</dt>
          <dd>{user.trust_level ?? "—"} ({user.trust_score})</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">onboarding</dt>
          <dd>{user.onboarding_completed ? "oui" : "non"}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">region</dt>
          <dd>{user.region ?? "—"}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">last_activity</dt>
          <dd>{formatDate(user.last_activity)}</dd>
        </dl>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Soldes et comptages
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <dt className="text-zinc-500 dark:text-zinc-400">pending</dt>
          <dd>{(user.pending_cents / 100).toFixed(2)} €</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">available</dt>
          <dd>{(user.available_cents / 100).toFixed(2)} €</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">withdrawals (count)</dt>
          <dd>{user.withdrawals_count}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">flags (count)</dt>
          <dd>{user.flags_count}</dd>
        </dl>
      </div>

      {user.daily_limit_status && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            Plafonds du jour (UTC)
            {(user.daily_limit_status.remaining_valid_responses_today <= 0 ||
              user.daily_limit_status.remaining_reward_cents_today <= 0 ||
              user.daily_limit_status.remaining_withdrawal_requests_today <= 0) && (
              <span className="rounded px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                daily limited
              </span>
            )}
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <dt className="text-zinc-500 dark:text-zinc-400">trust_level</dt>
            <dd>{user.daily_limit_status.trust_level}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">réponses aujourd’hui</dt>
            <dd>{user.daily_limit_status.valid_responses_today} / {user.daily_limit_status.max_valid_responses_per_day}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">gains aujourd’hui</dt>
            <dd>{(user.daily_limit_status.reward_cents_today / 100).toFixed(2)} € / {(user.daily_limit_status.max_reward_cents_per_day / 100).toFixed(2)} €</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">demandes retrait aujourd’hui</dt>
            <dd>{user.daily_limit_status.withdrawal_requests_today} / {user.daily_limit_status.max_withdrawal_requests_per_day}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">reste réponses</dt>
            <dd>{user.daily_limit_status.remaining_valid_responses_today}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">reste gains (cents)</dt>
            <dd>{user.daily_limit_status.remaining_reward_cents_today}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">reste demandes retrait</dt>
            <dd>{user.daily_limit_status.remaining_withdrawal_requests_today}</dd>
            {user.daily_limit_status.shared_device_users_count != null && (
              <>
                <dt className="text-zinc-500 dark:text-zinc-400">shared_device_users_count</dt>
                <dd>{user.daily_limit_status.shared_device_users_count}</dd>
              </>
            )}
            {user.daily_limit_status.open_flags_count != null && (
              <>
                <dt className="text-zinc-500 dark:text-zinc-400">open_flags_count</dt>
                <dd>{user.daily_limit_status.open_flags_count}</dd>
              </>
            )}
          </dl>
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          État retraits (cashout)
        </h2>
        {user.risk_control ? (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <dt className="text-zinc-500 dark:text-zinc-400">gelé</dt>
            <dd>{user.risk_control.withdrawals_frozen ? <span className="text-red-600 dark:text-red-400">Oui</span> : "Non"}</dd>
            {user.risk_control.withdrawals_frozen && (
              <>
                <dt className="text-zinc-500 dark:text-zinc-400">motif</dt>
                <dd>{user.risk_control.withdrawals_frozen_reason ?? "—"}</dd>
                <dt className="text-zinc-500 dark:text-zinc-400">gelé à</dt>
                <dd>{formatDate(user.risk_control.withdrawals_frozen_at)}</dd>
                <dt className="text-zinc-500 dark:text-zinc-400">gelé par</dt>
                <dd>{user.risk_control.withdrawals_frozen_by ?? "—"}</dd>
              </>
            )}
            <dt className="text-zinc-500 dark:text-zinc-400">admin_note</dt>
            <dd className="max-w-md">{user.risk_control.admin_note ?? "—"}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">updated_at</dt>
            <dd>{formatDate(user.risk_control.updated_at)}</dd>
          </dl>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Aucun contrôle risque (retraits actifs).
          </p>
        )}
        <UserFreezeActions userId={user.id} withdrawalsFrozen={user.withdrawals_frozen} />
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Devices (installations)
        </h2>
        {user.devices.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Aucun device enregistré.</p>
        ) : (
          <>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {user.devices.length} device(s) connu(s). Hash abrégé, platform, first/last seen.
            </p>
            <ul className="space-y-2 text-sm">
              {user.devices.map((d) => (
                <li key={d.id} className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
                  <span title={d.device_hash}>{d.device_hash.slice(0, 16)}…</span>
                  <span className="text-zinc-500 dark:text-zinc-400">{d.platform ?? "—"}</span>
                  <span className="text-zinc-500 dark:text-zinc-400">{d.app_version ?? "—"}</span>
                  <span>first: {formatDate(d.first_seen_at)}</span>
                  <span>last: {formatDate(d.last_seen_at)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {user.shared_device_signals.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Même device_hash que d’autres comptes
            </p>
            <ul className="mt-1 space-y-1 text-sm">
              {user.shared_device_signals.map((s) => (
                <li key={s.device_hash}>
                  <span className="font-mono text-xs">{s.device_hash.slice(0, 16)}…</span>
                  {" "}→ {s.other_users_count} autre(s) user(s){" "}
                  {s.other_user_ids.slice(0, 5).map((uid) => (
                    <Link key={uid} href={`/admin/users/${uid}`} className="hover:underline font-mono text-xs mr-1">
                      {uid.slice(0, 8)}…
                    </Link>
                  ))}
                  {s.other_user_ids.length > 5 ? ` (+${s.other_user_ids.length - 5})` : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href={`/admin/withdrawals?searchId=${user.id}`} className="text-zinc-600 dark:text-zinc-400 hover:underline">
          Voir les retraits de ce user →
        </Link>
        <Link href={`/admin/flags?search_user_id=${user.id}`} className="text-zinc-600 dark:text-zinc-400 hover:underline">
          Voir les flags de ce user →
        </Link>
      </div>
    </div>
  );
}
