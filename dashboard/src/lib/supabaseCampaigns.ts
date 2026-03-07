/**
 * Campagnes & réponses depuis Supabase — Dashboard
 * Fallback mock si erreur ou vide.
 */

import { supabase, getCurrentOrgId } from "@/src/lib/supabase";

/** Coût facturé par réponse (centimes), formule alignée avec la DB. */
export function computeCostPerResponseCents(rewardCents: number): number {
  return Math.ceil(rewardCents * 1.7 + 35);
}
import {
  getCampaigns as getMockCampaigns,
  getCampaignStats as getMockCampaignStats,
  addCampaign as addMockCampaign,
  calcPricePerResponse,
  type Campaign,
  type CampaignTemplate,
  type CampaignTargeting,
  type CampaignResponse,
} from "@/src/lib/mockData";

export interface CampaignRow {
  id: string;
  org_id: string | null;
  name: string | null;
  template: string;
  template_key?: string | null;
  template_version?: number | null;
  question: string;
  options: string[];
  targeting: Record<string, unknown>;
  quota: number;
  reward_cents: number;
  price_cents: number;
  status: string;
  created_at: string;
  responses_count?: number;
}

function rowToCampaign(row: CampaignRow): Campaign {
  const t = (row.targeting || {}) as Record<string, unknown>;
  const targeting: CampaignTargeting = {
    ageMin: (typeof t.ageMin === "number" ? t.ageMin : 18),
    ageMax: (typeof t.ageMax === "number" ? t.ageMax : 65),
    regions: Array.isArray(t.regions) ? (t.regions as string[]) : [],
    tags: Array.isArray(t.tags) ? (t.tags as string[]) : [],
  };
  return {
    id: row.id,
    name: row.name ?? "Sans titre",
    template: row.template as CampaignTemplate,
    templateKey: row.template_key ?? undefined,
    templateVersion: row.template_version ?? undefined,
    question: row.question,
    options: Array.isArray(row.options) ? row.options : [],
    targeting,
    quota: row.quota,
    rewardUser: row.reward_cents / 100,
    pricePerResponse: row.price_cents / 100,
    total: (row.quota * row.price_cents) / 100,
    createdAt: row.created_at,
    status: (row.status as Campaign["status"]) ?? "active",
    responsesCount: row.responses_count ?? 0,
  };
}

/** Liste des campagnes de l'org courant (dashboard multi-tenant). */
export async function getCampaigns(): Promise<Campaign[]> {
  const orgId = await getCurrentOrgId();
  if (!orgId) {
    return getMockCampaigns();
  }
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, org_id, name, template, template_key, template_version, question, options, targeting, quota, reward_cents, price_cents, status, created_at, responses_count")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("[Supabase] getCampaigns", error.message);
    return getMockCampaigns();
  }
  if (!data?.length) return getMockCampaigns();
  return (data as CampaignRow[]).map(rowToCampaign);
}

/** Stats qualité campagne (RPC get_campaign_quality_stats). null si indisponible ou non autorisé. */
export async function getCampaignQualityStats(campaignId: string): Promise<{
  total_responses: number;
  valid_responses: number;
  invalid_responses: number;
  pct_valid: number;
  pct_too_fast: number;
  pct_empty: number;
} | null> {
  const { data, error } = await supabase.rpc("get_campaign_quality_stats", {
    _campaign_id: campaignId,
  });
  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[getCampaignQualityStats]", error.message);
    }
    return null;
  }
  if (data == null || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  return {
    total_responses: Number(row.total_responses ?? 0),
    valid_responses: Number(row.valid_responses ?? 0),
    invalid_responses: Number(row.invalid_responses ?? 0),
    pct_valid: Number(row.pct_valid ?? 0),
    pct_too_fast: Number(row.pct_too_fast ?? 0),
    pct_empty: Number(row.pct_empty ?? 0),
  };
}

/** Ligne export réponses campagne (RPC export_campaign_responses). */
export interface ExportCampaignResponseRow {
  created_at: string;
  response_id: string;
  user_id: string;
  answer: Record<string, unknown> | unknown;
  reward_cents: number;
  payout_status: string;
  is_valid: boolean;
  duration_ms: number | null;
}

/** Export des réponses d'une campagne (org owner/editor). Erreur si non autorisé. */
export async function exportCampaignResponses(
  campaignId: string
): Promise<{ data: ExportCampaignResponseRow[] | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("export_campaign_responses", {
    _campaign_id: campaignId,
  });
  if (error) return { data: null, error };
  return { data: (data ?? []) as ExportCampaignResponseRow[], error: null };
}

