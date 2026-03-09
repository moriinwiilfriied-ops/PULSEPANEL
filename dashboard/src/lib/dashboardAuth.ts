/**
 * Auth dashboard entreprise — serveur uniquement.
 * Session réelle, résolution org via org_members, guard des pages.
 * Séparé de adminAuth (passphrase /admin).
 */

import { redirect } from "next/navigation";
import { createDashboardSupabaseServer } from "./supabaseServer";

const COOKIE_CURRENT_ORG = "pulsepanel_current_org";
const COOKIE_CURRENT_ORG_MAX_AGE = 60 * 60 * 24 * 365; // 1 an

export type OrgMembership = { orgId: string; orgName: string; role: string };

/** Session Supabase de l'utilisateur (côté serveur). */
export async function getDashboardSession() {
  const supabase = await createDashboardSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/** Utilisateur courant (vérifié). null si non authentifié. */
export async function getDashboardUser() {
  const supabase = await createDashboardSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** Liste des orgs dont l'utilisateur est membre (owner ou editor). Vide si non authentifié. */
export async function getDashboardOrgMemberships(): Promise<OrgMembership[]> {
  const user = await getDashboardUser();
  if (!user) return [];
  const supabase = await createDashboardSupabaseServer();
  const { data: rows } = await supabase
    .from("org_members")
    .select("org_id, role, orgs(id, name)")
    .eq("user_id", user.id)
    .in("role", ["owner", "editor"]);
  if (!rows?.length) return [];
  type Row = { org_id: string; role: string; orgs: { id: string; name: string } | null };
  return (rows as unknown as Row[])
    .filter((r): r is Row & { orgs: { id: string; name: string } } => r.orgs != null)
    .map((r) => ({
      orgId: r.org_id,
      orgName: r.orgs.name ?? r.org_id,
      role: r.role,
    }));
}

/** Lit le cookie d'org courante (non validé). */
export async function getCurrentOrgCookie(): Promise<string | null> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return store.get(COOKIE_CURRENT_ORG)?.value ?? null;
}

/**
 * Définit le cookie d'org courante. À appeler uniquement après validation que l'utilisateur est bien membre de cette org.
 */
export async function setDashboardCurrentOrgCookie(orgId: string): Promise<void> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  store.set(COOKIE_CURRENT_ORG, orgId, {
    path: "/",
    maxAge: COOKIE_CURRENT_ORG_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false, // lu côté client pour getCurrentOrgId()
  });
}

/**
 * Résout l'org courante pour le dashboard :
 * - si cookie présent et dans la liste des memberships → cette org
 * - si une seule org → cette org (et on pourrait set le cookie)
 * - sinon → null (multi-org sans choix ou zéro org)
 */
export async function resolveDashboardCurrentOrg(): Promise<{
  orgId: string | null;
  memberships: OrgMembership[];
  needsSelectOrg: boolean;
}> {
  const memberships = await getDashboardOrgMemberships();
  const cookieOrg = await getCurrentOrgCookie();

  if (memberships.length === 0) {
    return { orgId: null, memberships: [], needsSelectOrg: false };
  }

  const allowedIds = new Set(memberships.map((m) => m.orgId));
  if (cookieOrg && allowedIds.has(cookieOrg)) {
    return { orgId: cookieOrg, memberships, needsSelectOrg: false };
  }

  if (memberships.length === 1) {
    return { orgId: memberships[0].orgId, memberships, needsSelectOrg: false };
  }

  return { orgId: null, memberships, needsSelectOrg: true };
}

/**
 * Guard des pages dashboard entreprise.
 * - Non authentifié → redirect /login
 * - Authentifié, 0 org → redirect /no-access
 * - Authentifié, plusieurs orgs et pas d'org courante valide → redirect /select-org
 * - Sinon retourne { user, orgId, memberships } (orgId peut être la seule org ou celle du cookie).
 */
export async function guardDashboard(): Promise<{
  userId: string;
  email: string | null;
  orgId: string;
  memberships: OrgMembership[];
} | null> {
  const user = await getDashboardUser();
  if (!user) {
    redirect("/login");
  }

  const { orgId, memberships, needsSelectOrg } = await resolveDashboardCurrentOrg();

  if (memberships.length === 0) {
    redirect("/no-access");
  }

  if (needsSelectOrg) {
    redirect("/select-org");
  }

  if (!orgId) {
    redirect("/no-access");
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    orgId,
    memberships,
  };
}

/**
 * Vérifie que l'utilisateur a le droit d'accéder à l'org donnée (doit être dans ses memberships).
 * Utile pour les API routes qui reçoivent un orgId.
 */
export async function assertUserCanAccessOrg(orgId: string): Promise<OrgMembership | null> {
  const memberships = await getDashboardOrgMemberships();
  const m = memberships.find((x) => x.orgId === orgId) ?? null;
  return m;
}
