import Link from "next/link";
import { getAdminOverviewStats, getAdminPilotKpis } from "@/src/lib/adminData";

export default async function AdminOverviewPage() {
  const [stats, pilotKpis] = await Promise.all([
    getAdminOverviewStats(),
    getAdminPilotKpis(),
  ]);

  const cards = [
    {
      label: "Withdrawals en attente",
      value: stats.withdrawalsPendingCount,
      href: "/admin/withdrawals?status=pending",
    },
    {
      label: "Flags ouverts",
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
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Overview
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
          >
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
              {c.label}
            </p>
            <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {c.value}
            </p>
            {c.href ? (
              <Link
                href={c.href}
                className="text-xs text-zinc-500 dark:text-zinc-400 hover:underline mt-2 inline-block"
              >
                Voir →
              </Link>
            ) : null}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Audit webhooks
        </h2>
        {stats.webhookEventsAvailable ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Table webhook_events disponible.
          </p>
        ) : (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Audit webhooks natif non encore implémenté (pas de table webhook_events). Vue provisoire basée sur org_topups dans Webhooks.
          </p>
        )}
      </div>

      {pilotKpis && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
            KPI pilot (ops)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-zinc-500 dark:text-zinc-400">Flags ouverts</p>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{pilotKpis.flags_open}</p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400">Webhook errors 24h</p>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{pilotKpis.webhook_errors_24h}</p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400">Webhook errors 7j</p>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{pilotKpis.webhook_errors_7d}</p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400">Retraits en attente</p>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{pilotKpis.withdrawals_pending}</p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400">Retraits payés (7j)</p>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{pilotKpis.withdrawals_paid_7d}</p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400">Orgs repeat eligible</p>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{pilotKpis.orgs_repeat_eligible}</p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400">Orgs repeat positive</p>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{pilotKpis.orgs_repeat_positive}</p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-400">Taux repeat</p>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {pilotKpis.repeat_rate != null ? `${(pilotKpis.repeat_rate * 100).toFixed(0)} %` : "—"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
