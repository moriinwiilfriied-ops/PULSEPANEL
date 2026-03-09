/**
 * Client Supabase côté serveur (Next.js App Router).
 * Utilise les cookies pour la session. À utiliser dans Server Components, Route Handlers, Server Actions.
 * Ne pas importer côté client.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function createDashboardSupabaseServer() {
  const store = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          store.set(name, value, options);
        });
      },
    },
  });
}
