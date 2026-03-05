"use client";

import { useEffect } from "react";
import { ensureAnonSession } from "@/src/lib/supabase";

/**
 * Appelle ensureAnonSession au premier rendu client (session anonyme pour RLS).
 */
export function SupabaseAuthInit({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    ensureAnonSession();
  }, []);
  return <>{children}</>;
}
