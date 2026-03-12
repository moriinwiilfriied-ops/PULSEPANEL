import Link from "next/link";
import { getAdminOverviewStats, getAdminPilotKpis } from "@/src/lib/adminData";
import { admin as copy } from "@/src/lib/uiCopy";
import { dash } from "@/src/lib/dashboardTheme";
import { PanelCard } from "@/src/components/ui/PanelCard";
import { DashboardSection } from "@/src/components/ui/DashboardSection";

export default async function AdminOverviewPage() {
  const [stats, pilotKpis] = await Promise.all([
    getAdminOverviewStats(),
    getAdminPilotKpis(),
  ]);

  const cards = [
    {
      label: "Retraits en attente",
      value: stats.withdrawalsPendingCount,
      href: "/admin/withdrawals?status=pending",
    },
    {
      label: "Signaux ouverts",
      value: stats.flagsOpenCount,
      href: "/admin/flags",
    },
    {
      label: "Campagnes actives",
      value: stats.campaignsActiveCount,
    },
    {
      label: "Réponses (24h)",
      value: stats.responsesLast24hCount,
    },
    {
      label: "Recharges org (7j)",
      value: stats.orgTopupsLast7dCount,
      href: "/admin/webhooks",
    },
  ];

  return (
    <div className={dash.page}>
      <div className={dash.container}>
        <h1 className={dash.headlineHero}>{copy.overviewTitle}</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {cards.map((c) => (
            <PanelCard key={c.label}>
              <p className={dash.metricLabel}>{c.label}</p>
              <p className={`${dash.metricValue} mt-1`}>{c.value}</p>
              {c.href ? (
                <Link href={c.href} className={`text-xs mt-2 inline-block ${dash.link}`}>
                  Voir →
                </Link>
              ) : null}
            </PanelCard>
          ))}
        </div>

        <DashboardSection
          title="Audit webhooks"
          className="mt-8"
        >
          <PanelCard>
            {stats.webhookEventsAvailable ? (
              <p className="text-sm text-dash-text-secondary">
                Table webhook_events disponible.
              </p>
            ) : (
              <p className="text-sm text-amber-400">
                Audit webhooks natif non encore implémenté (pas de table webhook_events). Vue provisoire basée sur org_topups dans Webhooks.
              </p>
            )}
          </PanelCard>
        </DashboardSection>

        {pilotKpis && (
          <DashboardSection
            title="KPI pilot (ops)"
            className="mt-8"
          >
            <PanelCard>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className={dash.metricLabel}>Signaux ouverts</p>
                  <p className={dash.metricValue}>{pilotKpis.flags_open}</p>
                </div>
                <div>
                  <p className={dash.metricLabel}>Erreurs webhook 24h</p>
                  <p className={dash.metricValue}>{pilotKpis.webhook_errors_24h}</p>
                </div>
                <div>
                  <p className={dash.metricLabel}>Erreurs webhook 7j</p>
                  <p className={dash.metricValue}>{pilotKpis.webhook_errors_7d}</p>
                </div>
                <div>
                  <p className={dash.metricLabel}>Retraits en attente</p>
                  <p className={dash.metricValue}>{pilotKpis.withdrawals_pending}</p>
                </div>
                <div>
                  <p className={dash.metricLabel}>Retraits payés (7j)</p>
                  <p className={dash.metricValue}>{pilotKpis.withdrawals_paid_7d}</p>
                </div>
                <div>
                  <p className={dash.metricLabel}>Orgs repeat eligible</p>
                  <p className={dash.metricValue}>{pilotKpis.orgs_repeat_eligible}</p>
                </div>
                <div>
                  <p className={dash.metricLabel}>Orgs repeat positive</p>
                  <p className={dash.metricValue}>{pilotKpis.orgs_repeat_positive}</p>
                </div>
                <div>
                  <p className={dash.metricLabel}>Taux repeat</p>
                  <p className={dash.metricValue}>
                    {pilotKpis.repeat_rate != null ? `${(pilotKpis.repeat_rate * 100).toFixed(0)} %` : "—"}
                  </p>
                </div>
              </div>
            </PanelCard>
          </DashboardSection>
        )}
      </div>
    </div>
  );
}