/** Détail + stats + réponses : Supabase avec fallback mock. */
export async function getCampaignStats(campaignId: string): Promise<{
  campaign: Campaign;
  responsesCount: number;
  quota: number;
  distribution: Record<string, number>;
  trustAvg: number;
  qualityBadge: string;
  verbatims: CampaignResponse[];
  pendingCount?: number;
  availableCount?: number;
  source: "supabase" | "mock";
} | null> {
  const { data: campaignRow, error: campError } = await supabase
    .from("campaigns")
    .select("id, org_id, name, template, template_key, template_version, question, options, targeting, quota, reward_cents, price_cents, status, created_at, responses_count")
    .eq("id", campaignId)
    .single();
  if (campError || !campaignRow) {
    const mock = getMockCampaignStats(campaignId);
    return mock ? { ...mock, source: "mock" as const } : null;
  }
  const campaign = rowToCampaign(campaignRow as CampaignRow);

  const { data: responsesRows, error: respError } = await supabase
    .from("responses")
    .select("id, campaign_id, user_id, answer, created_at, payout_status")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
  if (respError) {
    const mock = getMockCampaignStats(campaignId);
    return mock ? { ...mock, source: "mock" as const } : null;
  }
  const rows = (responsesRows ?? []) as Array<{ payout_status?: string }>;
  const pendingCount = rows.filter((r) => r.payout_status === "pending").length;
  const availableCount = rows.filter((r) => r.payout_status === "available").length;

  const verbatims: CampaignResponse[] = (responsesRows ?? []).map((r: { id: string; campaign_id: string; answer: { value?: string }; created_at: string }) => ({
    id: r.id,
    campaignId: r.campaign_id,
    questionId: campaignId,
    answer: typeof r.answer === "object" && r.answer && "value" in r.answer ? String((r.answer as { value?: string }).value) : JSON.stringify(r.answer),
    reward: campaign.rewardUser,
    trustLevel: 75,
    at: r.created_at,
  }));
  const responsesCount = campaign.responsesCount ?? verbatims.length;
  const distribution: Record<string, number> = {};
  verbatims.forEach((v) => {
    distribution[v.answer] = (distribution[v.answer] ?? 0) + 1;
  });
  const trustAvg = verbatims.length ? verbatims.reduce((s, v) => s + v.trustLevel, 0) / verbatims.length : 0;
  const qualityBadge = trustAvg >= 80 ? "Haute" : trustAvg >= 60 ? "Moyenne" : "À améliorer";
  return {
    campaign,
    responsesCount,
    quota: campaign.quota,
    distribution,
    trustAvg: Math.round(trustAvg * 10) / 10,
    qualityBadge,
    verbatims,
    pendingCount,
    availableCount,
    source: "supabase",
  };
}

export type CreateCampaignResult =
  | { campaign: Campaign }
  | { error: "insufficient_org_credit" }
  | { error: "creation_failed"; message?: string };

/** Créer une campagne pour l'org courant (org_id requis). Le trigger DB facture si status=active. */
export async function createCampaign(params: {
  name: string;
  template: CampaignTemplate;
  question: string;
  options: string[];
  targeting: CampaignTargeting & { responseType?: string };
  quota: number;
  rewardUser: number;
  templateKey?: string | null;
  templateVersion?: number;
}): Promise<CreateCampaignResult> {
  const orgId = await getCurrentOrgId();
  if (!orgId) {
    console.warn("[Supabase] createCampaign: no org");
    const mock = addMockCampaign({
      name: params.name,
      template: params.template,
      question: params.question,
      options: params.options,
      targeting: params.targeting,
      quota: params.quota,
      rewardUser: params.rewardUser,
    });
    return { campaign: mock };
  }
  const reward_cents = Math.round(params.rewardUser * 100);
  const price_cents = Math.round(calcPricePerResponse(params.rewardUser) * 100);
  const targeting = { ...params.targeting };
  if (params.targeting.responseType) {
    (targeting as Record<string, unknown>).responseType = params.targeting.responseType;
  }
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      org_id: orgId,
      name: params.name || null,
      template: params.template,
      template_key: params.templateKey ?? null,
      template_version: params.templateVersion ?? 1,
      question: params.question,
      options: params.options,
      targeting,
      quota: params.quota,
      reward_cents,
      price_cents,
      status: "active",
    })
    .select("id, org_id, name, template, template_key, template_version, question, options, targeting, quota, reward_cents, price_cents, status, created_at, responses_count")
    .single();
  if (error) {
    const msg = (error as { message?: string }).message ?? "";
    if (msg.includes("insufficient_org_credit")) {
      return { error: "insufficient_org_credit" };
    }
    console.warn("[Supabase] createCampaign", error.message);
    return { error: "creation_failed", message: msg };
  }
  return { campaign: rowToCampaign(data as CampaignRow) };
}

