import { getAdminLedgerEntries, getAdminOrgLedgerEntries } from "@/src/lib/adminData";
import { getLedgerReasonLabel } from "@/src/lib/ledgerReasonLabels";
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

const tableTh = "px-3 py-2 font-medium text-dash-text-muted text-left";
const tableTd = "px-3 py-2 text-dash-text";
const tableTdMuted = "px-3 py-2 text-dash-text-secondary";

export default async function AdminLedgerPage() {
  const [userEntries, orgEntries] = await Promise.all([
    getAdminLedgerEntries(150),
    getAdminOrgLedgerEntries(150),
  ]);

  return (
    <div className={dash.page}>
      <div className={dash.container}>
        <h1 className={dash.headlineHero}>{copy.ledgerTitle}</h1>

        <DashboardSection title="ledger_entries (user)" className="mt-8">
          {userEntries.length === 0 ? (
            <PanelCard className="py-12 px-6 text-center">
              <p className="text-dash-text-secondary">{copy.ledgerEmpty}</p>
            </PanelCard>
          ) : (
            <PanelCard className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-dash-border-subtle">
                      <th className={tableTh}>created_at</th>
                      <th className={tableTh}>entity_type</th>
                      <th className={tableTh}>entity_id</th>
                      <th className={`${tableTh} text-right`}>amount_cents</th>
                      <th className={tableTh}>reason</th>
                      <th className={tableTh}>ref_id</th>
                      <th className={tableTh}>status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userEntries.map((r) => (
                      <tr key={r.id} className="border-b border-dash-border-subtle/50 last:border-0 hover:bg-dash-surface-2/50">
                        <td className={`${tableTdMuted} whitespace-nowrap`}>{formatDate(r.created_at)}</td>
                        <td className={tableTd}>{r.entity_type}</td>
                        <td className={`${tableTd} font-mono text-xs`} title={r.entity_id ?? undefined}>
                          {truncateId(r.entity_id)}
                        </td>
                        <td className={`${tableTd} text-right`}>
                          {r.amount_cents > 0 ? "+" : ""}{r.amount_cents}
                        </td>
                        <td className={tableTd} title={r.reason ?? undefined}>
                          {getLedgerReasonLabel(r.reason)}
                        </td>
                        <td className={`${tableTdMuted} font-mono text-xs`} title={r.ref_id ?? undefined}>
                          {truncateId(r.ref_id)}
                        </td>
                        <td className={tableTd}>{r.status ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PanelCard>
          )}
        </DashboardSection>

        <DashboardSection title="org_ledger_entries" className="mt-8">
          {orgEntries.length === 0 ? (
            <PanelCard className="py-12 px-6 text-center">
              <p className="text-dash-text-secondary">{copy.ledgerEmpty}</p>
            </PanelCard>
          ) : (
            <PanelCard className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-dash-border-subtle">
                      <th className={tableTh}>created_at</th>
                      <th className={tableTh}>org_id</th>
                      <th className={`${tableTh} text-right`}>amount_cents</th>
                      <th className={tableTh}>reason</th>
                      <th className={tableTh}>campaign_id</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgEntries.map((r) => (
                      <tr key={r.id} className="border-b border-dash-border-subtle/50 last:border-0 hover:bg-dash-surface-2/50">
                        <td className={`${tableTdMuted} whitespace-nowrap`}>{formatDate(r.created_at)}</td>
                        <td className={`${tableTd} font-mono text-xs`} title={r.org_id}>
                          {truncateId(r.org_id)}
                        </td>
                        <td className={`${tableTd} text-right`}>
                          {r.amount_cents > 0 ? "+" : ""}{r.amount_cents}
                        </td>
                        <td className={tableTd} title={r.reason ?? undefined}>
                          {getLedgerReasonLabel(r.reason)}
                        </td>
                        <td className={`${tableTdMuted} font-mono text-xs`} title={r.campaign_id ?? undefined}>
                          {truncateId(r.campaign_id)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PanelCard>
          )}
        </DashboardSection>

        <p className="text-xs text-dash-text-muted mt-6">
          Lecture seule. Les raisons sont affichées via le mapping canonique. Survole la cellule pour voir la valeur brute.
        </p>
      </div>
    </div>
  );
}
