import Link from "next/link";
import { getAdminFlags } from "@/src/lib/adminData";

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
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Flags
      </h1>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">Filtres :</span>
        <Link href="/admin/flags" className="text-sm px-2 py-1 rounded border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800">
          Tous
        </Link>
        {["open", "legit", "watch", "actioned"].map((s) => (
          <Link
            key={s}
            href={linkStatus(s)}
            className={`text-sm px-2 py-1 rounded border ${params.status === s ? "border-zinc-600 dark:border-zinc-400 bg-zinc-200 dark:bg-zinc-700" : "border-zinc-300 dark:border-zinc-600"}`}
          >
            {s}
          </Link>
        ))}
        <span className="text-zinc-400">|</span>
        {[2, 3].map((sev) => (
          <Link key={sev} href={linkSeverity(sev)} className={`text-sm px-2 py-1 rounded border ${params.severity === String(sev) ? "border-zinc-600 dark:border-zinc-400 bg-zinc-200 dark:bg-zinc-700" : "border-zinc-300 dark:border-zinc-600"}`}>
            severity {sev}
          </Link>
        ))}
        <form method="get" action="/admin/flags" className="inline-flex gap-1">
          <input type="hidden" name="status" value={params.status ?? ""} />
          <input type="hidden" name="severity" value={params.severity ?? ""} />
          <input
            name="search_user_id"
            defaultValue={params.search_user_id}
            placeholder="user_id (recherche)"
            className="text-sm border border-zinc-300 dark:border-zinc-600 rounded px-2 py-1 bg-white dark:bg-zinc-900 w-40"
          />
          <button type="submit" className="text-sm px-2 py-1 rounded border border-zinc-300 dark:border-zinc-600">
            OK
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Aucun flag (ou aucun ne correspond aux filtres).
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
            Les flags sont créés par le trigger qualité (too_fast, empty_answer).
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">id</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">created_at</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">user_id</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">reason</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">severity</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">status</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 max-w-[140px]">admin_note</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">cashout</th>
                <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">user trust</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <td className="px-3 py-2 font-mono text-xs" title={r.id}>
                    <Link href={`/admin/flags/${r.id}`} className="hover:underline">
                      {truncateId(r.id)}
                    </Link>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.created_at)}</td>
                  <td className="px-3 py-2 font-mono text-xs" title={r.user_id ?? undefined}>
                    {r.user_id ? (
                      <Link href={`/admin/users/${r.user_id}`} className="hover:underline">
                        {truncateId(r.user_id)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">{r.reason ?? "—"}</td>
                  <td className="px-3 py-2">{r.severity ?? "—"}</td>
                  <td className="px-3 py-2">{r.status ?? "—"}</td>
                  <td className="px-3 py-2 max-w-[140px] truncate text-zinc-600 dark:text-zinc-400" title={r.admin_note ?? undefined}>
                    {truncateNote(r.admin_note)}
                  </td>
                  <td className="px-3 py-2">
                    {r.user_withdrawals_frozen ? (
                      <span className="text-red-600 dark:text-red-400">frozen</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {r.user_trust_level ?? "—"} {r.user_trust_score != null ? `(${r.user_trust_score})` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Limite 200. Clique sur un id pour détail et actions.
      </p>
    </div>
  );
}
