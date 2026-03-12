"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { login as copy } from "@/src/lib/uiCopy";
import { dash } from "@/src/lib/dashboardTheme";
import { PanelCard } from "@/src/components/ui/PanelCard";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function getClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorParam = searchParams?.get("error") ?? null;
  const errorMessage =
    errorParam === "missing_code"
      ? copy.errorMissingCode
      : errorParam === "auth_failed"
        ? copy.errorAuthFailed
        : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError(copy.errorEmailRequired);
      return;
    }
    setLoading(true);
    try {
      const client = getClient();
      const appUrl =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error: err } = await client.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${appUrl}/auth/callback`,
        },
      });
      if (err) {
        setError(copy.errorSendFailed);
        return;
      }
      setSent(true);
    } catch {
      setError(copy.errorUnexpected);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${dash.page} flex items-center justify-center px-4`}>
      <PanelCard className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-dash-text mb-1">{copy.title}</h1>
        {copy.subtitle && (
          <p className="text-sm text-dash-text-muted mb-4">{copy.subtitle}</p>
        )}
        <p className="text-sm text-dash-text-secondary mb-6">{copy.emailHint}</p>

        {errorMessage && (
          <p className="text-sm text-amber-400 mb-4 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2">
            {errorMessage}
          </p>
        )}

        {sent ? (
          <div className="text-sm text-dash-text-secondary space-y-2">
            <p>{copy.sentMessage} <strong className="text-dash-text">{email}</strong>{"."}</p>
            <p className="text-dash-text-muted">{copy.sentHint}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-dash-text">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
              className="w-full rounded-lg border border-dash-border bg-dash-surface-2 px-4 py-2 text-dash-text placeholder:text-dash-text-muted focus:outline-none focus:ring-2 focus:ring-dash-accent/30"
              autoComplete="email"
              disabled={loading}
            />
            {error && <p className="text-sm text-dash-danger">{error}</p>}
            <button type="submit" disabled={loading} className={`w-full ${dash.btn} ${dash.btnPrimary}`}>
              {loading ? copy.buttonSending : copy.buttonSend}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-dash-text-muted">
          <Link href="/" className={dash.link}>{copy.backToHome.replace(/'/g, "\u2019")}</Link>
        </p>
      </PanelCard>
    </div>
  );
}
