/**
 * Admin session — server-side only.
 * Protection pilot: ADMIN_DASHBOARD_PASSPHRASE, cookie httpOnly.
 * Ne pas importer côté client.
 */

import { cookies } from "next/headers";
import { createHash } from "crypto";

const COOKIE_NAME = "pulsepanel_admin_session";
const COOKIE_PATH = "/admin";
const MAX_AGE = 60 * 60 * 8; // 8h

function getPassphraseHash(): string | null {
  const pass = process.env.ADMIN_DASHBOARD_PASSPHRASE;
  if (!pass || pass.length === 0) return null;
  return createHash("sha256").update(pass + "pulsepanel_salt").digest("hex");
}

/** Vérifie que la session admin est valide (cookie présent et égal au hash du passphrase). */
export async function getAdminSession(): Promise<boolean> {
  const hash = getPassphraseHash();
  if (!hash) return false;
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  return value === hash;
}

/** Valide le passphrase saisi et définit le cookie si correct. */
export async function validateAndSetAdminCookie(inputPassphrase: string): Promise<boolean> {
  const hash = getPassphraseHash();
  if (!hash) return false;
  const inputHash = createHash("sha256").update(inputPassphrase + "pulsepanel_salt").digest("hex");
  if (inputHash !== hash) return false;
  const store = await cookies();
  store.set(COOKIE_NAME, hash, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: MAX_AGE,
  });
  return true;
}

/** Supprime le cookie admin (déconnexion). */
export async function clearAdminCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Admin activé seulement si la variable d'env est définie. */
export function isAdminEnabled(): boolean {
  return Boolean(process.env.ADMIN_DASHBOARD_PASSPHRASE);
}
