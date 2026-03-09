/**
 * Proof pack campagne — résumé exploitable pour preuve commerciale / mini case study.
 * Construit à partir des données déjà chargées sur la page détail (stats, quality, timeToQuota).
 * Pas de logique dupliquée : réutilise les KPI existants.
 */

import { formatTimeToQuota } from "./pilotKpis";

export interface CampaignProofInput {
  campaignName: string;
  question: string;
  campaignCreatedAt: string;
  status: string;
  quota: number;
  responsesCount: number;
  costTotalCents?: number;
  qualityPctValid?: number;
  qualityPctTooFast?: number;
  qualityPctEmpty?: number;
  timeToQuotaSeconds?: number;
  quotaReached?: boolean;
}

export interface CampaignProofPack {
  campaignName: string;
  question: string;
  date: string;
  status: string;
  quota: number;
  responsesObtained: number;
  timeToQuotaFormatted: string | null;
  costPerResponseEur: number | null;
  qualityPctValid: number | null;
  headlineNumber: string;
  summaryShort: string;
  noteForCitation: string;
  /** true si quota atteint + qualité correcte + temps dispo → bonne preuve potentielle */
  goodProofCandidate: boolean;
}

/**
 * Construit le proof pack à partir des données déjà disponibles sur la page détail.
 * Ne fait aucun appel réseau.
 */
export function buildCampaignProofPack(input: CampaignProofInput): CampaignProofPack {
  const dateLabel = input.campaignCreatedAt
    ? new Date(input.campaignCreatedAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  const timeToQuotaFormatted =
    input.quotaReached && input.timeToQuotaSeconds != null
      ? formatTimeToQuota(input.timeToQuotaSeconds)
      : null;

  const costPerResponseEur =
    input.costTotalCents != null &&
    input.responsesCount > 0
      ? (input.costTotalCents / 100) / input.responsesCount
      : null;

  const pctValid = input.qualityPctValid ?? null;

  const headlineNumber = buildHeadlineNumber({
    responsesCount: input.responsesCount,
    quota: input.quota,
    timeToQuotaFormatted,
    pctValid,
    costPerResponseEur,
  });

  const summaryShort = buildSummaryShort({
    responsesCount: input.responsesCount,
    quota: input.quota,
    timeToQuotaFormatted,
    pctValid,
    costPerResponseEur,
  });

  const goodProofCandidate =
    input.status === "completed" &&
    input.responsesCount >= input.quota &&
    input.quota > 0 &&
    (pctValid == null || pctValid >= 70) &&
    (timeToQuotaFormatted != null || pctValid != null);

  return {
    campaignName: input.campaignName,
    question: input.question,
    date: dateLabel,
    status: input.status,
    quota: input.quota,
    responsesObtained: input.responsesCount,
    timeToQuotaFormatted,
    costPerResponseEur,
    qualityPctValid: pctValid,
    headlineNumber,
    summaryShort,
    noteForCitation:
      "Citation client, logo et intro à compléter manuellement après accord du client.",
    goodProofCandidate,
  };
}

function buildHeadlineNumber(params: {
  responsesCount: number;
  quota: number;
  timeToQuotaFormatted: string | null;
  pctValid: number | null;
  costPerResponseEur: number | null;
}): string {
  const { responsesCount, quota, timeToQuotaFormatted, pctValid, costPerResponseEur } = params;
  if (responsesCount >= quota && timeToQuotaFormatted) {
    return `${quota} réponses en ${timeToQuotaFormatted}`;
  }
  if (responsesCount > 0 && pctValid != null && pctValid >= 80) {
    return `${Math.round(pctValid)} % de réponses valides`;
  }
  if (responsesCount > 0 && costPerResponseEur != null) {
    return `Coût réel : ${costPerResponseEur.toFixed(2)} € / réponse`;
  }
  if (responsesCount >= quota) {
    return `${responsesCount} réponses obtenues (quota atteint)`;
  }
  return `${responsesCount} réponses`;
}

function buildSummaryShort(params: {
  responsesCount: number;
  quota: number;
  timeToQuotaFormatted: string | null;
  pctValid: number | null;
  costPerResponseEur: number | null;
}): string {
  const parts: string[] = [];
  parts.push(`Volume : ${params.responsesCount} réponses (quota ${params.quota}).`);
  if (params.timeToQuotaFormatted) {
    parts.push(`Rapidité : quota atteint en ${params.timeToQuotaFormatted}.`);
  }
  if (params.pctValid != null) {
    parts.push(`Qualité : ${Math.round(params.pctValid)} % de réponses valides.`);
  }
  if (params.costPerResponseEur != null) {
    parts.push(`Coût réel : ${params.costPerResponseEur.toFixed(2)} € / réponse.`);
  }
  return parts.join(" ");
}

/**
 * Génère le résumé au format Markdown pour copie / export.
 */
export function proofPackToMarkdown(pack: CampaignProofPack): string {
  const lines: string[] = [
    "# Résumé preuve — " + pack.campaignName,
    "",
    "## Campagne",
    "- **Question** : " + pack.question,
    "- **Date** : " + pack.date,
    "- **Statut** : " + pack.status,
    "",
    "## Résultat",
    "- **Volume** : " + pack.responsesObtained + " / " + pack.quota + " réponses",
  ];
  if (pack.timeToQuotaFormatted) {
    lines.push("- **Temps pour quota** : " + pack.timeToQuotaFormatted);
  }
  if (pack.qualityPctValid != null) {
    lines.push("- **Qualité** : " + Math.round(pack.qualityPctValid) + " % valides");
  }
  if (pack.costPerResponseEur != null) {
    lines.push("- **Coût réel / réponse** : " + pack.costPerResponseEur.toFixed(2) + " €");
  }
  lines.push("", "## Chiffre fort", "", pack.headlineNumber, "", "## Résumé", "", pack.summaryShort);
  lines.push("", "---", "", "*" + pack.noteForCitation + "*");
  return lines.join("\n");
}
