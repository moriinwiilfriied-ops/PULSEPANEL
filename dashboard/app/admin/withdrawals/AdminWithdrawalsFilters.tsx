"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

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

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-zinc-500 dark:text-zinc-400">Status</span>
        <select
          value={status ?? ""}
          onChange={(e) => setFilter("status", e.target.value)}
          className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm"
        >
          <option value="">Tous</option>
          <option value="pending">pending</option>
          <option value="paid">paid</option>
          <option value="rejected">rejected</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-zinc-500 dark:text-zinc-400">Depuis (date)</span>
        <input
          type="date"
          value={since ?? ""}
          onChange={(e) => setFilter("since", e.target.value)}
          className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm"
        />
      </label>
      <form
        method="get"
        action="/admin/withdrawals"
        className="flex items-center gap-2"
      >
        {status ? <input type="hidden" name="status" value={status} /> : null}
        {since ? <input type="hidden" name="since" value={since} /> : null}
        <label className="text-sm text-zinc-500 dark:text-zinc-400">
          user_id
        </label>
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="min 4 car."
          className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm w-40"
        />
        <button
          type="submit"
          className="rounded border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-sm"
        >
          OK
        </button>
      </form>
    </div>
  );
}
