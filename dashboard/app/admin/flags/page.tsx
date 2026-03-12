import Link from "next/link";
import { getAdminFlags } from "@/src/lib/adminData";
import { admin as copy } from "@/src/lib/uiCopy";
import { dash } from "@/src/lib/dashboardTheme";
import { PanelCard } from "@/src/components/ui/PanelCard";
import { DashboardSection } from "@/src/components/ui/DashboardSection";

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

function truncateNote(s: string | null, max = 40) {
  if (!s) return "—";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

type SearchParams = Promise<{ status?: string; severity?: string; search_user_id?: string }>;

const tableTh = "px-3 py-2 font-medium text-dash-text-muted text-left";
const tableTd = "px-3 py-2 text-dash-text";
const tableTdMuted = "px-3 py-2 text-dash-text-secondary";
const chipBase = "text-sm px-2 py-1 rounded-[var(--dash-radius)] border transition-colors";
const chipInactive = "border-dash-border bg-dash-surface-2/50 text-dash-text-secondary hover:bg-dash-surface-2";
const chipActive = "border-dash-border bg-dash-surface-2 text-dash-text";

export default async function AdminFlagsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = {
    status: params.status || undefined,
    severity: params.severity ? parseInt(params.severity, 10) : undefined,
    search_user_id: params.search_user_id?.trim() || undefined,
    limit: 200,
  };
  const rows = await getAdminFlags(filters);

  function linkStatus(s: string) {
    const next = params.status === s ? undefined : s;
    const q = new URLSearchParams();
    if (next) q.set("status", next);
    if (params.severity) q.set("severity", params.severity);
    if (params.search_user_id) q.set("search_user_id", params.search_user_id);
    return q.toString() ? `/admin/flags?${q}` : "/admin/flags";
  }
  function linkSeverity(sev: number) {
    const next = params.severity === String(sev) ? undefined : String(sev);
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (next) q.set("severity", next);
    if (params.search_user_id) q.set("search_user_id", params.search_user_id);
    return q.toString() ? `/admin/flags?${q}` : "/admin/flags";
  }

  return (
    <div className={dash.page}>
      <div className={dash.container}>
        <DashboardSection title={copy.flagsTitle}>
          <div className="flex flex-wrap gap-2 items-center mb-4">
            <span className="text-sm text-dash-text-muted">Filtres :</span>
            <Link href="/admin/flags" className={`${chipBase} ${chipInactive}`}>
              Tous
            </Link>
            {["open", "legit", "watch", "actioned"].map((s) => (
              <Link
                key={s}
                href={linkStatus(s)}
                className={`${chipBase} ${params.status === s ? chipActive : chipInactive}`}
              >
                {s}
              </Link>
            ))}
            <span className="text-dash-text-muted">|</span>
            {[2, 3].map((sev) => (
              <Link
                key={sev}
                href={linkSeverity(sev)}
                className={`${chipBase} ${params.severity === String(sev) ? chipActive : chipInactive}`}
              >
                Sévérité {sev}
              </Link>
            ))}
            <form method="get" action="/admin/flags" className="inline-flex gap-1">
              <input type="hidden" name="status" value={params.status ?? ""} />
              <input type="hidden" name="severity" value={params.severity ?? ""} />
              <input
                name="search_user_id"
                defaultValue={params.search_user_id}
                placeholder="user_id"
                className="text-sm border border-dash-border rounded-[var(--dash-radius)] px-2 py-1 bg-dash-surface-2 w-40 text-dash-text placeholder:text-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent/30"
              />
              <button type="submit" className={`${dash.btn} ${dash.btnSecondary}`}>
                OK
              </button>
            </form>
          </div>

          {rows.length === 0 ? (
            <PanelCard className="py-12 px-6 text-center">
              <p className="text-dash-text-secondary">{copy.flagsEmpty}</p>
              <p className="text-xs text-dash-text-muted mt-2">
                Les signaux sont créés par le trigger qualité (too_fast, empty_answer).
              </p>
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
                        <th className={tableTh}>reason</th>
                        <th className={tableTh}>severity</th>
                        <th className={tableTh}>status</th>
                        <th className={tableTh}>admin_note</th>
                        <th className={tableTh}>cashout</th>
                        <th className={tableTh}>user trust</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-b border-dash-border-subtle/50 last:border-0 hover:bg-dash-surface-2/50">
                          <td className={`${tableTd} font-mono text-xs`} title={r.id}>
                            <Link href={`/admin/flags/${r.id}`} className={dash.link}>
                              {truncateId(r.id)}
                            </Link>
                          </td>
                          <td className={`${tableTdMuted} whitespace-nowrap`}>{formatDate(r.created_at)}</td>
                          <td className={`${tableTd} font-mono text-xs`} title={r.user_id ?? undefined}>
                            {r.user_id ? (
                              <Link href={`/admin/users/${r.user_id}`} className={dash.link}>
                                {truncateId(r.user_id)}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className={tableTd}>{r.reason ?? "—"}</td>
                          <td className={tableTd}>{r.severity ?? "—"}</td>
                          <td className={tableTd}>{r.status ?? "—"}</td>
                          <td className={`${tableTdMuted} max-w-[140px] truncate`} title={r.admin_note ?? undefined}>
                            {truncateNote(r.admin_note)}
                          </td>
                          <td className={tableTd}>
                            {r.user_withdrawals_frozen ? (
                              <span className="text-red-400">Bloqué</span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className={tableTd}>
                            {r.user_trust_level ?? "—"} {r.user_trust_score != null ? `(${r.user_trust_score})` : ""}
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
