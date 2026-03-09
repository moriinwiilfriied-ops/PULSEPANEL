/**
 * Appels Supabase — Mobile (avec fallback mock)
 */

import { supabase } from '@/lib/supabase';
import type { FeedQuestion, MockQuestion } from '@/lib/mockData';
import { getAvailableQuestions } from '@/lib/mockData';
import { getAppStore } from '@/store/useAppStore';

export type FeedSource = 'supabase' | 'supabase_error' | 'mock';

export interface FeedQuestionsResult {
  source: FeedSource;
  items: FeedQuestion[];
  error?: string;
}

/** Entrée d’historique wallet serveur (responses + question lisible via join campaigns). */
export interface ServerWalletHistoryEntry {
  id: string;
  campaignId: string;
  questionText: string;
  answer: string | null;
  rewardCents: number;
  payoutStatus: 'pending' | 'available';
  createdAt: string;
}

/** Supabase est configuré si l’URL est définie. */
export function isSupabaseConfigured(): boolean {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  return url.length > 0;
}

export interface UserOnboardingRow {
  id: string;
  age_bucket: string | null;
  region: string | null;
  tags: string[] | null;
  onboarding_completed: boolean;
}

/** Trust affiché depuis la DB (users.trust_level / users.trust_score). Lecture propre RLS own. */
export interface UserTrustRow {
  trust_level: string | null;
  trust_score: number | null;
}

/** Récupère trust_level et trust_score de l’utilisateur courant (public.users). Source de vérité pour le profil. */
export async function fetchUserTrust(): Promise<UserTrustRow | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('users')
    .select('trust_level, trust_score')
    .eq('id', user.id)
    .maybeSingle();
  if (error) {
    if (__DEV__) console.warn('[Supabase] fetchUserTrust', error.message);
    return null;
  }
  if (!data) return null;
  const row = data as { trust_level?: string | null; trust_score?: number | null };
  return {
    trust_level: row.trust_level ?? null,
    trust_score: row.trust_score ?? null,
  };
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

/** Fetch campaigns actives (status=active, responses_count < quota). Expose erreur pour ne pas fallback mock silencieux. */
export async function fetchActiveCampaigns(): Promise<{ campaigns: CampaignRow[]; error?: string }> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, name, template, question, options, targeting, quota, reward_cents, price_cents, status, created_at, responses_count')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    if (__DEV__) console.warn('[Supabase] fetchActiveCampaigns', error.message);
    return { campaigns: [], error: error.message };
  }
  const rows = (data ?? []) as CampaignRow[];
  const campaigns = rows.filter((c) => (c.responses_count ?? 0) < c.quota).slice(0, 20);
  return { campaigns };
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
 * Récupère le feed avec source explicite : supabase (même vide), supabase_error, ou mock si SB non configuré.
 */
export async function getFeedQuestionsWithSource(): Promise<FeedQuestionsResult> {
  if (!isSupabaseConfigured()) {
    return { source: 'mock', items: getAvailableQuestions() };
  }

  try {
    const store = getAppStore();
    const history = store.history ?? [];
    const answeredIdsFromHistory: string[] = history.map((h) => {
      if (h == null || typeof h !== 'object') return '';
      const id = 'questionId' in h ? h.questionId : 'campaignId' in h ? (h as { campaignId?: string }).campaignId : null;
      return id != null ? String(id) : '';
    }).filter(Boolean);

    const [campRes, myAnsweredRaw] = await Promise.all([
      fetchActiveCampaigns(),
      fetchMyAnsweredCampaignIds(),
    ]);

    if (campRes.error) {
      if (__DEV__) console.warn('[Supabase] feed', campRes.error);
      return { source: 'supabase_error', error: campRes.error, items: [] };
    }

    const myAnsweredIds: string[] = asArray(myAnsweredRaw);
    const answeredIds: string[] = [...answeredIdsFromHistory, ...myAnsweredIds];
    const available = campRes.campaigns.filter((c) => c && !answeredIds.includes(String(c.id)));
    const items = available.map(campaignToFeedQuestion);
    return { source: 'supabase', items };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (__DEV__) console.warn('[Supabase] getFeedQuestionsWithSource', e);
    return { source: 'supabase_error', error: msg, items: [] };
  }
}

/**
 * @deprecated Utiliser getFeedQuestionsWithSource() pour distinguer SB vide / erreur / mock.
 */
export async function getFeedQuestions(): Promise<FeedQuestion[]> {
  const res = await getFeedQuestionsWithSource();
  return res.items;
}

export interface WalletFromSupabase {
  pendingCents: number;
  availableCents: number;
  history: ServerWalletHistoryEntry[];
  /** false si aucune ligne user_balances pour cet utilisateur (répondez à une question SB). */
  hasBalanceRow: boolean;
}

type ResponseRowWithCampaign = {
  id: string;
  campaign_id: string;
  reward_cents: number;
  payout_status: string;
  created_at: string;
  answer: { value?: string } | null;
  campaigns: { question?: string; name?: string; template?: string } | null;
};

