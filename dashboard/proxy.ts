import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ADMIN_LOGIN = "/admin/login";
const ADMIN_PREFIX = "/admin";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

async function hashPassphrase(passphrase: string): Promise<string> {
  const data = new TextEncoder().encode(passphrase + "pulsepanel_salt");
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isDashboardPublicPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/auth/") ||
    pathname === "/no-access" ||
    pathname === "/select-org"
  );
}

/** Rafraîchit la session Supabase et applique le guard dashboard (redirect login / no-access / select-org). */
async function updateSupabaseSessionAndGuard(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (isDashboardPublicPath(pathname)) {
    return response;
  }

  const allowAnonDev =
    process.env.NODE_ENV === "development" &&
    process.env.DASHBOARD_ALLOW_ANON_DEV === "1";

  if (!user) {
    if (allowAnonDev) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const { data: rows } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .in("role", ["owner", "editor"]);
  const orgIds = (rows ?? []).map((r: { org_id: string }) => r.org_id);

  if (orgIds.length === 0) {
    const url = request.nextUrl.clone();
    url.pathname = "/no-access";
    return NextResponse.redirect(url);
  }

  const currentOrgCookie = request.cookies.get("pulsepanel_current_org")?.value ?? null;
  const cookieValid = currentOrgCookie && orgIds.includes(currentOrgCookie);

  if (orgIds.length > 1 && !cookieValid) {
    const url = request.nextUrl.clone();
    url.pathname = "/select-org";
    return NextResponse.redirect(url);
  }

  return response;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith(ADMIN_PREFIX)) {
    if (pathname === ADMIN_LOGIN || pathname.startsWith(ADMIN_LOGIN + "/")) {
      return NextResponse.next();
    }
    const passphrase = process.env.ADMIN_DASHBOARD_PASSPHRASE;
    if (!passphrase?.length) {
      return NextResponse.next();
    }
    const cookieValue = request.cookies.get("pulsepanel_admin_session")?.value;
    const expectedHash = await hashPassphrase(passphrase);
    if (cookieValue !== expectedHash) {
      const url = request.nextUrl.clone();
      url.pathname = ADMIN_LOGIN;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return updateSupabaseSessionAndGuard(request);
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

