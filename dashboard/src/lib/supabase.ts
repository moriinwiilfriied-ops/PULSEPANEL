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

const ROLE_ORDER: Record<string, number> = { owner: 0, editor: 1 };

/**
 * Retourne l'org du user courant (déterministe: owner puis editor, puis org la plus récente). null si aucune.
 */
export async function getCurrentOrgId(): Promise<string | null> {
  const m = await getOrgMembership();
  return m?.orgId ?? null;
}

/**
 * Org + rôle déterministe: owner avant editor, puis orgs.created_at desc. Même org partout (header, campaigns/new).
 */
export async function getOrgMembership(): Promise<{
  orgId: string;
  role: string;
} | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: rows } = await supabase
    .from('org_members')
    .select('org_id, role, orgs(created_at)')
    .eq('user_id', user.id);
  if (!rows?.length) return null;
  const withCreated = rows as Array<{
    org_id?: string;
    role?: string;
    orgs?: { created_at?: string } | null;
  }>;
  const sorted = [...withCreated].sort((a, b) => {
    const orderA = ROLE_ORDER[a.role ?? ''] ?? 2;
    const orderB = ROLE_ORDER[b.role ?? ''] ?? 2;
    if (orderA !== orderB) return orderA - orderB;
    const atA = a.orgs?.created_at ?? '';
    const atB = b.orgs?.created_at ?? '';
    return atB.localeCompare(atA);
  });
  const first = sorted[0];
  const orgId = first?.org_id ?? null;
  const role = first?.role ?? '';
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

export interface OrgLedgerRow {
  created_at: string;
  amount_cents: number;
  reason: string | null;
  campaign_id: string | null;
  campaign_title?: string | null;
}

/**
 * Liste les mouvements du ledger org (via RPC sécurisée). Erreur si non authentifié ou pas droit sur l'org.
 */
export async function listOrgLedger(
  orgId: string,
  limit = 100
): Promise<{ data?: OrgLedgerRow[]; error?: string }> {
  const { data, error } = await supabase.rpc('list_org_ledger', {
    _org_id: orgId,
    _limit: limit,
  });
  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('forbidden')) return { error: 'Vous n\'êtes pas autorisé.' };
    if (msg.includes('not_authenticated') || msg.includes('jwt')) return { error: 'Connectez-vous.' };
    return { error: 'Impossible de charger la facturation.' };
  }
  const rows = (data ?? []) as OrgLedgerRow[];
  return { data: rows };
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
