/**
 * Client Supabase — Dashboard (Next.js)
 * Variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(url, anonKey);

/**
 * Assure une session anonyme (pour auth.uid()). À appeler au premier rendu client.
 * Activer "Anonymous" dans Supabase Dashboard → Authentication → Providers.
 */
export async function ensureAnonSession(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn('[Supabase] signInAnonymously failed. Enable Anonymous in Auth providers.', error.message);
  }
}

/**
 * Retourne l'org du user courant (première org dont il est membre). null si aucune.
 */
export async function getCurrentOrgId(): Promise<string | null> {
  const m = await getOrgMembership();
  return m?.orgId ?? null;
}

/**
 * Retourne l'org + rôle du user courant (première ligne org_members). Pour DEV / debug RPC.
 */
export async function getOrgMembership(): Promise<{
  orgId: string;
  role: string;
} | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const orgId = (data as { org_id?: string }).org_id;
  const role = (data as { role?: string }).role ?? '';
  return orgId ? { orgId, role } : null;
}

/**
 * Si le user n'a aucune org, crée "PulsePanel (demo)" et le met owner (trigger).
 * À appeler après ensureAnonSession().
 */
export async function ensureOrg(): Promise<void> {
  const orgId = await getCurrentOrgId();
  if (orgId) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('orgs')
    .insert({ name: 'PulsePanel (demo)', created_by: user.id });
  if (error) {
    console.warn('[Supabase] ensureOrg failed', error.message);
  }
}

export interface OrgBalance {
  available_cents: number;
  spent_cents: number;
}

/**
 * Solde du wallet entreprise (org). null si pas membre ou erreur.
 */
export async function getOrgBalance(orgId: string): Promise<OrgBalance | null> {
  const { data, error } = await supabase
    .from('org_balances')
    .select('available_cents, spent_cents')
    .eq('org_id', orgId)
    .maybeSingle();
  if (error) {
    if (process.env.NODE_ENV === 'development') console.warn('[getOrgBalance]', error.message);
    return null;
  }
  if (!data) return null;
  const row = data as { available_cents?: number; spent_cents?: number };
  return {
    available_cents: Number(row.available_cents ?? 0),
    spent_cents: Number(row.spent_cents ?? 0),
  };
}

/**
 * Recharge DEV du wallet org (RPC org_topup_dev). Pour tests.
 */
export async function orgTopupDev(
  orgId: string,
  amountCents: number
): Promise<{ ok: true; added_cents: number; available_cents: number } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc('org_topup_dev', {
    _org_id: orgId,
    _amount_cents: amountCents,
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  const obj = data as { error?: string; added_cents?: number; available_cents?: number } | null;
  if (obj?.error) return { ok: false, error: obj.error };
  return {
    ok: true,
    added_cents: Number(obj?.added_cents ?? amountCents),
    available_cents: Number(obj?.available_cents ?? 0),
  };
}
