"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCampaigns } from "@/src/lib/supabaseCampaigns";
import type { Campaign } from "@/src/lib/mockData";

export default function Home() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCampaigns().then(setCampaigns).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            PulsePanel
          </h1>
          <nav className="flex items-center gap-4">
            <Link
              href="/withdrawals"
              className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Retraits
            </Link>
            <Link
              href="/campaigns/new"
              className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90"
            >
              Créer une campagne
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <h2 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-4">
          Campagnes
        </h2>

        {loading ? (
          <p className="text-zinc-500 dark:text-zinc-400 py-8">Chargement…</p>
        ) : campaigns.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400 py-8">
            Aucune campagne. Créez-en une pour commencer.
          </p>
        ) : (
          <ul className="space-y-3">
            {campaigns.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/campaigns/${c.id}`}
                  className="block rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {c.name}
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        {c.template} · {(c.responsesCount ?? 0)} / {c.quota} réponses
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${
                        c.status === "active"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : c.status === "paused"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {c.status === "active" ? "Actif" : c.status === "paused" ? "En pause" : "Terminée"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
