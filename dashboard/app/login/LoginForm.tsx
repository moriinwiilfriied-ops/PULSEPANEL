"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { login as copy } from "@/src/lib/uiCopy";

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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          {copy.title}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          {copy.emailHint}
        </p>

        {errorMessage && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 px-3 py-2">
            {errorMessage}
          </p>
        )}

        {sent ? (
          <div className="text-sm text-zinc-600 dark:text-zinc-300 space-y-2">
            <p>Un lien de connexion a été envoyé à <strong>{email}</strong>.</p>
            <p className="text-zinc-500 dark:text-zinc-400">
              Cliquez sur le lien dans l'e-mail pour accéder au dashboard.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              autoComplete="email"
              disabled={loading}
            />
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? copy.buttonSending : copy.buttonSend}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/" className="hover:underline">
            Retour à l'accueil
          </Link>
        </p>
      </div>
    </div>
  );
}
