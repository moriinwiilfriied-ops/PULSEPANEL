/**
 * Upload médias campagne vers Supabase Storage (bucket campaign-media).
 * Utilisé sur /campaigns/new pour image, vidéo, comparaison A/B.
 */

import { supabase } from "@/src/lib/supabase";

export const BUCKET_CAMPAIGN_MEDIA = "campaign-media";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 Mo
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024; // 25 Mo
export const MAX_VIDEO_DURATION_SEC = 30;

export function validateImageFile(file: File): { ok: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { ok: false, error: "Format non autorisé. Utilisez JPEG, PNG, WebP ou GIF." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: `Taille max : ${MAX_IMAGE_BYTES / 1024 / 1024} Mo.` };
  }
  return { ok: true };
}

export function validateVideoFile(file: File): { ok: boolean; error?: string } {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return { ok: false, error: "Format non autorisé. Utilisez MP4 ou WebM." };
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return { ok: false, error: `Taille max : ${MAX_VIDEO_BYTES / 1024 / 1024} Mo.` };
  }
  return { ok: true };
}

export function validateMediaFile(
  file: File,
  kind: "image" | "video"
): { ok: boolean; error?: string } {
  return kind === "image" ? validateImageFile(file) : validateVideoFile(file);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

/**
 * Upload un fichier dans le bucket campaign-media.
 * Chemin : {orgId}/{uuid}_{nom}.
 * Retourne l’URL publique ou une erreur.
 */
export async function uploadCampaignMedia(
  orgId: string,
  file: File
): Promise<{ url: string; path: string } | { error: string }> {
  const safeName = sanitizeFileName(file.name);
  const path = `${orgId}/${crypto.randomUUID()}_${safeName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_CAMPAIGN_MEDIA)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return { error: error.message };
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_CAMPAIGN_MEDIA)
    .getPublicUrl(data.path);

  return { url: urlData.publicUrl, path: data.path };
}
