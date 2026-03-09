import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminFlagDetail } from "@/src/lib/adminData";
import { FlagDetailActions } from "./FlagDetailActions";

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

export default async function AdminFlagDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getAdminFlagDetail(id);
  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/flags"
          className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline"
        >
          ← Liste flags
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Flag {truncateId(detail.id)}
        </h1>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Détail
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <dt className="text-zinc-500 dark:text-zinc-400">id</dt>
          <dd className="font-mono text-xs break-all">{detail.id}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">created_at</dt>
          <dd>{formatDate(detail.created_at)}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">user_id</dt>
          <dd className="font-mono text-xs break-all">
            {detail.user_id ? (
              <Link href={`/admin/users/${detail.user_id}`} className="hover:underline">
                {detail.user_id}
              </Link>
            ) : (
              "—"
            )}
          </dd>
          <dt className="text-zinc-500 dark:text-zinc-400">response_id</dt>
          <dd className="font-mono text-xs break-all">{truncateId(detail.response_id)}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">reason</dt>
          <dd>{detail.reason ?? "—"}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">severity</dt>
          <dd>{detail.severity ?? "—"}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">status</dt>
          <dd>{detail.status ?? "—"}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">admin_note</dt>
          <dd className="max-w-md">{detail.admin_note ?? "—"}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">reviewed_at</dt>
          <dd>{formatDate(detail.reviewed_at)}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">reviewed_by</dt>
          <dd>{detail.reviewed_by ?? "—"}</dd>
        </dl>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          User (contexte)
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <dt className="text-zinc-500 dark:text-zinc-400">trust</dt>
          <dd>{detail.user_trust_level ?? "—"} ({detail.user_trust_score ?? "—"})</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">balances</dt>
          <dd>pending {(detail.user_pending_cents / 100).toFixed(2)} € / available {(detail.user_available_cents / 100).toFixed(2)} €</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">withdrawals (count)</dt>
          <dd>{detail.user_withdrawals_count}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">flags (count)</dt>
          <dd>{detail.user_flags_count}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">Retraits gelés</dt>
          <dd>
            {detail.user_withdrawals_frozen ? (
              <span className="text-red-600 dark:text-red-400">
                Oui — {detail.withdrawals_frozen_reason ?? "—"} (depuis {formatDate(detail.withdrawals_frozen_at)}, par {detail.withdrawals_frozen_by ?? "—"})
              </span>
            ) : (
              "Non"
            )}
          </dd>
        </dl>
        {detail.user_id && (
          <p className="text-sm">
            <Link href={`/admin/withdrawals?searchId=${detail.user_id.slice(0, 8)}`} className="text-zinc-600 dark:text-zinc-400 hover:underline">
              Voir les retraits de ce user →
            </Link>
          </p>
        )}
      </div>

      {detail.user_id && (detail.user_devices.length > 0 || detail.user_shared_device_signals.length > 0) && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Devices (user)
          </h2>
          {detail.user_devices.length > 0 ? (
            <ul className="space-y-1 text-sm font-mono text-xs">
              {detail.user_devices.map((d) => (
                <li key={d.id}>
                  {d.device_hash.slice(0, 16)}… · {d.platform ?? "—"} · last: {formatDate(d.last_seen_at)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Aucun device enregistré.</p>
          )}
          {detail.user_shared_device_signals.length > 0 && (
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Ce user partage au moins un device avec d’autres comptes ({detail.user_shared_device_signals.length} device(s) partagé(s)).
            </p>
          )}
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <FlagDetailActions
          flagId={detail.id}
          userId={detail.user_id}
          userWithdrawalsFrozen={detail.user_withdrawals_frozen}
        />
      </div>
    </div>
  );
}
