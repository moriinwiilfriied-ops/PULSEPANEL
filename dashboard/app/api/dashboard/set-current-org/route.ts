import { NextResponse } from "next/server";
import { assertUserCanAccessOrg, setDashboardCurrentOrgCookie } from "@/src/lib/dashboardAuth";

/**
 * POST { orgId } — Définit l’org courante pour la session.
 * Vérification serveur : l’utilisateur doit être membre (owner/editor) de cette org.
 */
export async function POST(request: Request) {
  const user = await (await import("@/src/lib/dashboardAuth")).getDashboardUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let body: { orgId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 }
    );
  }

  const orgId = body.orgId;
  if (!orgId || typeof orgId !== "string") {
    return NextResponse.json(
      { error: "orgId requis." },
      { status: 400 }
    );
  }

  const membership = await assertUserCanAccessOrg(orgId);
  if (!membership) {
    return NextResponse.json(
      { error: "Accès refusé à cette organisation." },
      { status: 403 }
    );
  }

  await setDashboardCurrentOrgCookie(orgId);
  return NextResponse.json({ ok: true, orgId });
}
