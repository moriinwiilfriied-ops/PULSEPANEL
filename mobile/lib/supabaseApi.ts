/**
 * Appels Supabase — Mobile (avec fallback mock)
 */

import { supabase } from '@/lib/supabase';
import type { FeedQuestion, MockQuestion } from '@/lib/mockData';
import { getAppStore } from '@/store/useAppStore';

export interface UserOnboardingRow {
  id: string;
  age_bucket: string | null;
  region: string | null;
  tags: string[] | null;
  onboarding_completed: boolean;
}

/** Upsert public.users au submit onboarding (id = auth.uid()). */
export async function upsertUserOnboarding(params: {
  ageBucket: string;
  region: string | null;
  tags: string[];
}): Promise<{ error: Error | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };
  const { error } = await supabase
    .from('users')
    .upsert(
      {
        id: user.id,
        age_bucket: params.ageBucket || null,
        region: params.region || null,
        tags: params.tags?.length ? params.tags : [],
        onboarding_completed: true,
      },
      { onConflict: 'id' }
    );
  return { error: error ?? null };
}

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
  responses_count?: number;
}

/** Fetch campaigns actives avec progress < quota (limit 20). Retourne [] en cas d'erreur. */
export async function fetchActiveCampaigns(): Promise<CampaignRow[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, name, template, question, options, targeting, quota, reward_cents, price_cents, status, created_at, responses_count')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    console.warn('[Supabase] fetchActiveCampaigns', error.message);
    return [];
  }
  const rows = (data ?? []) as CampaignRow[];
  return rows.filter((c) => (c.responses_count ?? 0) < c.quota).slice(0, 20);
}

/** Une campagne par ID (pour l'écran Answer). */
export async function fetchCampaignById(id: string): Promise<CampaignRow | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, name, template, question, options, targeting, quota, reward_cents, price_cents, status, created_at')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data as CampaignRow;
}

/** Réponses déjà soumises par l'utilisateur (campaign_id list). */
export async function fetchMyAnsweredCampaignIds(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('responses')
    .select('campaign_id')
    .eq('user_id', user.id);
  if (error) return [];
  const ids = [...new Set((data ?? []).map((r: { campaign_id: string }) => r.campaign_id))];
  return ids;
}

/** Convertit une ligne campagne Supabase en format feed (FeedQuestion). */
export function campaignToFeedQuestion(row: CampaignRow): FeedQuestion {
  const options = Array.isArray(row.options) ? row.options : [];
  const type = (row.template === 'Slogan' || row.template === 'Price test' ? 'choice' : row.template === 'A/B' ? 'poll' : 'choice') as FeedQuestion['type'];
  const questionText = (row.question ?? row.name ?? '').trim() || 'Question (à définir)';
  const opts = options.length ? options : (type === 'poll' ? ['Oui', 'Non'] : undefined);
  return {
    id: row.id,
    question: questionText,
    questionText,
    source: 'supabase',
    type,
    options: opts,
    reward: row.reward_cents / 100,
    etaSeconds: 45,
    campaignId: row.id,
  };
}

/** Garantit une valeur utilisable comme string[] (pour .includes sans crash). */
function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x ?? '')).filter(Boolean);
  if (v != null && typeof v === 'object' && 'size' in v && typeof (v as Set<unknown>).has === 'function') {
    return Array.from(v as Set<unknown>).map((x) => String(x ?? '')).filter(Boolean);
  }
  if (v != null) return [String(v)].filter(Boolean);
  return [];
}

/**
 * Récupère les questions feed : Supabase campaigns (actives, non répondues) ou fallback mock.
 * Ne jette pas : en cas d'erreur retourne [] pour que le caller utilise le mock.
 */
export async function getFeedQuestions(): Promise<FeedQuestion[]> {
  try {
    const store = getAppStore();
    const history = store.history ?? [];
    const answeredIdsFromHistory: string[] = history.map((h) => {
      if (h == null || typeof h !== 'object') return '';
      const id = 'questionId' in h ? h.questionId : 'campaignId' in h ? (h as { campaignId?: string }).campaignId : null;
      if (id == null) return '';
      const s = String(id);
      return s || '';
    }).filter(Boolean);

    const [campaigns, myAnsweredRaw] = await Promise.all([
      fetchActiveCampaigns(),
      fetchMyAnsweredCampaignIds(),
    ]);
    const myAnsweredIds: string[] = asArray(myAnsweredRaw);
    const answeredIds: string[] = [...answeredIdsFromHistory, ...myAnsweredIds];

    if (!Array.isArray(campaigns)) {
      if (__DEV__) console.warn('[Supabase] getFeedQuestions: campaigns not an array', typeof campaigns);
      return [];
    }
    const available = campaigns.filter((c) => c && !answeredIds.includes(String(c.id)));
    if (available.length > 0) {
      return available.map(campaignToFeedQuestion);
    }
  } catch (e) {
    console.warn('[Supabase] getFeedQuestions fallback to mock', e);
  }
  return [];
}

/** Insert response + met à jour le wallet local (mock). */
export async function submitResponseToSupabase(params: {
  campaignId: string;
  question: string;
  answer: string;
  durationMs?: number;
  rewardCents: number;
}): Promise<{ error: Error | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error('Not authenticated') };
  const { error } = await supabase.from('responses').insert({
    campaign_id: params.campaignId,
    user_id: user.id,
    answer: { value: params.answer },
    duration_ms: params.durationMs ?? null,
  });
  if (error) return { error };
  const reward = params.rewardCents / 100;
  const entry = {
    id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    questionId: params.campaignId,
    questionTitle: params.question,
    answer: params.answer,
    reward,
    status: 'pending' as const,
    at: new Date().toISOString(),
  };
  getAppStore().addHistoryEntry(entry);
  getAppStore().addPendingReward(reward);
  return { error: null };
}
