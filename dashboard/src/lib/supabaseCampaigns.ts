/**
 * Campagnes & réponses depuis Supabase — Dashboard
 * Pas de fallback mock : erreur ou vide → liste vide / null. Vérité produit explicite.
 */

import { supabase, getCurrentOrgId } from "@/src/lib/supabase";

/** Coût facturé par réponse (centimes), formule alignée avec la DB. */
export function computeCostPerResponseCents(rewardCents: number): number {
  return Math.ceil(rewardCents * 1.35 + 10);
}
import {
  calcPricePerResponse,
  type Campaign,
  type CampaignTemplate,
  type CampaignTargeting,
  type CampaignResponse,
  type CreativeType,
  type CampaignMediaAsset,
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
  is_test?: boolean;
  deleted_at?: string | null;
  creative_type?: string | null;
  media_assets?: unknown; // jsonb: CampaignMediaAsset[]
}

function rowToCampaign(row: CampaignRow): Campaign {
  const t = (row.targeting || {}) as Record<string, unknown>;
  const targeting: CampaignTargeting = {
    ageMin: (typeof t.ageMin === "number" ? t.ageMin : 18),
    ageMax: (typeof t.ageMax === "number" ? t.ageMax : 65),
    regions: Array.isArray(t.regions) ? (t.regions as string[]) : [],
    tags: Array.isArray(t.tags) ? (t.tags as string[]) : [],
  };
  const mediaAssets: CampaignMediaAsset[] = Array.isArray(row.media_assets)
    ? (row.media_assets as CampaignMediaAsset[])
    : [];
  const creativeType = (row.creative_type ?? "text") as CreativeType;
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
    isTest: !!row.is_test,
    creativeType: creativeType !== "text" ? creativeType : undefined,
    mediaAssets: mediaAssets.length ? mediaAssets : undefined,
  };
}

/** Liste des campagnes de l'org courant (dashboard multi-tenant). Pas de mock : erreur ou vide → []. */
export async function getCampaigns(): Promise<Campaign[]> {
  const orgId = await getCurrentOrgId();
  if (!orgId) return [];
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, org_id, name, template, template_key, template_version, question, options, targeting, quota, reward_cents, price_cents, status, created_at, responses_count, is_test, creative_type, media_assets")
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("[Supabase] getCampaigns", error.message);
    return [];
  }
  if (!data?.length) return [];
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

/** Détail + stats + réponses : Supabase uniquement. Pas de mock : erreur ou absent → null. */
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
  source: "supabase";
  /** Coût total facturé (centimes), depuis DB. */
  costTotalCents?: number;
} | null> {
  const { data: campaignRow, error: campError } = await supabase
    .from("campaigns")
    .select("id, org_id, name, template, template_key, template_version, question, options, targeting, quota, reward_cents, price_cents, cost_total_cents, status, created_at, responses_count, is_test, creative_type, media_assets")
    .eq("id", campaignId)
    .is("deleted_at", null)
    .single();
  if (campError || !campaignRow) return null;
  const campaign = rowToCampaign(campaignRow as CampaignRow);

  const { data: responsesRows, error: respError } = await supabase
    .from("responses")
    .select("id, campaign_id, user_id, answer, created_at, payout_status")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
  if (respError) return null;
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
  const row = campaignRow as CampaignRow & { cost_total_cents?: number };
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
    source: "supabase" as const,
    costTotalCents: row.cost_total_cents,
  };
}

export type CreateCampaignResult =
  | { campaign: Campaign }
  | { error: "no_org" }
  | { error: "insufficient_org_credit" }
  | { error: "creation_failed"; message?: string };

function isInsufficientOrgCreditError(error: { message?: string; details?: string; hint?: string }): boolean {
  const msg = (error.message ?? "").toLowerCase();
  const details = (error.details ?? "").toLowerCase();
  const hint = (error.hint ?? "").toLowerCase();
  return msg.includes("insufficient_org_credit") || details.includes("insufficient_org_credit") || hint.includes("insufficient_org_credit");
}

