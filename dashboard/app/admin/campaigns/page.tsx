import Link from "next/link";
import {
  getAdminCampaigns,
  getAdminCampaignStats,
  type AdminCampaignsFilters,
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
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function truncateQuestion(s: string | null, max = 50) {
  if (!s) return "—";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

type SearchParams = Promise<{ status?: string; org_id?: string; search?: string }>;

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
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Campagnes (global)
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Vue cross-org. Détail et actions (pause / reprendre / terminer) sur chaque campagne.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Actives</p>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{stats.activeCount}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">En pause</p>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{stats.pausedCount}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Terminées (7j)</p>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{stats.completedLast7d}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Terminées (30j)</p>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{stats.completedLast30d}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Avec flags</p>
          <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">{stats.withFlagsCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">Filtres :</span>
        <Link href="/admin/campaigns" className="text-sm px-2 py-1 rounded border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800">
          Tous
        </Link>
        {["active", "paused", "completed"].map((s) => (
          <Link
            key={s}
            href={linkStatus(s)}
            className={`text-sm px-2 py-1 rounded border ${params.status === s ? "border-zinc-600 dark:border-zinc-400 bg-zinc-200 dark:bg-zinc-700" : "border-zinc-300 dark:border-zinc-600"}`}
          >
            {s}
          </Link>
        ))}
        <form method="get" action="/admin/campaigns" className="inline-flex gap-1">
          <input type="hidden" name="status" value={params.status ?? ""} />
          <input type="hidden" name="org_id" value={params.org_id ?? ""} />
          <input
            name="search"
            defaultValue={params.search}
            placeholder="id / question / nom"
            className="text-sm border border-zinc-300 dark:border-zinc-600 rounded px-2 py-1 bg-white dark:bg-zinc-900 w-48"
          />
          <button type="submit" className="text-sm px-2 py-1 rounded border border-zinc-300 dark:border-zinc-600">
            OK
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Aucune campagne (ou aucun ne correspond aux filtres).
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">id</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">org</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 max-w-[180px]">question</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">status</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">template</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">quota</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">responses</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">reward</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">coût total</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">created_at</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">qualité</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">flags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <td className="px-3 py-2 font-mono text-xs" title={r.id}>
                    <Link href={`/admin/campaigns/${r.id}`} className="hover:underline">
                      {truncateId(r.id)}
                    </Link>
                  </td>
                  <td className="px-3 py-2 max-w-[120px] truncate" title={r.org_name ?? r.org_id ?? undefined}>
                    {r.org_name ?? truncateId(r.org_id)}
                  </td>
                  <td className="px-3 py-2 max-w-[180px] truncate text-zinc-600 dark:text-zinc-400" title={r.question ?? undefined}>
                    {truncateQuestion(r.question)}
                  </td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2">{r.template_key ?? r.template ?? "—"}</td>
                  <td className="px-3 py-2 text-right">{r.quota}</td>
                  <td className="px-3 py-2 text-right">{r.responses_count}</td>
                  <td className="px-3 py-2 text-right">{(r.reward_cents / 100).toFixed(2)} €</td>
                  <td className="px-3 py-2 text-right">{(r.cost_total_cents / 100).toFixed(2)} €</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.created_at)}</td>
                  <td className="px-3 py-2">
                    {r.pct_valid != null ? `${Number(r.pct_valid).toFixed(1)}% valide` : "—"}
                    {r.pct_too_fast != null ? ` / ${Number(r.pct_too_fast).toFixed(1)}% fast` : ""}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.flags_count > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400">{r.flags_count}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Limite 200. Clique sur un id pour détail et actions (pause / reprendre / terminer).
      </p>
    </div>
  );
}
