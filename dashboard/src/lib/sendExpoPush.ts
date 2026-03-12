/**
 * Envoi de notifications push Expo depuis le dashboard (service role).
 * Utilisé après décision retrait (payé/rejeté). Respecte users.notif_wallet_updates.
 */

import { supabaseAdmin } from "./supabaseAdmin";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface SendWithdrawalDecidedParams {
  userId: string;
  decision: "paid" | "rejected";
  amountCents: number;
}

const EXPO_PUSH_TOKEN_PREFIX = "ExponentPushToken[";
const EXPO_PUSH_TOKEN_MIN_LENGTH = EXPO_PUSH_TOKEN_PREFIX.length + 10;

function isValidExpoPushToken(t: string): boolean {
  return (
    typeof t === "string" &&
    t.startsWith(EXPO_PUSH_TOKEN_PREFIX) &&
    t.length >= EXPO_PUSH_TOKEN_MIN_LENGTH
  );
}

/** Récupère les tokens Expo push pour un user si notif_wallet_updates est true. */
async function getPushTokensForUser(userId: string): Promise<string[]> {
  if (!userId || typeof userId !== "string") return [];

  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("notif_wallet_updates")
    .eq("id", userId)
    .maybeSingle();

  if (!userRow?.notif_wallet_updates) return [];

  const { data: devices } = await supabaseAdmin
    .from("user_devices")
    .select("expo_push_token")
    .eq("user_id", userId)
    .not("expo_push_token", "is", null);

  const tokens = (devices ?? [])
    .map((d: { expo_push_token: string | null }) => d.expo_push_token)
    .filter((t): t is string => isValidExpoPushToken(t ?? ""));

  return [...new Set(tokens)];
}

const EXPO_PUSH_TIMEOUT_MS = 15_000;

/** Envoie une requête au service Expo Push. Ne lance pas si tokens est vide. N’échoue pas en cas d’erreur réseau/API. */
async function sendToExpo(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const valid = tokens.filter(isValidExpoPushToken);
  if (valid.length === 0) return;

  const messages = valid.map((to) => ({
    to,
    title,
    body,
    sound: "default",
    ...(data && { data }),
  }));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EXPO_PUSH_TIMEOUT_MS);
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok && process.env.NODE_ENV !== "test") {
      const text = await res.text();
      console.warn("[sendExpoPush] Expo API error", res.status, text.slice(0, 200));
    }
  } catch (e) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("[sendExpoPush] request failed", e instanceof Error ? e.message : String(e));
    }
  }
}

/**
 * Envoie une notification "Retrait payé" ou "Retrait rejeté" à l’utilisateur.
 * Appelé après admin_decide_withdrawal (ne modifie pas la réponse API en cas d’échec push).
 */
export async function sendWithdrawalDecidedPush(params: SendWithdrawalDecidedParams): Promise<void> {
  try {
    const { userId, decision, amountCents } = params;
    if (decision !== "paid" && decision !== "rejected") return;
    const amountEur = (amountCents / 100).toFixed(2);

  const title =
    decision === "paid"
      ? "Retrait payé"
      : "Retrait refusé";
  const body =
    decision === "paid"
      ? `${amountEur} € ont été versés. Merci de votre confiance.`
      : `Votre demande de retrait de ${amountEur} € n’a pas été acceptée. Consultez l’app pour plus d’infos.`;

    const tokens = await getPushTokensForUser(userId);
    if (process.env.NODE_ENV !== "test") {
      console.info("[sendWithdrawalDecidedPush] userId=%s decision=%s tokensCount=%d", userId, decision, tokens.length);
    }
    await sendToExpo(tokens, title, body, {
      type: "withdrawal_decided",
      decision,
      amount_cents: amountCents,
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("[sendWithdrawalDecidedPush] error", e instanceof Error ? e.message : String(e));
    }
  }
}
