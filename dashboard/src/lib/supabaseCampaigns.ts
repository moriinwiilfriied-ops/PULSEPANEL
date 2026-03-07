/**
 * Campagnes & réponses depuis Supabase — Dashboard
 * Fallback mock si erreur ou vide.
 */

import { supabase, getCurrentOrgId } from "@/src/lib/supabase";
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
    .select("id, org_id, name, template, question, options, targeting, quota, reward_cents, price_cents, status, created_at, responses_count")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("[Supabase] getCampaigns", error.message);
    return getMockCampaigns();
  }
  if (!data?.length) return getMockCampaigns();
  return (data as CampaignRow[]).map(rowToCampaign);
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
    .select("id, org_id, name, template, question, options, targeting, quota, reward_cents, price_cents, status, created_at, responses_count")
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

/** Créer une campagne pour l'org courant (org_id requis). */
export async function createCampaign(params: {
  name: string;
  template: CampaignTemplate;
  question: string;
  options: string[];
  targeting: CampaignTargeting;
  quota: number;
  rewardUser: number;
}): Promise<Campaign> {
  const orgId = await getCurrentOrgId();
  if (!orgId) {
    console.warn("[Supabase] createCampaign: no org");
    return addMockCampaign({
      name: params.name,
      template: params.template,
      question: params.question,
      options: params.options,
      targeting: params.targeting,
      quota: params.quota,
      rewardUser: params.rewardUser,
    });
  }
  const pricePerResponse = calcPricePerResponse(params.rewardUser);
  const reward_cents = Math.round(params.rewardUser * 100);
  const price_cents = Math.round(pricePerResponse * 100);
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      org_id: orgId,
      name: params.name || null,
      template: params.template,
      question: params.question,
      options: params.options,
      targeting: params.targeting,
      quota: params.quota,
      reward_cents,
      price_cents,
      status: "active",
    })
    .select("id, org_id, name, template, question, options, targeting, quota, reward_cents, price_cents, status, created_at")
    .single();
  if (error) {
    console.warn("[Supabase] createCampaign", error.message);
    return addMockCampaign({
      name: params.name,
      template: params.template,
      question: params.question,
      options: params.options,
      targeting: params.targeting,
      quota: params.quota,
      rewardUser: params.rewardUser,
    });
  }
  return rowToCampaign(data as CampaignRow);
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

/** Dupliquer une campagne (même org, status active, responses_count 0). */
export async function duplicateCampaign(campaignId: string): Promise<Campaign | null> {
  const orgId = await getCurrentOrgId();
  if (!orgId) return null;
  const { data: source, error: fetchErr } = await supabase
    .from("campaigns")
    .select("name, template, question, options, targeting, quota, reward_cents, price_cents")
    .eq("id", campaignId)
    .single();
  if (fetchErr || !source) return null;
  const { data: created, error: insertErr } = await supabase
    .from("campaigns")
    .insert({
      org_id: orgId,
      name: (source.name ?? "Copie") + " (copie)",
      template: source.template,
      question: source.question,
      options: source.options,
      targeting: source.targeting,
      quota: source.quota,
      reward_cents: source.reward_cents,
      price_cents: source.price_cents,
      status: "active",
    })
    .select("id, org_id, name, template, question, options, targeting, quota, reward_cents, price_cents, status, created_at, responses_count")
    .single();
  if (insertErr || !created) return null;
  return rowToCampaign(created as CampaignRow);
}
