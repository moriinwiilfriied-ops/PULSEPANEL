import Link from "next/link";
import {
  getAdminWebhookEvents,
  getAdminWebhookStats,
  type AdminWebhookEventsFilters,
} from "@/src/lib/adminData";
import { admin as copy } from "@/src/lib/uiCopy";
import { dash } from "@/src/lib/dashboardTheme";
import { PanelCard } from "@/src/components/ui/PanelCard";
import { MetricCard } from "@/src/components/ui/MetricCard";
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
  return id.length > 20 ? `${id.slice(0, 16)}…` : id;
}

function truncateError(s: string | null, max = 60) {
  if (!s) return "—";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

type SearchParams = Promise<{ status?: string; type?: string; search?: string }>;

const tableTh = "px-3 py-2 font-medium text-dash-text-muted text-left";
const tableTd = "px-3 py-2 text-dash-text";
const tableTdMuted = "px-3 py-2 text-dash-text-secondary";
const chipBase = "text-sm px-2 py-1 rounded-[var(--dash-radius)] border transition-colors";
const chipInactive = "border-dash-border bg-dash-surface-2/50 text-dash-text-secondary hover:bg-dash-surface-2";
const chipActive = "border-dash-border bg-dash-surface-2 text-dash-text";

export default async function AdminWebhooksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters: AdminWebhookEventsFilters = {
    status: params.status || undefined,
    event_type: params.type || undefined,
    search: params.search?.trim() || undefined,
    limit: 100,
  };

  function linkStatus(s: string) {
    const next = params.status === s ? undefined : s;
    const q = new URLSearchParams();
    if (next) q.set("status", next);
    if (params.type) q.set("type", params.type);
    if (params.search) q.set("search", params.search);
    return q.toString() ? `/admin/webhooks?${q}` : "/admin/webhooks";
  }
  function linkType(t: string) {
    const next = params.type === t ? undefined : t;
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (next) q.set("type", next);
    if (params.search) q.set("search", params.search);
    return q.toString() ? `/admin/webhooks?${q}` : "/admin/webhooks";
  }

  const [events, stats] = await Promise.all([
    getAdminWebhookEvents(filters),
    getAdminWebhookStats(),
  ]);

  return (
    <div className={dash.page}>
      <div className={dash.container}>
        <DashboardSection title={copy.webhooksTitle} subtitle={copy.webhooksSubtitle}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <MetricCard label="Événements 24h" value={stats.eventsLast24h} />
            <MetricCard label="Erreurs 24h" value={stats.errorsLast24h} />
            <MetricCard label="Non traités / ignorés 24h" value={stats.ignoredOrReceivedLast24h} />
            <MetricCard label="checkout.session.completed 24h" value={stats.checkoutCompletedLast24h} />
          </div>

          <div className="flex flex-wrap gap-2 items-center mb-4">
            <span className="text-sm text-dash-text-muted">Filtres :</span>
            <Link href="/admin/webhooks" className={`${chipBase} ${chipInactive}`}>
              Tous
            </Link>
            <span className="text-dash-text-muted">|</span>
            {["received", "processed", "ignored", "error"].map((s) => (
              <Link
                key={s}
                href={linkStatus(s)}
                className={`${chipBase} ${params.status === s ? chipActive : chipInactive}`}
              >
                {s}
              </Link>
            ))}
            <span className="text-dash-text-muted">|</span>
            <Link
              href={linkType("checkout.session.completed")}
              className={`${chipBase} ${params.type === "checkout.session.completed" ? chipActive : chipInactive}`}
            >
              checkout.session.completed
            </Link>
            <form method="get" action="/admin/webhooks" className="inline-flex gap-1">
              <input type="hidden" name="status" value={params.status ?? ""} />
              <input type="hidden" name="type" value={params.type ?? ""} />
              <input
                name="search"
                defaultValue={params.search}
                placeholder="event_id / checkout_session_id"
                className="text-sm border border-dash-border rounded-[var(--dash-radius)] px-2 py-1 bg-dash-surface-2 w-48 text-dash-text placeholder:text-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent/30"
              />
              <button type="submit" className={`${dash.btn} ${dash.btnSecondary}`}>
                Rechercher
              </button>
            </form>
          </div>

          <h2 className={dash.sectionTitle + " mb-3"}>Derniers événements</h2>
          {events.length === 0 ? (
            <PanelCard className="py-12 px-6 text-center">
              <p className="text-dash-text-secondary">{copy.webhooksEmpty}</p>
            </PanelCard>
          ) : (
            <PanelCard className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-dash-border-subtle">
                      <th className={tableTh}>received_at</th>
                      <th className={tableTh}>event_type</th>
                      <th className={tableTh}>event_id</th>
                      <th className={tableTh}>processing_status</th>
                      <th className={tableTh}>processed_at</th>
                      <th className={tableTh}>checkout_session_id</th>
                      <th className={tableTh}>payment_intent_id</th>
                      <th className={tableTh}>org_id</th>
                      <th className={tableTh}>error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((r) => (
                      <tr key={r.id} className="border-b border-dash-border-subtle/50 last:border-0 hover:bg-dash-surface-2/50">
                        <td className={`${tableTdMuted} whitespace-nowrap`}>{formatDate(r.received_at)}</td>
                        <td className={tableTd}>{r.event_type}</td>
                        <td className={`${tableTd} font-mono text-xs max-w-[140px] truncate`} title={r.event_id}>
                          <Link href={`/admin/webhooks/${r.id}`} className={dash.link}>
                            {truncateId(r.event_id)}
                          </Link>
                        </td>
                        <td className={tableTd}>{r.processing_status}</td>
                        <td className={`${tableTdMuted} whitespace-nowrap`}>{formatDate(r.processed_at)}</td>
                        <td className={`${tableTdMuted} font-mono text-xs max-w-[140px] truncate`} title={r.stripe_checkout_session_id ?? undefined}>
                          {truncateId(r.stripe_checkout_session_id)}
                        </td>
                        <td className={`${tableTdMuted} font-mono text-xs max-w-[140px] truncate`} title={r.stripe_payment_intent_id ?? undefined}>
                          {truncateId(r.stripe_payment_intent_id)}
                        </td>
                        <td className={`${tableTdMuted} font-mono text-xs max-w-[100px] truncate`} title={r.org_id ?? undefined}>
                          {truncateId(r.org_id)}
                        </td>
                        <td className={`${tableTd} max-w-[120px] truncate text-red-400`} title={r.processing_error ?? undefined}>
                          {truncateError(r.processing_error)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PanelCard>
          )}
        </DashboardSection>
      </div>
    </div>
  );
}