/** Créer une campagne pour l'org courant (org_id requis). Si publishNow=true le trigger DB facture au passage en active. */
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
  /** Si true (défaut), status=active et billing au insert. Si false, status=paused (pas de billing). */
  publishNow?: boolean;
  /** Format créa media-first (défaut: text = comportement actuel). */
  creativeType?: CreativeType;
  /** Médias (URLs). Requis si creativeType image/video/comparison. */
  mediaAssets?: CampaignMediaAsset[];
}): Promise<CreateCampaignResult> {
  const orgId = await getCurrentOrgId();
  if (!orgId) {
    console.warn("[Supabase] createCampaign: no org");
    return { error: "no_org" };
  }
  const reward_cents = Math.round(params.rewardUser * 100);
  const price_cents = Math.round(calcPricePerResponse(params.rewardUser) * 100);
  const targeting = { ...params.targeting };
  if (params.targeting.responseType) {
    (targeting as Record<string, unknown>).responseType = params.targeting.responseType;
  }
  const creative_type = params.creativeType ?? "text";
  const media_assets = Array.isArray(params.mediaAssets) && params.mediaAssets.length
    ? params.mediaAssets
    : [];
  // Toujours insérer en paused pour éviter FK org_ledger_entries (trigger BEFORE INSERT écrit avec campaign_id avant que la ligne existe).
  // Si publishNow : on passe en active après insert (la campagne existe alors, le ledger peut référencer son id).
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
      status: "paused",
      creative_type,
      media_assets,
    })
    .select("id, org_id, name, template, template_key, template_version, question, options, targeting, quota, reward_cents, price_cents, status, created_at, responses_count, is_test, creative_type, media_assets")
    .single();
  if (error) {
    if (isInsufficientOrgCreditError(error)) {
      return { error: "insufficient_org_credit" };
    }
    const msg = (error as { message?: string }).message ?? "";
    console.warn("[Supabase] createCampaign", error.message);
    return { error: "creation_failed", message: msg };
  }
  const inserted = data as CampaignRow;
  if (params.publishNow !== false) {
    const { error: updateError } = await updateCampaignStatus(inserted.id, "active");
    if (updateError) {
      const msg = (updateError as { message?: string }).message ?? "";
      if (isInsufficientOrgCreditError(updateError as { message?: string; details?: string; hint?: string })) {
        return { error: "insufficient_org_credit" };
      }
      console.warn("[Supabase] createCampaign update to active", msg);
      return { error: "creation_failed", message: msg };
    }
    const { data: updated } = await supabase
      .from("campaigns")
      .select("id, org_id, name, template, template_key, template_version, question, options, targeting, quota, reward_cents, price_cents, status, created_at, responses_count, is_test, creative_type, media_assets")
      .eq("id", inserted.id)
      .single();
    if (updated) return { campaign: rowToCampaign(updated as CampaignRow) };
  }
  return { campaign: rowToCampaign(inserted) };
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

/**
 * Dupliquer une campagne (même org uniquement). La copie est créée en paused (brouillon).
 * Pas de duplication des réponses, flags, coûts ou ledger. Facturation uniquement au passage en active.
 */
