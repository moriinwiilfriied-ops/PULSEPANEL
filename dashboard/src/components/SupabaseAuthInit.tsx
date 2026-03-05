"use client";

import { useEffect } from "react";
import { ensureAnonSession, ensureOrg } from "@/src/lib/supabase";

/**
 * Au premier rendu client : session anonyme puis org par défaut si aucune.
 */
export function SupabaseAuthInit({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    (async () => {
      await ensureAnonSession();
      await ensureOrg();
    })();
  }, []);
  return <>{children}</>;
}
