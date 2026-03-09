import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminWebhookEventDetail } from "@/src/lib/adminData";

function formatDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default async function AdminWebhookEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getAdminWebhookEventDetail(id);
  if (!row) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/webhooks"
          className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline"
        >
          ← Liste webhooks
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Événement {row.event_type}
        </h1>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Métadonnées
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <dt className="text-zinc-500 dark:text-zinc-400">id</dt>
          <dd className="font-mono text-xs break-all">{row.id}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">event_id</dt>
          <dd className="font-mono text-xs break-all">{row.event_id}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">event_type</dt>
          <dd>{row.event_type}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">provider</dt>
          <dd>{row.provider}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">livemode</dt>
          <dd>{row.livemode == null ? "—" : row.livemode ? "true" : "false"}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">api_version</dt>
          <dd>{row.api_version ?? "—"}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">created_ts (Stripe)</dt>
          <dd>{formatDate(row.created_ts)}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">received_at</dt>
          <dd>{formatDate(row.received_at)}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">processing_status</dt>
          <dd>
            <span
              className={
                row.processing_status === "error"
                  ? "text-red-600 dark:text-red-400"
                  : row.processing_status === "processed"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : ""
              }
            >
              {row.processing_status}
            </span>
          </dd>
          <dt className="text-zinc-500 dark:text-zinc-400">processed_at</dt>
          <dd>{formatDate(row.processed_at)}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">source_route</dt>
          <dd className="font-mono text-xs">{row.source_route ?? "—"}</dd>
        </dl>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Références Stripe
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <dt className="text-zinc-500 dark:text-zinc-400">stripe_checkout_session_id</dt>
          <dd className="font-mono text-xs break-all">{row.stripe_checkout_session_id ?? "—"}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">stripe_payment_intent_id</dt>
          <dd className="font-mono text-xs break-all">{row.stripe_payment_intent_id ?? "—"}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">org_id</dt>
          <dd className="font-mono text-xs break-all">{row.org_id ?? "—"}</dd>
        </dl>
      </div>

      {row.processing_error ? (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
          <h2 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
            Erreur de traitement
          </h2>
          <pre className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap break-words font-mono">
            {row.processing_error}
          </pre>
        </div>
      ) : null}

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          payload_summary
        </h2>
        <pre className="text-xs bg-zinc-100 dark:bg-zinc-800 p-3 rounded overflow-x-auto">
          {row.payload_summary
            ? JSON.stringify(row.payload_summary, null, 2)
            : "—"}
        </pre>
      </div>
    </div>
  );
}
