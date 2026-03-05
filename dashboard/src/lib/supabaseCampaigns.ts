/**
 * Campagnes & réponses depuis Supabase — Dashboard
 * Fallback mock si erreur ou vide.
 */

import { supabase } from "@/src/lib/supabase";
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
    status: (row.status as Campaign["status"]) ?? "live",
  };
}

/** Liste des campagnes : Supabase avec fallback mock. */
export async function getCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, name, template, question, options, targeting, quota, reward_cents, price_cents, status, created_at")
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
} | null> {
  const { data: campaignRow, error: campError } = await supabase
    .from("campaigns")
    .select("id, name, template, question, options, targeting, quota, reward_cents, price_cents, status, created_at")
    .eq("id", campaignId)
    .single();
  if (campError || !campaignRow) {
    return getMockCampaignStats(campaignId) ?? null;
  }
  const campaign = rowToCampaign(campaignRow as CampaignRow);

  const { data: responsesRows, error: respError } = await supabase
    .from("responses")
    .select("id, campaign_id, user_id, answer, created_at")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
  if (respError) {
    return getMockCampaignStats(campaignId) ?? null;
  }
  const verbatims: CampaignResponse[] = (responsesRows ?? []).map((r: { id: string; campaign_id: string; answer: { value?: string }; created_at: string }) => ({
    id: r.id,
    campaignId: r.campaign_id,
    questionId: campaignId,
    answer: typeof r.answer === "object" && r.answer && "value" in r.answer ? String((r.answer as { value?: string }).value) : JSON.stringify(r.answer),
    reward: campaign.rewardUser,
    trustLevel: 75,
    at: r.created_at,
  }));
  const responsesCount = verbatims.length;
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
  };
}

/** Créer une campagne : insert Supabase puis retourne la campagne (avec fallback mock si erreur). */
export async function createCampaign(params: {
  name: string;
  template: CampaignTemplate;
  question: string;
  options: string[];
  targeting: CampaignTargeting;
  quota: number;
  rewardUser: number;
}): Promise<Campaign> {
  const pricePerResponse = calcPricePerResponse(params.rewardUser);
  const reward_cents = Math.round(params.rewardUser * 100);
  const price_cents = Math.round(pricePerResponse * 100);
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
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
    .select("id, name, template, question, options, targeting, quota, reward_cents, price_cents, status, created_at")
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
