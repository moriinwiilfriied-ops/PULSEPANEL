import Link from "next/link";
import {
  getAdminCampaigns,
  getAdminCampaignStats,
  type AdminCampaignsFilters,
} from "@/src/lib/adminData";
import { admin as copy } from "@/src/lib/uiCopy";
import { dash } from "@/src/lib/dashboardTheme";
import { PanelCard } from "@/src/components/ui/PanelCard";
import { MetricCard } from "@/src/components/ui/MetricCard";
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

function truncateId(id: string | null) {
  if (!id) return "—";
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function truncateQuestion(s: string | null, max = 50) {
  if (!s) return "—";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

type SearchParams = Promise<{ status?: string; org_id?: string; search?: string }>;

const tableTh = "px-3 py-2 font-medium text-dash-text-muted text-left";
const tableTd = "px-3 py-2 text-dash-text";
const tableTdMuted = "px-3 py-2 text-dash-text-secondary";
const chipBase = "text-sm px-2 py-1 rounded-[var(--dash-radius)] border transition-colors";
const chipInactive = "border-dash-border bg-dash-surface-2/50 text-dash-text-secondary hover:bg-dash-surface-2";
const chipActive = "border-dash-border bg-dash-surface-2 text-dash-text";

export default async function AdminCampaignsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters: AdminCampaignsFilters = {
    status: params.status || undefined,
    org_id: params.org_id || undefined,
    search: params.search?.trim() || undefined,
    limit: 200,
  };

  const [rows, stats] = await Promise.all([
    getAdminCampaigns(filters),
    getAdminCampaignStats(),
  ]);

  function linkStatus(s: string) {
    const next = params.status === s ? undefined : s;
    const q = new URLSearchParams();
    if (next) q.set("status", next);
    if (params.org_id) q.set("org_id", params.org_id);
    if (params.search) q.set("search", params.search);
    return q.toString() ? `/admin/campaigns?${q}` : "/admin/campaigns";
  }

  return (
    <div className={dash.page}>
      <div className={dash.container}>
        <DashboardSection title={copy.campaignsTitle} subtitle={copy.campaignsSubtitle}>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            <MetricCard label="Actives" value={stats.activeCount} />
            <MetricCard label="En pause" value={stats.pausedCount} />
            <MetricCard label="Terminées (7j)" value={stats.completedLast7d} />
            <MetricCard label="Terminées (30j)" value={stats.completedLast30d} />
            <MetricCard label="Avec signaux" value={stats.withFlagsCount} />
          </div>

          <div className="flex flex-wrap gap-2 items-center mb-4">
            <span className="text-sm text-dash-text-muted">Filtres :</span>
            <Link href="/admin/campaigns" className={`${chipBase} ${chipInactive}`}>
              Tous
            </Link>
            {["active", "paused", "completed"].map((s) => (
              <Link
                key={s}
                href={linkStatus(s)}
                className={`${chipBase} ${params.status === s ? chipActive : chipInactive}`}
              >
                {s === "active" ? "Actives" : s === "paused" ? "En pause" : "Terminées"}
              </Link>
            ))}
            <form method="get" action="/admin/campaigns" className="inline-flex gap-1">
              <input type="hidden" name="status" value={params.status ?? ""} />
              <input type="hidden" name="org_id" value={params.org_id ?? ""} />
              <input
                name="search"
                defaultValue={params.search}
                placeholder="id / question / nom"
                className="text-sm border border-dash-border rounded-[var(--dash-radius)] px-2 py-1 bg-dash-surface-2 w-48 text-dash-text placeholder:text-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent/30"
              />
              <button type="submit" className={`${dash.btn} ${dash.btnSecondary}`}>
                OK
              </button>
            </form>
          </div>

          {rows.length === 0 ? (
            <PanelCard className="py-12 px-6 text-center">
              <p className="text-dash-text-secondary">{copy.campaignsEmpty}</p>
            </PanelCard>
          ) : (
            <>
              <PanelCard className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-dash-border-subtle">
                        <th className={tableTh}>id</th>
                        <th className={tableTh}>org</th>
                        <th className={tableTh}>question</th>
                        <th className={tableTh}>status</th>
                        <th className={tableTh}>template</th>
                        <th className={`${tableTh} text-right`}>quota</th>
                        <th className={`${tableTh} text-right`}>responses</th>
                        <th className={`${tableTh} text-right`}>reward</th>
                        <th className={`${tableTh} text-right`}>coût total</th>
                        <th className={tableTh}>created_at</th>
                        <th className={tableTh}>qualité</th>
                        <th className={`${tableTh} text-right`}>flags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-b border-dash-border-subtle/50 last:border-0 hover:bg-dash-surface-2/50">
                          <td className={`${tableTd} font-mono text-xs`} title={r.id}>
                            <Link href={`/admin/campaigns/${r.id}`} className={dash.link}>
                              {truncateId(r.id)}
                            </Link>
                          </td>
                          <td className={`${tableTdMuted} max-w-[120px] truncate`} title={r.org_name ?? r.org_id ?? undefined}>
                            {r.org_name ?? truncateId(r.org_id)}
                          </td>
                          <td className={`${tableTdMuted} max-w-[180px] truncate`} title={r.question ?? undefined}>
                            {truncateQuestion(r.question)}
                          </td>
                          <td className={tableTd}>
                            <StatusBadge
                              variant={
                                r.status === "active"
                                  ? "success"
                                  : r.status === "paused"
                                    ? "warning"
                                    : "neutral"
                              }
                            >
                              {r.status === "active" ? "Active" : r.status === "paused" ? "En pause" : "Terminée"}
                            </StatusBadge>
                          </td>
                          <td className={tableTd}>{r.template_key ?? r.template ?? "—"}</td>
                          <td className={`${tableTd} text-right`}>{r.quota}</td>
                          <td className={`${tableTd} text-right`}>{r.responses_count}</td>
                          <td className={`${tableTd} text-right`}>{(r.reward_cents / 100).toFixed(2)} €</td>
                          <td className={`${tableTd} text-right`}>{(r.cost_total_cents / 100).toFixed(2)} €</td>
                          <td className={`${tableTdMuted} whitespace-nowrap`}>{formatDate(r.created_at)}</td>
                          <td className={tableTd}>
                            {r.pct_valid != null ? `${Number(r.pct_valid).toFixed(1)}% valide` : "—"}
                            {r.pct_too_fast != null ? ` / ${Number(r.pct_too_fast).toFixed(1)}% fast` : ""}
                          </td>
                          <td className={`${tableTd} text-right`}>
                            {r.flags_count > 0 ? (
                              <StatusBadge variant="warning">{r.flags_count}</StatusBadge>
                            ) : (
                              "0"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </PanelCard>
              <p className="text-xs text-dash-text-muted mt-3">{copy.limitHint}</p>
            </>
          )}
        </DashboardSection>
      </div>
    </div>
  );
}
