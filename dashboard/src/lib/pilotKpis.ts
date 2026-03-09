/**
 * KPI minimum pilot — appels RPC Supabase (temps quota, repeat, org KPIs).
 * Source de vérité côté DB : supabase/migrations/0023_pilot_kpis.sql
 */

import { supabase } from "@/src/lib/supabase";

export interface CampaignTimeToQuota {
  quota_reached: boolean;
  campaign_created_at: string;
  quota_reached_at?: string;
  time_to_quota_seconds?: number;
  quota: number;
  responses_count?: number;
}

export interface OrgRepeatBaseline {
  campaigns_count: number;
  campaigns_completed_count: number;
  campaigns_after_first: number;
  repeat_eligible: boolean;
  repeat_positive: boolean;
}

export interface OrgPilotKpis {
  active_campaigns: number;
  completed_campaigns: number;
  total_responses: number;
  credit_available_cents: number;
  avg_time_to_quota_seconds: number | null;
  avg_pct_valid: number | null;
  repeat: OrgRepeatBaseline;
}

/** Temps pour atteindre le quota (campagne terminée) ou état en cours. */
export async function getCampaignTimeToQuota(
  campaignId: string
): Promise<CampaignTimeToQuota | null> {
  const { data, error } = await supabase.rpc("get_campaign_time_to_quota", {
    _campaign_id: campaignId,
  });
  if (error || data == null) return null;
  const o = data as Record<string, unknown>;
  return {
    quota_reached: Boolean(o.quota_reached),
    campaign_created_at: String(o.campaign_created_at ?? ""),
    quota_reached_at: o.quota_reached_at != null ? String(o.quota_reached_at) : undefined,
    time_to_quota_seconds:
      typeof o.time_to_quota_seconds === "number" ? o.time_to_quota_seconds : undefined,
    quota: Number(o.quota ?? 0),
    responses_count: typeof o.responses_count === "number" ? o.responses_count : undefined,
  };
}

/** Repeat baseline pour une org (dashboard). */
export async function getOrgRepeatBaseline(orgId: string): Promise<OrgRepeatBaseline | null> {
  const { data, error } = await supabase.rpc("get_org_repeat_baseline", { _org_id: orgId });
  if (error || data == null) return null;
  const o = data as Record<string, unknown>;
  return {
    campaigns_count: Number(o.campaigns_count ?? 0),
    campaigns_completed_count: Number(o.campaigns_completed_count ?? 0),
    campaigns_after_first: Number(o.campaigns_after_first ?? 0),
    repeat_eligible: Boolean(o.repeat_eligible),
    repeat_positive: Boolean(o.repeat_positive),
  };
}

/** KPIs pilot pour une org (dashboard home). */
export async function getOrgPilotKpis(orgId: string): Promise<OrgPilotKpis | null> {
  const { data, error } = await supabase.rpc("get_org_pilot_kpis", { _org_id: orgId });
  if (error || data == null) return null;
  const o = data as Record<string, unknown>;
  const repeat = o.repeat as Record<string, unknown> | null;
  return {
    active_campaigns: Number(o.active_campaigns ?? 0),
    completed_campaigns: Number(o.completed_campaigns ?? 0),
    total_responses: Number(o.total_responses ?? 0),
    credit_available_cents: Number(o.credit_available_cents ?? 0),
    avg_time_to_quota_seconds:
      typeof o.avg_time_to_quota_seconds === "number" ? o.avg_time_to_quota_seconds : null,
    avg_pct_valid: typeof o.avg_pct_valid === "number" ? o.avg_pct_valid : null,
    repeat: repeat
      ? {
          campaigns_count: Number(repeat.campaigns_count ?? 0),
          campaigns_completed_count: Number(repeat.campaigns_completed_count ?? 0),
          campaigns_after_first: Number(repeat.campaigns_after_first ?? 0),
          repeat_eligible: Boolean(repeat.repeat_eligible),
          repeat_positive: Boolean(repeat.repeat_positive),
        }
      : {
          campaigns_count: 0,
          campaigns_completed_count: 0,
          campaigns_after_first: 0,
          repeat_eligible: false,
          repeat_positive: false,
        },
  };
}

/** Formate des secondes en texte lisible (ex. "2 j 3 h" ou "45 min"). */
export function formatTimeToQuota(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} h`;
  return `${(seconds / 86400).toFixed(1)} j`;
}
