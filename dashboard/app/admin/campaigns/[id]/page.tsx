import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminCampaignDetail } from "@/src/lib/adminData";
import { CampaignStatusActions } from "./CampaignStatusActions";

function formatDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateId(id: string | null | undefined) {
  if (!id) return "—";
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

export default async function AdminCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getAdminCampaignDetail(id);
  if (!c) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/campaigns" className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline">
          ← Liste campagnes
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Campagne {truncateId(c.id)}
        </h1>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Détail
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <dt className="text-zinc-500 dark:text-zinc-400">id</dt>
          <dd className="font-mono text-xs break-all">{c.id}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">org</dt>
          <dd>{c.org_name ?? truncateId(c.org_id)}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">org_id</dt>
          <dd className="font-mono text-xs break-all">{c.org_id ?? "—"}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">status</dt>
          <dd>{c.status}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">template / template_key</dt>
          <dd>{c.template ?? "—"} / {c.template_key ?? "—"}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">question</dt>
          <dd className="max-w-md">{c.question ?? "—"}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">name</dt>
          <dd>{c.name ?? "—"}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">quota</dt>
          <dd>{c.quota}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">responses_count</dt>
          <dd>{c.responses_count}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">reward_cents</dt>
          <dd>{(c.reward_cents / 100).toFixed(2)} €</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">cost_per_response_cents</dt>
          <dd>{(c.cost_per_response_cents / 100).toFixed(2)} €</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">cost_total_cents</dt>
          <dd>{(c.cost_total_cents / 100).toFixed(2)} €</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">billing_status</dt>
          <dd>{c.billing_status ?? "—"}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">created_at</dt>
          <dd>{formatDate(c.created_at)}</dd>
        </dl>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Qualité (vue campaign_quality_stats)
        </h2>
        {(c.total_responses != null || c.pct_valid != null) ? (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <dt className="text-zinc-500 dark:text-zinc-400">total_responses</dt>
            <dd>{c.total_responses ?? "—"}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">valid_responses</dt>
            <dd>{c.valid_responses ?? "—"}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">invalid_responses</dt>
            <dd>{c.invalid_responses ?? "—"}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">pct_valid</dt>
            <dd>{c.pct_valid != null ? `${Number(c.pct_valid).toFixed(1)} %` : "—"}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">pct_too_fast</dt>
            <dd>{c.pct_too_fast != null ? `${Number(c.pct_too_fast).toFixed(1)} %` : "—"}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">pct_empty</dt>
            <dd>{c.pct_empty != null ? `${Number(c.pct_empty).toFixed(1)} %` : "—"}</dd>
          </dl>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Aucune donnée qualité pour cette campagne (pas encore de réponses ou vue vide).
          </p>
        )}
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Source : vue <code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">campaign_quality_stats</code> (too_fast, empty_answer).
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Flags liés à la campagne
        </h2>
        <p className="text-sm">
          Nombre de flags (réponses too_fast / empty_answer) : <strong>{c.flags_count}</strong>
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Voir la liste <Link href="/admin/flags" className="hover:underline">Flags</Link> et filtrer par campaign_id / response si besoin.
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <CampaignStatusActions campaignId={c.id} currentStatus={c.status} />
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href={`/campaigns/${c.id}`} className="text-zinc-600 dark:text-zinc-400 hover:underline">
          Ouvrir dans le dashboard org (campagne) →
        </Link>
        <span className="text-zinc-400">|</span>
        <span className="text-zinc-500 dark:text-zinc-400">
          Export CSV/JSON : depuis le détail campagne du dashboard org (membre de l’org).
        </span>
      </div>
    </div>
  );
}
