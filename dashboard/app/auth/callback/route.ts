import { NextResponse } from "next/server";
import { createDashboardSupabaseServer } from "@/src/lib/supabaseServer";

/**
 * Callback après clic sur le magic link Supabase.
 * Échange le code contre une session et écrit les cookies, puis redirige vers /.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const supabase = await createDashboardSupabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.warn("[auth/callback] exchangeCodeForSession", error.message);
    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