/** Récupère balances + 20 dernières réponses depuis la DB (source de vérité). Robuste : logs en cas d’erreur, ne crash pas. */
export async function fetchWalletFromSupabase(): Promise<WalletFromSupabase | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    if (__DEV__) console.warn('[Supabase] fetchWalletFromSupabase: no user (auth.uid())');
    return null;
  }

  let pendingCents = 0;
  let availableCents = 0;
  let hasBalanceRow = false;

  const balanceRes = await supabase
    .from('user_balances')
    .select('pending_cents, available_cents')
    .eq('user_id', user.id)
    .maybeSingle();

  if (balanceRes.error) {
    const err = balanceRes.error as { status?: number; message?: string };
    console.warn('[Supabase] wallet user_balances', err.status, err.message);
  } else if (balanceRes.data) {
    pendingCents = Number((balanceRes.data as { pending_cents?: number }).pending_cents) || 0;
    availableCents = Number((balanceRes.data as { available_cents?: number }).available_cents) || 0;
    hasBalanceRow = true;
  }

  const responsesRes = await supabase
    .from('responses')
    .select('id, campaign_id, reward_cents, payout_status, created_at, answer, campaigns(question, name, template)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (responsesRes.error) {
    const err = responsesRes.error as { status?: number; message?: string };
    console.warn('[Supabase] wallet responses', err.status, err.message);
  }

  const rows = (responsesRes.data ?? []) as ResponseRowWithCampaign[];
  const history: ServerWalletHistoryEntry[] = rows.map((r) => {
    const c = r.campaigns;
    const questionText = (c?.question ?? c?.name ?? '').trim() || 'Question';
    const answerVal =
      r.answer && typeof r.answer === 'object' && 'value' in r.answer
        ? String(r.answer.value)
        : r.answer != null
          ? JSON.stringify(r.answer)
          : null;
    return {
      id: r.id,
      campaignId: r.campaign_id,
      questionText,
      answer: answerVal,
      rewardCents: r.reward_cents ?? 0,
      payoutStatus: r.payout_status === 'available' ? 'available' : 'pending',
      createdAt: r.created_at,
    };
  });

  return {
    pendingCents,
    availableCents,
    history,
    hasBalanceRow,
  };
}

/** Message utilisateur pour les erreurs de plafond journalier (réponse). */
export function responseLimitErrorToMessage(message: string | undefined): string | null {
  if (!message) return null;
  if (message.includes('daily_response_count_limit_reached')) {
    return "Tu as atteint ta limite de réponses pour aujourd'hui. Reviens plus tard.";
  }
  if (message.includes('daily_reward_limit_reached')) {
    return "Tu as atteint ton plafond de gains pour aujourd'hui. Reviens plus tard.";
  }
  return null;
}

/** Insert response ; le crédit pending est fait par le trigger DB. Puis refetch wallet. */
export async function submitResponseToSupabase(params: {
  campaignId: string;
  question: string;
  answer: string;
  durationMs?: number;
  rewardCents: number;
}): Promise<{ error: Error | null; reward?: number }> {
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
  const wallet = await fetchWalletFromSupabase();
  if (wallet) getAppStore().setServerWallet(wallet);
  return { error: null, reward };
}

/** DEV : valider les paiements d’une campagne (RPC). Nécessite d’être membre org owner/editor. */
export async function validateCampaignPayouts(campaignId: string): Promise<{
  error: Error | null;
  validated_responses?: number;
  users?: number;
  total_cents?: number;
}> {
  const { data, error } = await supabase.rpc('validate_campaign_payouts', { _campaign_id: campaignId });
  if (error) return { error };
  const obj = data as { error?: string; validated_responses?: number; users?: number; total_cents?: number } | null;
  if (obj?.error) return { error: new Error(obj.error) };
  return {
    error: null,
    validated_responses: obj?.validated_responses,
    users: obj?.users,
    total_cents: obj?.total_cents,
  };
}

/** Entrée liste "Mes retraits" */
export interface WithdrawalRow {
  id: string;
  user_id: string;
  amount_cents: number;
  status: 'pending' | 'paid' | 'rejected';
  method: string | null;
  note: string | null;
  created_at: string;
  decided_at: string | null;
}

/** Demande de retrait (RPC). Réserve le montant, crée withdrawal pending + ledger. */
export async function requestWithdrawal(amountCents: number): Promise<{
  error: Error | null;
  withdrawal_id?: string;
  amount_cents?: number;
  status?: string;
}> {
  const { data, error } = await supabase.rpc('request_withdrawal', { _amount_cents: amountCents });
  if (error) return { error };
  const obj = data as { error?: string; withdrawal_id?: string; amount_cents?: number; status?: string } | null;
  if (obj?.error) return { error: new Error(obj.error) };
  return {
    error: null,
    withdrawal_id: obj?.withdrawal_id,
    amount_cents: obj?.amount_cents,
    status: obj?.status,
  };
}

/** Statut des plafonds journaliers (jour UTC). */
export interface UserDailyLimitStatus {
  trust_level: string;
  valid_responses_today: number;
  reward_cents_today: number;
  withdrawal_requests_today: number;
  max_valid_responses_per_day: number;
  max_reward_cents_per_day: number;
  max_withdrawal_requests_per_day: number;
  remaining_valid_responses_today: number;
  remaining_reward_cents_today: number;
  remaining_withdrawal_requests_today: number;
  shared_device_users_count?: number;
  open_flags_count?: number;
}

export async function fetchUserDailyLimitStatus(): Promise<UserDailyLimitStatus | null> {
  const { data, error } = await supabase.rpc('get_user_daily_limit_status');
  if (error || !data || (data as { error?: string }).error) return null;
  return data as UserDailyLimitStatus;
}

/** Liste des 20 derniers retraits de l'utilisateur (RLS). */
export async function fetchMyWithdrawals(): Promise<WithdrawalRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('withdrawals')
    .select('id, user_id, amount_cents, status, method, note, created_at, decided_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) {
    if (__DEV__) console.warn('[Supabase] fetchMyWithdrawals', error.message);
    return [];
  }
  return (data ?? []) as WithdrawalRow[];
}
