/**
 * Vue qualité campagne enrichie + fondation insights batch.
 * 100 % déterministe, pas d'IA. Heuristiques documentées.
 * Réutilise quality stats, deep (RPC get_campaign_quality_deep), stats campagne.
 */

import { supabase } from "@/src/lib/supabase";

export interface CampaignQualityDeep {
  avg_duration_ms: number | null;
  responses_with_duration: number;
  flags_count: number;
}

export interface CampaignQualityInsightsInput {
  total_responses: number;
  valid_responses: number;
  invalid_responses: number;
  pct_valid: number;
  pct_too_fast: number;
  pct_empty: number;
  /** Depuis get_campaign_quality_deep */
  avg_duration_ms?: number | null;
  flags_count?: number;
  distribution: Record<string, number>;
  trustAvg: number;
  responsesCount: number;
  quota: number;
  timeToQuotaSeconds?: number | null;
  status: string;
}

export type QualitySignal = "bon" | "à_surveiller" | "faible";

export interface CampaignQualityInsights {
  /** Signal global documenté (règles ci-dessous). */
  qualitySignal: QualitySignal;
  /** Observations déterministes, 100 % basées sur les données. */
  observations: string[];
  /** Top choix (tri par count desc). */
  topChoices: { choice: string; count: number; pct: number }[];
  /** Part de réponses suspectes (invalid + flags rapportés aux total). */
  suspectRatio: number;
  /** Temps moyen réponse en secondes (null si non dispo). */
  meanDurationSec: number | null;
  /** Nombre de flags sur la campagne. */
  flagsCount: number;
  /** Taux de réponses flaggées (flags_count / total_responses). */
  flaggedRatio: number;
}

/**
 * Règles heuristiques pour le signal qualité (documentées, pas opaques) :
 * - bon : pct_valid >= 75 et pct_too_fast <= 15 et (flags_count/total) <= 0.1
 * - faible : pct_valid < 60 ou pct_too_fast >= 30 ou (flags_count/total) >= 0.2
 * - à_surveiller : sinon
 */
function computeQualitySignal(
  pct_valid: number,
  pct_too_fast: number,
  total: number,
  flags_count: number
): QualitySignal {
  const flaggedRatio = total > 0 ? flags_count / total : 0;
  if (pct_valid >= 75 && pct_too_fast <= 15 && flaggedRatio <= 0.1) return "bon";
  if (pct_valid < 60 || pct_too_fast >= 30 || flaggedRatio >= 0.2) return "faible";
  return "à_surveiller";
}

/**
 * Construit les insights à partir des données déjà chargées. Pas d'appel réseau.
 */
export function buildCampaignQualityInsights(
  input: CampaignQualityInsightsInput
): CampaignQualityInsights {
  const total = input.total_responses || input.responsesCount || 0;
  const flagsCount = input.flags_count ?? 0;
  const flaggedRatio = total > 0 ? flagsCount / total : 0;
  const suspectRatio =
    total > 0
      ? (input.invalid_responses + flagsCount) / total
      : 0; // borne sup simple
  const meanDurationSec =
    input.avg_duration_ms != null && input.avg_duration_ms > 0
      ? Math.round(input.avg_duration_ms / 1000)
      : null;

  const qualitySignal = computeQualitySignal(
    input.pct_valid,
    input.pct_too_fast,
    total,
    flagsCount
  );

  const topChoices = Object.entries(input.distribution)
    .map(([choice, count]) => ({
      choice,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const observations: string[] = [];
  if (input.timeToQuotaSeconds != null && input.timeToQuotaSeconds > 0 && input.quota > 0) {
    if (input.timeToQuotaSeconds < 3600) {
      observations.push("La campagne s'est remplie rapidement (moins d'une heure).");
    } else if (input.timeToQuotaSeconds < 86400) {
      observations.push("La campagne s'est remplie en moins d'un jour.");
    } else {
      observations.push("La campagne a pris plus d'un jour pour atteindre le quota.");
    }
  }
  if (input.pct_too_fast >= 20) {
    observations.push("Le taux de réponses trop rapides est élevé — à surveiller.");
  } else if (input.pct_too_fast <= 10 && total > 0) {
    observations.push("Peu de réponses trop rapides — qualité de collecte correcte.");
  }
  if (input.pct_valid >= 80) {
    observations.push("La qualité semble stable (taux de réponses valides élevé).");
  } else if (input.pct_valid < 65 && total > 0) {
    observations.push("Le taux de réponses valides est bas — vérifier la source des répondants.");
  }
  if (flagsCount > 0 && total > 0) {
    const pctFlagged = Math.round(flaggedRatio * 100);
    if (pctFlagged >= 15) {
      observations.push(`${flagsCount} réponse(s) flaggée(s) (${pctFlagged} %) — revue recommandée.`);
    } else {
      observations.push(`${flagsCount} réponse(s) flaggée(s) — à traiter en admin si besoin.`);
    }
  }
  if (meanDurationSec != null && meanDurationSec < 3 && input.pct_too_fast > 15) {
    observations.push("Temps de réponse moyen très court — risque de clics non réfléchis.");
  }
  if (observations.length === 0 && total > 0) {
    observations.push("Données qualité disponibles ; pas d'anomalie détectée.");
  }

  return {
    qualitySignal,
    observations,
    topChoices,
    suspectRatio,
    meanDurationSec,
    flagsCount,
    flaggedRatio,
  };
}

/**
 * Appel RPC get_campaign_quality_deep. À utiliser en complément de getCampaignQualityStats.
 */
export async function fetchCampaignQualityDeep(
  campaignId: string
): Promise<CampaignQualityDeep | null> {
  const { data, error } = await supabase.rpc("get_campaign_quality_deep", {
    _campaign_id: campaignId,
  });
  if (error || data == null) return null;
  const o = data as Record<string, unknown>;
  return {
    avg_duration_ms:
      typeof o.avg_duration_ms === "number" ? o.avg_duration_ms : null,
    responses_with_duration: Number(o.responses_with_duration ?? 0),
    flags_count: Number(o.flags_count ?? 0),
  };
}
