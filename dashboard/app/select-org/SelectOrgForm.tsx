"use client";

import { useRouter } from "next/navigation";
import type { OrgMembership } from "@/src/lib/dashboardAuth";
import { selectOrg as copy } from "@/src/lib/uiCopy";
import { dash } from "@/src/lib/dashboardTheme";

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
          className="flex items-center gap-3 rounded-[var(--dash-radius)] border border-dash-border bg-dash-surface-2/50 p-3 cursor-pointer hover:bg-dash-surface-2 transition-colors"
        >
          <input
            type="radio"
            name="orgId"
            value={m.orgId}
            required
            className="rounded-full border-dash-border text-dash-accent focus:ring-dash-accent/30"
          />
          <div>
            <span className="font-medium text-dash-text">{m.orgName}</span>
            <span className="ml-2 text-xs text-dash-text-muted">{m.role}</span>
          </div>
        </label>
      ))}
      <button type="submit" className={`w-full ${dash.btn} ${dash.btnPrimary}`}>
        {copy.ctaContinue}
      </button>
    </form>
  );
}