/** Pause / Reprendre / Terminer : met à jour le status. */
export async function updateCampaignStatus(
  campaignId: string,
  status: "active" | "paused" | "completed"
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("campaigns")
    .update({ status })
    .eq("id", campaignId);
  return { error: error ?? null };
}

/** Valider les paiements d’une campagne (pending → available). RPC sécurisée via org membership. */
export async function validateCampaignPayouts(campaignId: string): Promise<{
  error: Error | null;
  validated_responses?: number;
  users?: number;
  total_cents?: number;
}> {
  const { data, error } = await supabase.rpc("validate_campaign_payouts", {
    _campaign_id: campaignId,
  });
  if (error) return { error };
  const obj = data as {
    error?: string;
    validated_responses?: number;
    users?: number;
    total_cents?: number;
  } | null;
  if (obj?.error) return { error: new Error(obj.error) };
  return {
    error: null,
    validated_responses: obj?.validated_responses,
    users: obj?.users,
    total_cents: obj?.total_cents,
  };
}

export type DuplicateCampaignResult =
  | { campaign: Campaign }
  | { error: "insufficient_org_credit" }
  | { error: "failed"; message?: string }
  | null;

/** Dupliquer une campagne (même org, status active). Facturation au passage en active. */
export async function duplicateCampaign(
  campaignId: string,
  overrides?: { nameSuffix?: string; question?: string }
): Promise<DuplicateCampaignResult> {
  const orgId = await getCurrentOrgId();
  if (!orgId) return null;
  const { data: source, error: fetchErr } = await supabase
    .from("campaigns")
    .select("name, template, template_key, template_version, question, options, targeting, quota, reward_cents, price_cents")
    .eq("id", campaignId)
    .single();
  if (fetchErr || !source) return null;
  const name = (source.name ?? "Copie") + (overrides?.nameSuffix ?? " (copie)");
  const question = overrides?.question ?? source.question;
  const { data: created, error: insertErr } = await supabase
    .from("campaigns")
    .insert({
      org_id: orgId,
      name,
      template: source.template,
      template_key: source.template_key ?? null,
      template_version: source.template_version ?? 1,
      question,
      options: source.options ?? [],
      targeting: source.targeting ?? {},
      quota: source.quota,
      reward_cents: source.reward_cents,
      price_cents: source.price_cents,
      status: "active",
    })
    .select("id, org_id, name, template, template_key, template_version, question, options, targeting, quota, reward_cents, price_cents, status, created_at, responses_count")
    .single();
  if (insertErr) {
    const msg = (insertErr as { message?: string }).message ?? "";
    if (msg.includes("insufficient_org_credit")) return { error: "insufficient_org_credit" };
    return { error: "failed", message: msg };
  }
  if (!created) return null;
  return { campaign: rowToCampaign(created as CampaignRow) };
}

/** Retrait en attente (dashboard). */
export interface PendingWithdrawalRow {
  id: string;
  user_id: string;
  amount_cents: number;
  status: string;
  created_at: string;
}

/** Liste des retraits en attente (RPC, org owner/editor). */
export async function listPendingWithdrawals(): Promise<PendingWithdrawalRow[]> {
  const { data, error } = await supabase.rpc("list_pending_withdrawals");
  if (error) {
    if (process.env.NODE_ENV === "development") console.warn("[listPendingWithdrawals]", error.message);
    return [];
  }
  return (data ?? []) as PendingWithdrawalRow[];
}

/** Décision sur un retrait : paid | rejected. */
export async function decideWithdrawal(
  withdrawalId: string,
  decision: "paid" | "rejected"
): Promise<{ error: Error | null; ok?: boolean; status?: string; user_id?: string; amount_cents?: number }> {
  const { data, error } = await supabase.rpc("decide_withdrawal", {
    _withdrawal_id: withdrawalId,
    _decision: decision,
  });
  if (error) return { error };
  const obj = data as { error?: string; ok?: boolean; status?: string; user_id?: string; amount_cents?: number } | null;
  if (obj?.error) return { error: new Error(obj.error) };
  return {
    error: null,
    ok: obj?.ok,
    status: obj?.status,
    user_id: obj?.user_id,
    amount_cents: obj?.amount_cents,
  };
}

/** Retrait dans l'historique (payé/refusé). */
export interface RecentWithdrawalRow {
  id: string;
  user_id: string;
  amount_cents: number;
  status: string;
  created_at: string;
  decided_at: string | null;
}

/** Liste des retraits récents payés/refusés (RPC, org owner/editor). */
export async function listRecentWithdrawals(limit = 50): Promise<RecentWithdrawalRow[]> {
  const { data, error } = await supabase.rpc("list_recent_withdrawals", { _limit: limit });
  if (error) {
    if (process.env.NODE_ENV === "development") console.warn("[listRecentWithdrawals]", error.message);
    return [];
  }
  return (data ?? []) as RecentWithdrawalRow[];
}
