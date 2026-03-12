import Link from "next/link";
import { getAdminUsers } from "@/src/lib/adminData";
import { admin as copy } from "@/src/lib/uiCopy";
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

function truncateId(id: string) {
  if (!id) return "—";
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function truncateReason(s: string | null, max = 30) {
  if (!s) return "—";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

const tableTh = "px-3 py-2 font-medium text-dash-text-muted text-left";
const tableTd = "px-3 py-2 text-dash-text";
const tableTdMuted = "px-3 py-2 text-dash-text-secondary";

export default async function AdminUsersPage() {
  const rows = await getAdminUsers();

  return (
    <div className={dash.page}>
      <div className={dash.container}>
        <DashboardSection title={copy.usersTitle}>
          {rows.length === 0 ? (
            <PanelCard className="py-12 px-6 text-center">
              <p className="text-dash-text-secondary">{copy.usersEmpty}</p>
            </PanelCard>
          ) : (
            <>
              <PanelCard className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-dash-border-subtle">
                        <th className={tableTh}>user_id</th>
                        <th className={tableTh}>created_at</th>
                        <th className={tableTh}>onboarding</th>
                        <th className={tableTh}>region</th>
                        <th className={tableTh}>trust</th>
                        <th className={`${tableTh} text-right`}>pending</th>
                        <th className={`${tableTh} text-right`}>available</th>
                        <th className={`${tableTh} text-right`}>withdrawals</th>
                        <th className={`${tableTh} text-right`}>flags</th>
                        <th className={tableTh}>cashout</th>
                        <th className={tableTh}>frozen_reason</th>
                        <th className={tableTh}>last_activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-dash-border-subtle/50 last:border-0 hover:bg-dash-surface-2/50"
                        >
                          <td className={`${tableTd} font-mono text-xs`} title={r.id}>
                            <Link href={`/admin/users/${r.id}`} className={dash.link}>
                              {truncateId(r.id)}
                            </Link>
                          </td>
                          <td className={`${tableTdMuted} whitespace-nowrap`}>{formatDate(r.created_at)}</td>
                          <td className={tableTd}>{r.onboarding_completed ? "oui" : "non"}</td>
                          <td className={`${tableTdMuted} max-w-[120px] truncate`}>{r.region ?? "—"}</td>
                          <td className={tableTd}>{r.trust_level ?? "—"} ({r.trust_score})</td>
                          <td className={`${tableTd} text-right`}>{(r.pending_cents / 100).toFixed(2)} €</td>
                          <td className={`${tableTd} text-right`}>{(r.available_cents / 100).toFixed(2)} €</td>
                          <td className={`${tableTd} text-right`}>{r.withdrawals_count}</td>
                          <td className={`${tableTd} text-right`}>{r.flags_count}</td>
                          <td className={tableTd}>
                            {r.withdrawals_frozen ? (
                              <StatusBadge variant="danger">Bloqué</StatusBadge>
                            ) : (
                              <StatusBadge variant="neutral">Actif</StatusBadge>
                            )}
                          </td>
                          <td className={`${tableTdMuted} max-w-[120px] truncate`} title={r.withdrawals_frozen_reason ?? undefined}>
                            {r.withdrawals_frozen ? truncateReason(r.withdrawals_frozen_reason) : "—"}
                          </td>
                          <td className={`${tableTdMuted} whitespace-nowrap`}>{formatDate(r.last_activity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </PanelCard>
              <p className="text-xs text-dash-text-muted mt-3">{copy.limitReadOnly}</p>
            </>
          )}
        </DashboardSection>
      </div>
    </div>
  );
}