export async function duplicateCampaign(
  campaignId: string,
  overrides?: { nameSuffix?: string; question?: string }
): Promise<DuplicateCampaignResult> {
  const orgId = await getCurrentOrgId();
  if (!orgId) return null;
  const { data: source, error: fetchErr } = await supabase
    .from("campaigns")
    .select("name, template, template_key, template_version, question, options, targeting, quota, reward_cents, price_cents, creative_type, media_assets")
    .eq("id", campaignId)
    .eq("org_id", orgId)
    .is("deleted_at", null)
    .single();
  if (fetchErr || !source) return null;
  const nameSuffix = overrides?.nameSuffix ?? " — V2";
  const name = (source.name ?? "Copie").trim() + nameSuffix;
  const question = overrides?.question ?? source.question;
  const src = source as CampaignRow;
  const insertPayload: Record<string, unknown> = {
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
    creative_type: src.creative_type ?? "text",
    media_assets: Array.isArray(src.media_assets) ? src.media_assets : [],
    status: "paused",
    source_campaign_id: campaignId,
  };
  const { data: created, error: insertErr } = await supabase
    .from("campaigns")
    .insert(insertPayload)
    .select("id, org_id, name, template, template_key, template_version, question, options, targeting, quota, reward_cents, price_cents, status, created_at, responses_count, is_test, creative_type, media_assets")
    .single();
  if (insertErr) {
    const msg = (insertErr as { message?: string }).message ?? "";
    if (msg.includes("insufficient_org_credit")) return { error: "insufficient_org_credit" };
    return { error: "failed", message: msg };
  }
  if (!created) return null;
  return { campaign: rowToCampaign(created as CampaignRow) };
}

const TEST_SWIPE_NAME = "[Test swipe]";
const TEST_SWIPE_QUOTA = 9999;

/** Campagne test swipe pour l'org courant (is_test=true, pas de débit org). Une seule par org recommandée. Idempotent : si une campagne test existe déjà, la réutilise et tente de l'activer si paused. */
export async function createTestCampaign(): Promise<
  | { campaign: Campaign }
  | { error: "no_org" }
  | { error: "creation_failed"; message?: string }
  | { error: "activation_failed"; message?: string }
> {
  const orgId = await getCurrentOrgId();
  if (!orgId) return { error: "no_org" };

  const existing = await getTestCampaignForOrg();
  if (existing) {
    if (existing.status === "active") return { campaign: existing };
    const { error: updateError } = await updateCampaignStatus(existing.id, "active");
    if (updateError) {
      const msg = (updateError as { message?: string }).message ?? String(updateError);
      return { error: "activation_failed", message: msg };
    }
    const { data: updated } = await supabase
      .from("campaigns")
      .select("id, org_id, name, template, template_key, template_version, question, options, targeting, quota, reward_cents, price_cents, status, created_at, responses_count, is_test")
      .eq("id", existing.id)
      .single();
    if (updated) return { campaign: rowToCampaign(updated as CampaignRow) };
    return { campaign: existing };
  }

  const reward_cents = 10;
  const price_cents = Math.round(calcPricePerResponse(reward_cents / 100) * 100);
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      org_id: orgId,
      name: TEST_SWIPE_NAME,
      template: "A/B",
      template_key: null,
      template_version: 1,
      question: "Test swipe — Quelle option préférez-vous ?",
      options: ["Option A", "Option B"],
      targeting: { ageMin: 18, ageMax: 65, regions: [], tags: [] },
      quota: TEST_SWIPE_QUOTA,
      reward_cents,
      price_cents,
      status: "paused",
      is_test: true,
    })
    .select("id, org_id, name, template, template_key, template_version, question, options, targeting, quota, reward_cents, price_cents, status, created_at, responses_count, is_test")
    .single();
  if (error) {
    const msg = (error as { message?: string; details?: string; hint?: string }).message ?? String(error);
    console.warn("[Supabase] createTestCampaign insert", msg, error);
    return { error: "creation_failed", message: msg };
  }
  const inserted = data as CampaignRow;
  const { error: updateError } = await updateCampaignStatus(inserted.id, "active");
  if (updateError) {
    const msg = (updateError as { message?: string }).message ?? String(updateError);
    console.warn("[Supabase] createTestCampaign update to active", msg, updateError);
    return { error: "creation_failed", message: msg };
  }
  const { data: updated } = await supabase
    .from("campaigns")
    .select("id, org_id, name, template, template_key, template_version, question, options, targeting, quota, reward_cents, price_cents, status, created_at, responses_count, is_test")
    .eq("id", inserted.id)
    .single();
  if (updated) return { campaign: rowToCampaign(updated as CampaignRow) };
  return { campaign: rowToCampaign(inserted) };
}

