import Link from "next/link";
import { Suspense } from "react";
import { getAdminWithdrawals, getAdminWithdrawalsKpis } from "@/src/lib/adminData";
import { AdminWithdrawalsFilters } from "./AdminWithdrawalsFilters";

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

function truncateRef(s: string | null, max = 16) {
  if (!s) return "—";
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export default async function AdminWithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; since?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : undefined;
  const since = typeof params.since === "string" ? params.since : undefined;
  const searchId = typeof params.q === "string" ? params.q : undefined;

  const [rows, kpis] = await Promise.all([
    getAdminWithdrawals({
      status,
      since,
      searchId,
      limit: 200,
    }),
    getAdminWithdrawalsKpis(),
  ]);

  const exportHref = `/api/admin/withdrawals/export?${new URLSearchParams({
    ...(status ? { status } : {}),
    ...(since ? { since } : {}),
    ...(searchId ? { q: searchId } : {}),
  }).toString()}`;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Withdrawals
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">En attente</p>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{kpis.pendingCount}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Montant total pending</p>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{(kpis.pendingTotalCents / 100).toFixed(2)} €</p>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Payés (30 j)</p>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{kpis.paidCountLast30}</p>
        </div>
      </div>

      <Suspense fallback={<div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 h-12 animate-pulse" />}>
        <AdminWithdrawalsFilters status={status} since={since} q={searchId} />
      </Suspense>

      <div className="flex items-center gap-4 flex-wrap">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Traitement avec traçabilité : clic sur un id → détail → Rejeter / Marquer payé. Runbook :{" "}
          <code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">docs/manual-withdrawals-runbook.md</code>.{" "}
          <Link href="/withdrawals" className="underline hover:no-underline">
            /withdrawals
          </Link> (org)
        </p>
        <a
          href={exportHref}
          className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          download
        >
          Export CSV
        </a>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Aucun retrait.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                  id
                </th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                  created_at
                </th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                  user_id
                </th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">
                  amount
                </th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                  status
                </th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                  method
                </th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                  ref / note
                </th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                  decided_at
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <td className="px-3 py-2 font-mono text-xs" title={r.id}>
                    <Link
                      href={`/admin/withdrawals/${r.id}`}
                      className="text-zinc-900 dark:text-zinc-100 hover:underline"
                    >
                      {truncateId(r.id)}
                    </Link>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatDate(r.created_at)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs" title={r.user_id}>
                    {truncateId(r.user_id)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {(r.amount_cents / 100).toFixed(2)} €
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        r.status === "pending"
                          ? "text-amber-600 dark:text-amber-400"
                          : r.status === "paid"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-zinc-500"
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{r.method ?? "—"}</td>
                  <td className="px-3 py-2 max-w-[140px] truncate text-zinc-600 dark:text-zinc-400" title={[r.external_reference, r.admin_note].filter(Boolean).join(" / ")}>
                    {r.external_reference ? truncateRef(r.external_reference) : r.admin_note ? truncateRef(r.admin_note) : "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    {formatDate(r.decided_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
