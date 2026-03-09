import Link from "next/link";
import { getAdminUsers } from "@/src/lib/adminData";

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

function truncateId(id: string) {
  if (!id) return "—";
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function truncateReason(s: string | null, max = 30) {
  if (!s) return "—";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export default async function AdminUsersPage() {
  const rows = await getAdminUsers();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Users
      </h1>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Aucun utilisateur.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                  user_id
                </th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                  created_at
                </th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                  onboarding
                </th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                  region
                </th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                  trust
                </th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">
                  pending
                </th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">
                  available
                </th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">
                  withdrawals
                </th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">
                  flags
                </th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                  cashout
                </th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 max-w-[120px]">
                  frozen_reason
                </th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                  last_activity
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                >
                  <td className="px-3 py-2 font-mono text-xs text-zinc-700 dark:text-zinc-300" title={r.id}>
                    <Link href={`/admin/users/${r.id}`} className="hover:underline">
                      {truncateId(r.id)}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    {formatDate(r.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    {r.onboarding_completed ? "oui" : "non"}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 max-w-[120px] truncate">
                    {r.region ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    {r.trust_level ?? "—"} ({r.trust_score})
                  </td>
                  <td className="px-3 py-2 text-right">
                    {(r.pending_cents / 100).toFixed(2)} €
                  </td>
                  <td className="px-3 py-2 text-right">
                    {(r.available_cents / 100).toFixed(2)} €
                  </td>
                  <td className="px-3 py-2 text-right">{r.withdrawals_count}</td>
                  <td className="px-3 py-2 text-right">{r.flags_count}</td>
                  <td className="px-3 py-2">
                    {r.withdrawals_frozen ? (
                      <span className="text-red-600 dark:text-red-400">frozen</span>
                    ) : (
                      "active"
                    )}
                  </td>
                  <td className="px-3 py-2 max-w-[120px] truncate text-zinc-600 dark:text-zinc-400" title={r.withdrawals_frozen_reason ?? undefined}>
                    {r.withdrawals_frozen ? truncateReason(r.withdrawals_frozen_reason) : "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    {formatDate(r.last_activity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Limite 200 derniers. Lecture seule.
      </p>
    </div>
  );
}