/** Récupérer la campagne test swipe de l'org courant (s'il y en a une). */
export async function getTestCampaignForOrg(): Promise<Campaign | null> {
  const orgId = await getCurrentOrgId();
  if (!orgId) return null;
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, org_id, name, template, template_key, template_version, question, options, targeting, quota, reward_cents, price_cents, status, created_at, responses_count, is_test")
    .eq("org_id", orgId)
    .eq("is_test", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return rowToCampaign(data as CampaignRow);
}

/** Réinitialiser la campagne test (supprime les réponses, remet le compteur à 0). Réservé aux campagnes is_test. */
export async function resetTestCampaign(campaignId: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc("reset_test_campaign", { _campaign_id: campaignId });
  if (error) return { error: error.message };
  const obj = data as { ok?: boolean; error?: string } | null;
  if (obj && obj.ok) return { error: null };
  return { error: (obj?.error as string) ?? "reset_failed" };
}

/** Supprimer une campagne. Autorisé uniquement pour les campagnes is_test (sécurité). */
export async function deleteCampaign(campaignId: string): Promise<{ error: string | null }> {
  const { data: row, error: fetchErr } = await supabase
    .from("campaigns")
    .select("id, is_test")
    .eq("id", campaignId)
    .single();
  if (fetchErr || !row) return { error: "campaign_not_found" };
  if (!(row as { is_test?: boolean }).is_test) return { error: "only_test_campaigns" };
  const { error: deleteErr } = await supabase.from("campaigns").delete().eq("id", campaignId);
  if (deleteErr) return { error: deleteErr.message };
  return { error: null };
}

export type DeleteCampaignGenericResult =
  | { result: "deleted_hard"; message?: string }
  | { result: "deleted_soft"; message?: string }
  | { result: "delete_blocked"; message?: string }
  | { result: "not_found"; message?: string }
  | { error: string };

/** Suppression générique sûre : hard delete si 0 réponse et 0 ledger, sinon soft delete (deleted_at). Campagnes test → hard delete. */
export async function deleteCampaignGeneric(campaignId: string): Promise<DeleteCampaignGenericResult> {
  const { data, error } = await supabase.rpc("delete_campaign_safe", { _campaign_id: campaignId });
  if (error) return { error: error.message };
  const obj = data as { result?: string; message?: string } | null;
  if (!obj || !obj.result) return { error: "Réponse inattendue." };
  if (obj.result === "deleted_hard") return { result: "deleted_hard", message: obj.message ?? undefined };
  if (obj.result === "deleted_soft") return { result: "deleted_soft", message: obj.message ?? undefined };
  if (obj.result === "delete_blocked") return { result: "delete_blocked", message: obj.message ?? undefined };
  if (obj.result === "not_found") return { result: "not_found", message: obj.message ?? undefined };
  return { error: (obj.message as string) ?? obj.result };
}

/** Retrait en attente (dashboard). */
export interface PendingWithdrawalRow {
  id: string;
  user_id: string;
  amount_cents: number;
  status: string;
  created_at: string;
}

/** Liste des retraits en attente (RPC, org owner/editor). Rejette en cas d'erreur. */
export async function listPendingWithdrawals(): Promise<PendingWithdrawalRow[]> {
  const { data, error } = await supabase.rpc("list_pending_withdrawals");
  if (error) {
    if (process.env.NODE_ENV === "development") console.warn("[listPendingWithdrawals]", error.message);
    throw new Error(error.message);
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

/** Liste des retraits récents payés/refusés (RPC, org owner/editor). Rejette en cas d'erreur. */
export async function listRecentWithdrawals(limit = 50): Promise<RecentWithdrawalRow[]> {
  const { data, error } = await supabase.rpc("list_recent_withdrawals", { _limit: limit });
  if (error) {
    if (process.env.NODE_ENV === "development") console.warn("[listRecentWithdrawals]", error.message);
    throw new Error(error.message);
  }
  return (data ?? []) as RecentWithdrawalRow[];
}
