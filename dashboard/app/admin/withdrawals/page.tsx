import Link from "next/link";
import { Suspense } from "react";
import { getAdminWithdrawals, getAdminWithdrawalsKpis } from "@/src/lib/adminData";
import { admin as copy } from "@/src/lib/uiCopy";
import { dash } from "@/src/lib/dashboardTheme";
import { PanelCard } from "@/src/components/ui/PanelCard";
import { MetricCard } from "@/src/components/ui/MetricCard";
import { DashboardSection } from "@/src/components/ui/DashboardSection";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
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

const tableTh = "px-3 py-2 font-medium text-dash-text-muted text-left";
const tableTd = "px-3 py-2 text-dash-text";
const tableTdMuted = "px-3 py-2 text-dash-text-secondary";

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
    getAdminWithdrawals({ status, since, searchId, limit: 200 }),
    getAdminWithdrawalsKpis(),
  ]);

  const exportHref = `/api/admin/withdrawals/export?${new URLSearchParams({
    ...(status ? { status } : {}),
    ...(since ? { since } : {}),
    ...(searchId ? { q: searchId } : {}),
  }).toString()}`;

  return (
    <div className={dash.page}>
      <div className={dash.container}>
        <DashboardSection title={copy.withdrawalsTitle}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <MetricCard label="En attente" value={kpis.pendingCount} />
            <MetricCard label="Montant total pending" value={`${(kpis.pendingTotalCents / 100).toFixed(2)} €`} />
            <MetricCard label="Payés (30 j)" value={kpis.paidCountLast30} />
          </div>

          <Suspense fallback={<PanelCard className="h-12 animate-pulse"><span className="sr-only">Chargement…</span></PanelCard>}>
            <AdminWithdrawalsFilters status={status} since={since} q={searchId} />
          </Suspense>

          <div className="flex items-center gap-4 flex-wrap mt-4 mb-4">
            <p className="text-xs text-dash-text-muted">
              Traitement avec traçabilité : clic sur un id → détail → Rejeter / Marquer payé.{" "}
              <Link href="/withdrawals" className={dash.link}>(vue org)</Link>
            </p>
            <a href={exportHref} download className={`${dash.btn} ${dash.btnSecondary}`}>
              Export CSV
            </a>
          </div>

          {rows.length === 0 ? (
            <PanelCard className="py-12 px-6 text-center">
              <p className="text-dash-text-secondary">{copy.withdrawalsEmpty}</p>
            </PanelCard>
          ) : (
            <>
              <PanelCard className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-dash-border-subtle">
                        <th className={tableTh}>id</th>
                        <th className={tableTh}>created_at</th>
                        <th className={tableTh}>user_id</th>
                        <th className={`${tableTh} text-right`}>amount</th>
                        <th className={tableTh}>status</th>
                        <th className={tableTh}>method</th>
                        <th className={tableTh}>ref / note</th>
                        <th className={tableTh}>decided_at</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-dash-border-subtle/50 last:border-0 hover:bg-dash-surface-2/50"
                        >
                          <td className={`${tableTd} font-mono text-xs`} title={r.id}>
                            <Link href={`/admin/withdrawals/${r.id}`} className={dash.link}>
                              {truncateId(r.id)}
                            </Link>
                          </td>
                          <td className={`${tableTdMuted} whitespace-nowrap`}>{formatDate(r.created_at)}</td>
                          <td className={`${tableTd} font-mono text-xs`} title={r.user_id}>
                            {truncateId(r.user_id)}
                          </td>
                          <td className={`${tableTd} text-right`}>{(r.amount_cents / 100).toFixed(2)} €</td>
                          <td className={tableTd}>
                            {r.status === "pending" ? (
                              <StatusBadge variant="warning">En attente</StatusBadge>
                            ) : r.status === "paid" ? (
                              <StatusBadge variant="success">Payé</StatusBadge>
                            ) : (
                              <StatusBadge variant="danger">Refusé</StatusBadge>
                            )}
                          </td>
                          <td className={tableTd}>{r.method ?? "—"}</td>
                          <td className={`${tableTdMuted} max-w-[140px] truncate`} title={[r.external_reference, r.admin_note].filter(Boolean).join(" / ")}>
                            {r.external_reference ? truncateRef(r.external_reference) : r.admin_note ? truncateRef(r.admin_note) : "—"}
                          </td>
                          <td className={`${tableTdMuted} whitespace-nowrap`}>{formatDate(r.decided_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </PanelCard>
            </>
          )}
        </DashboardSection>
      </div>
    </div>
  );
}
