/**
 * Types campagnes & réponses — Dashboard PulsePanel
 * + calcPricePerResponse (utilisé par supabaseCampaigns).
 * Anciennes données mock en mémoire retirées : le dashboard utilise Supabase.
 */

export type CampaignTemplate = 'A/B' | 'Price test' | 'Slogan' | 'Concept' | 'NPS';

export interface CampaignTargeting {
  ageMin: number;
  ageMax: number;
  regions: string[];
  tags: string[];
}

/** Type de créatif pour campagnes media-first (défaut: text). */
export type CreativeType = "text" | "image" | "video" | "comparison";

/** Un asset média lié à une campagne (URL externe ou Supabase Storage). */
export interface CampaignMediaAsset {
  type: "image" | "video";
  role: "primary" | "comparison_a" | "comparison_b";
  url: string;
}

export interface Campaign {
  id: string;
  name: string;
  template: CampaignTemplate;
  templateKey?: string;
  templateVersion?: number;
  question: string;
  options: string[];
  targeting: CampaignTargeting;
  quota: number;
  rewardUser: number;
  pricePerResponse: number;
  total: number;
  createdAt: string; // ISO
  status: "active" | "paused" | "completed";
  /** Pour la liste (depuis DB responses_count). */
  responsesCount?: number;
  /** Campagne dédiée au test (swipe, etc.), pas de débit org. */
  isTest?: boolean;
  /** Format de créa (media-first). Défaut text = comportement actuel. */
  creativeType?: CreativeType;
  /** Médias attachés (image/vidéo, primary ou A/B). */
  mediaAssets?: CampaignMediaAsset[];
}

export interface CampaignResponse {
  id: string;
  campaignId: string;
  questionId: string;
  answer: string;
  reward: number;
  trustLevel: number; // 0-100
  at: string; // ISO
}

/** Formule prix par réponse (alignée avec la DB). Utilisée par supabaseCampaigns. */
export function calcPricePerResponse(rewardUser: number): number {
  return Math.round((rewardUser * 1.7 + 0.35) * 100) / 100;
}
