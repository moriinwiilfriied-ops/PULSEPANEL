"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { dash } from "@/src/lib/dashboardTheme";

export function AdminWithdrawalsFilters({
  status,
  since,
  q,
}: {
  status?: string;
  since?: string;
  q?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setFilter = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`/admin/withdrawals?${next.toString()}`);
    },
    [router, searchParams]
  );

  const inputClass = "rounded-[var(--dash-radius)] border border-dash-border bg-dash-surface-2 px-2 py-1 text-sm text-dash-text placeholder:text-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent/30";

  return (
    <div className={`flex flex-wrap items-center gap-3 ${dash.card} p-3`}>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-dash-text-muted">Statut</span>
        <select
          value={status ?? ""}
          onChange={(e) => setFilter("status", e.target.value)}
          className={inputClass}
        >
          <option value="">Tous</option>
          <option value="pending">En attente</option>
          <option value="paid">Payé</option>
          <option value="rejected">Refusé</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-dash-text-muted">Depuis (date)</span>
        <input
          type="date"
          value={since ?? ""}
          onChange={(e) => setFilter("since", e.target.value)}
          className={inputClass}
        />
      </label>
      <form method="get" action="/admin/withdrawals" className="flex items-center gap-2">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        {since ? <input type="hidden" name="since" value={since} /> : null}
        <label className="text-sm text-dash-text-muted">user_id</label>
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="min 4 car."
          className={`${inputClass} w-40`}
        />
        <button type="submit" className={`${dash.btn} ${dash.btnSecondary}`}>
          OK
        </button>
      </form>
    </div>
  );
}
