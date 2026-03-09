"use client";

import { useRouter } from "next/navigation";
import type { OrgMembership } from "@/src/lib/dashboardAuth";
import { selectOrg as copy } from "@/src/lib/uiCopy";

export function SelectOrgForm({
  memberships,
}: {
  memberships: OrgMembership[];
}) {
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const orgId = formData.get("orgId");
    if (!orgId || typeof orgId !== "string") return;

    const res = await fetch("/api/dashboard/set-current-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      alert(data.error ?? copy.errorSelect);
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {memberships.map((m) => (
        <label
          key={m.orgId}
          className="flex items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
        >
          <input
            type="radio"
            name="orgId"
            value={m.orgId}
            required
            className="rounded-full border-zinc-300 dark:border-zinc-600"
          />
          <div>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {m.orgName}
            </span>
            <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
              {m.role}
            </span>
          </div>
        </label>
      ))}
      <button
        type="submit"
        className="w-full rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90"
      >
        Continuer avec cette organisation
      </button>
    </form>
  );
}
