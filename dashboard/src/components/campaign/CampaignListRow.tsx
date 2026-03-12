"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  updateCampaignStatus,
  duplicateCampaign,
  resetTestCampaign,
  deleteCampaign,
  deleteCampaignGeneric,
} from "@/src/lib/supabaseCampaigns";
import type { Campaign } from "@/src/lib/mockData";
import { testSwipe as testCopy, campaignDelete as deleteCopy } from "@/src/lib/uiCopy";
import { dash } from "@/src/lib/dashboardTheme";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

export interface CampaignListRowProps {
  campaign: Campaign;
  disabled: boolean;
  onRefresh: () => void;
  onActionStart: () => void;
  onActionEnd: () => void;
}

export function CampaignListRow({ campaign: c, disabled, onRefresh, onActionStart, onActionEnd }: CampaignListRowProps) {
  const router = useRouter();
  const primaryUrl = c.mediaAssets?.find((a) => a.role === "primary")?.url;
  const urlA = c.mediaAssets?.find((a) => a.role === "comparison_a")?.url;
  const urlB = c.mediaAssets?.find((a) => a.role === "comparison_b")?.url;
  const hasMedia = c.creativeType && c.creativeType !== "text" && (primaryUrl || urlA || urlB);

  const run = async (fn: () => Promise<void>) => {
    onActionStart();
    try {
      await fn();
    } finally {
      onActionEnd();
    }
  };

  return (
    <li>
      <div className={`${dash.card} ${dash.cardHover} grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 sm:gap-4 items-center p-4`}>
        <Link href={`/campaigns/${c.id}`} className="min-w-0 flex items-center gap-3">
          {hasMedia && (
            <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-dash-surface-3 border border-white/[0.06] flex items-center justify-center">
              {c.creativeType === "comparison" && (urlA || urlB) ? (
                <div className="w-full h-full grid grid-cols-2">
                  {urlA ? <Image src={urlA} alt="" width={48} height={48} className="w-full h-full object-cover" /> : <div className="bg-dash-surface-2" />}
                  {urlB ? <Image src={urlB} alt="" width={48} height={48} className="w-full h-full object-cover" /> : <div className="bg-dash-surface-2" />}
                </div>
              ) : c.creativeType === "video" && primaryUrl ? (
                <div className="w-full h-full flex items-center justify-center bg-dash-surface-2">
                  <svg className="w-5 h-5 text-dash-text-muted" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z"/></svg>
                </div>
              ) : primaryUrl ? (
                <Image src={primaryUrl} alt="" width={48} height={48} className="w-full h-full object-cover" />
              ) : null}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-dash-text truncate">{c.name}</p>
            <p className="text-xs text-dash-text-muted mt-0.5">{c.template}</p>
          </div>
        </Link>
        <div className="text-sm text-dash-text-muted tabular-nums sm:text-right">
          {(c.responsesCount ?? 0)} / {c.quota}
        </div>
        <span className="flex items-center gap-1.5 flex-wrap">
          {c.isTest && <StatusBadge variant="test">Test</StatusBadge>}
          <StatusBadge variant={c.status === "active" ? "success" : c.status === "paused" ? "warning" : "neutral"}>
            {c.status === "active" ? "Actif" : c.status === "paused" ? "En pause" : "Terminée"}
          </StatusBadge>
        </span>
        <div className="flex items-center gap-0.5 justify-end" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          {c.status !== "completed" && (
            <button
              type="button"
              title={c.status === "active" ? "Pause" : "Reprendre"}
              disabled={disabled}
              onClick={() => run(async () => {
                const { error } = await updateCampaignStatus(c.id, c.status === "active" ? "paused" : "active");
                if (!error) onRefresh();
              })}
              className={dash.quickAction}
            >
              {c.status === "active" ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z"/></svg>}
            </button>
          )}
          <button
            type="button"
            title="Dupliquer"
            disabled={disabled}
            onClick={() => run(async () => {
              const result = await duplicateCampaign(c.id);
              if (result && "campaign" in result) router.push(`/campaigns/${result.campaign.id}`);
              else {
                if (result?.error === "insufficient_org_credit") alert("Crédit insuffisant.");
                else if (result?.error) alert("Duplication impossible.");
                onRefresh();
              }
            })}
            className={dash.quickAction}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          {c.isTest && (
            <button
              type="button"
              title="Réinitialiser"
              disabled={disabled}
              onClick={() => {
                if (!window.confirm(testCopy.confirmReset)) return;
                run(async () => {
                  const { error } = await resetTestCampaign(c.id);
                  if (error) alert(testCopy.errorReset);
                  else onRefresh();
                });
              }}
              className={`${dash.quickAction} text-amber-400 hover:bg-amber-500/10`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
          )}
          <button
            type="button"
            title="Supprimer"
            disabled={disabled}
            onClick={() => {
              if (c.isTest) { if (!window.confirm(testCopy.confirmDelete)) return; }
              else { if (!window.confirm(deleteCopy.confirmGeneric)) return; }
              run(async () => {
                if (c.isTest) {
                  const { error } = await deleteCampaign(c.id);
                  if (error) alert(testCopy.errorDelete);
                  else onRefresh();
                } else {
                  const result = await deleteCampaignGeneric(c.id);
                  if ("error" in result) alert(deleteCopy.errorGeneric + (result.error ? ` ${result.error}` : ""));
                  else if (result.result === "delete_blocked" || result.result === "not_found") alert(result.message ?? deleteCopy.errorGeneric);
                  else alert(result.result === "deleted_hard" ? deleteCopy.resultDeletedHard : deleteCopy.resultDeletedSoft);
                  onRefresh();
                }
              });
            }}
            className={`${dash.quickAction} ${dash.quickActionDanger}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    </li>
  );
}
