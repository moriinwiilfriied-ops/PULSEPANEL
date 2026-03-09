import Link from "next/link";
import {
  getAdminWebhookEvents,
  getAdminWebhookStats,
  type AdminWebhookEventsFilters,
} from "@/src/lib/adminData";

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
    const href = q.toString() ? `/admin/webhooks?${q}` : "/admin/webhooks";
    return href;
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
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Webhooks (audit)
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Journal des événements Stripe reçus (table <code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">webhook_events</code>). Lien possible avec <code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">org_topups</code> via <code className="font-mono text-xs">stripe_checkout_session_id</code>.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Événements 24h</p>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{stats.eventsLast24h}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Erreurs 24h</p>
          <p className="text-lg font-semibold text-red-600 dark:text-red-400">{stats.errorsLast24h}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Non traités / ignorés 24h</p>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{stats.ignoredOrReceivedLast24h}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">checkout.session.completed 24h</p>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{stats.checkoutCompletedLast24h}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">Filtres :</span>
        <Link
          href="/admin/webhooks"
          className="text-sm px-2 py-1 rounded border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800"
        >
          Tous
        </Link>
        <span className="text-zinc-400">|</span>
        {["received", "processed", "ignored", "error"].map((s) => (
          <Link
            key={s}
            href={linkStatus(s)}
            className={`text-sm px-2 py-1 rounded border ${
              params.status === s
                ? "border-zinc-600 dark:border-zinc-400 bg-zinc-200 dark:bg-zinc-700"
                : "border-zinc-300 dark:border-zinc-600"
            }`}
          >
            {s}
          </Link>
        ))}
        <span className="text-zinc-400">|</span>
        <Link
          href={linkType("checkout.session.completed")}
          className={`text-sm px-2 py-1 rounded border ${
            params.type === "checkout.session.completed"
              ? "border-zinc-600 dark:border-zinc-400 bg-zinc-200 dark:bg-zinc-700"
              : "border-zinc-300 dark:border-zinc-600"
          }`}
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
            className="text-sm border border-zinc-300 dark:border-zinc-600 rounded px-2 py-1 bg-white dark:bg-zinc-900 w-48"
          />
          <button type="submit" className="text-sm px-2 py-1 rounded border border-zinc-300 dark:border-zinc-600">
            Rechercher
          </button>
        </form>
      </div>

      <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Derniers événements
      </h2>
      {events.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Aucun événement (ou aucun ne correspond aux filtres).
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">received_at</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">event_type</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">event_id</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">processing_status</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">processed_at</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">checkout_session_id</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">payment_intent_id</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">org_id</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">error</th>
              </tr>
            </thead>
            <tbody>
              {events.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                >
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.received_at)}</td>
                  <td className="px-3 py-2">{r.event_type}</td>
                  <td className="px-3 py-2 font-mono text-xs max-w-[140px] truncate" title={r.event_id}>
                    <Link href={`/admin/webhooks/${r.id}`} className="hover:underline">
                      {truncateId(r.event_id)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{r.processing_status}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.processed_at)}</td>
                  <td className="px-3 py-2 font-mono text-xs max-w-[140px] truncate" title={r.stripe_checkout_session_id ?? undefined}>
                    {truncateId(r.stripe_checkout_session_id)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs max-w-[140px] truncate" title={r.stripe_payment_intent_id ?? undefined}>
                    {truncateId(r.stripe_payment_intent_id)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs max-w-[100px] truncate" title={r.org_id ?? undefined}>
                    {truncateId(r.org_id)}
                  </td>
                  <td className="px-3 py-2 max-w-[120px] truncate text-red-600 dark:text-red-400" title={r.processing_error ?? undefined}>
                    {truncateError(r.processing_error)}
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
