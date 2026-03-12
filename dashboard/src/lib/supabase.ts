/**
 * Client Supabase — Dashboard (Next.js)
 * Utilise @supabase/ssr (cookies) pour la session. Auth entreprise = magic link, org = org_members + cookie pulsepanel_current_org.
 * Variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createBrowserClient(url, anonKey);

const COOKIE_CURRENT_ORG = 'pulsepanel_current_org';

/** Lit l'org courante depuis le cookie (côté client). Le serveur valide toujours l'accès. */
function getCurrentOrgFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_CURRENT_ORG}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Fallback dev uniquement : assure une session anonyme si DASHBOARD_ALLOW_ANON_DEV=1.
 * Ne pas activer en production.
 */
export async function ensureAnonSession(): Promise<void> {
  if (process.env.NODE_ENV !== 'development' || process.env.DASHBOARD_ALLOW_ANON_DEV !== '1') return;
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn('[Supabase] signInAnonymously failed.', error.message);
  }
}

const ROLE_ORDER: Record<string, number> = { owner: 0, editor: 1 };

/**
 * Retourne l'org courante : cookie validé côté serveur (middleware/layout), ou première membership.
 */
export async function getCurrentOrgId(): Promise<string | null> {
  const m = await getOrgMembership();
  return m?.orgId ?? null;
}

/**
 * Org + rôle : cookie pulsepanel_current_org si dans la liste des memberships, sinon première (owner > editor > created_at desc).
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
    .eq('user_id', user.id)
    .in('role', ['owner', 'editor']);
  if (!rows?.length) return null;
  const withCreated = rows as Array<{
    org_id?: string;
    role?: string;
    orgs?: { created_at?: string } | null;
  }>;
  const cookieOrg = getCurrentOrgFromCookie();
  const byCookie = cookieOrg ? withCreated.find((r) => r.org_id === cookieOrg) : null;
  if (byCookie) {
    return { orgId: byCookie.org_id!, role: byCookie.role ?? '' };
  }
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
 * Fallback dev uniquement (DASHBOARD_ALLOW_ANON_DEV=1) : crée "PulsePanel (demo)" si aucune org.
 * En production : no-op (ne fait rien). La garde d'accès (proxy) redirige vers /no-access si 0 org.
 */
export async function ensureOrg(): Promise<void> {
  if (process.env.NODE_ENV !== 'development' || process.env.DASHBOARD_ALLOW_ANON_DEV !== '1') return;
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
