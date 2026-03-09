import { getAdminLedgerEntries, getAdminOrgLedgerEntries } from "@/src/lib/adminData";
import { getLedgerReasonLabel } from "@/src/lib/ledgerReasonLabels";

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

export default async function AdminLedgerPage() {
  const [userEntries, orgEntries] = await Promise.all([
    getAdminLedgerEntries(150),
    getAdminOrgLedgerEntries(150),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Ledger
      </h1>

      <section>
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
          ledger_entries (user)
        </h2>
        {userEntries.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Aucune entrée.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                    created_at
                  </th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                    entity_type
                  </th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                    entity_id
                  </th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">
                    amount_cents
                  </th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                    reason
                  </th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                    ref_id
                  </th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                    status
                  </th>
                </tr>
              </thead>
              <tbody>
                {userEntries.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="px-3 py-2">{r.entity_type}</td>
                    <td className="px-3 py-2 font-mono text-xs" title={r.entity_id ?? undefined}>
                      {truncateId(r.entity_id)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.amount_cents > 0 ? "+" : ""}{r.amount_cents}
                    </td>
                    <td className="px-3 py-2" title={r.reason ?? undefined}>
                      {getLedgerReasonLabel(r.reason)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs" title={r.ref_id ?? undefined}>
                      {truncateId(r.ref_id)}
                    </td>
                    <td className="px-3 py-2">{r.status ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
          org_ledger_entries
        </h2>
        {orgEntries.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Aucune entrée.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                    created_at
                  </th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                    org_id
                  </th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400 text-right">
                    amount_cents
                  </th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                    reason
                  </th>
                  <th className="px-3 py-2 font-medium text-zinc-600 dark:text-zinc-400">
                    campaign_id
                  </th>
                </tr>
              </thead>
              <tbody>
                {orgEntries.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs" title={r.org_id}>
                      {truncateId(r.org_id)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.amount_cents > 0 ? "+" : ""}{r.amount_cents}
                    </td>
                    <td className="px-3 py-2" title={r.reason ?? undefined}>
                      {getLedgerReasonLabel(r.reason)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs" title={r.campaign_id ?? undefined}>
                      {truncateId(r.campaign_id)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Lecture seule. Les raisons sont affichées via le mapping canonique (campaign_activation / campaign_prepaid → Activation campagne). Survole la cellule pour voir la valeur brute.
      </p>
    </div>
  );
}
