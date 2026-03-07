/**
 * Templates campagne — création rapide (A/B, Price test, Slogan, Concept, NPS)
 */

export type CampaignTemplatePreset = {
  key: string;
  name: string;
  description: string;
  defaultQuestion: string;
  defaultOptions: string[];
  defaultQuota: number;
  defaultRewardCents: number;
  responseType: "choice" | "yesno" | "text" | "nps";
  tips: string[];
};

export const CAMPAIGN_TEMPLATES: CampaignTemplatePreset[] = [
  {
    key: "ab_packaging",
    name: "A/B Test",
    description: "Packaging ou visuel pub : 2 options",
    defaultQuestion: "Quel visuel préférez-vous ?",
    defaultOptions: ["Visuel A", "Visuel B"],
    defaultQuota: 100,
    defaultRewardCents: 20,
    responseType: "choice",
    tips: [
      "Utilisez des visuels bien différenciés pour un choix clair.",
      "Quota 100–200 suffit pour un premier signal.",
    ],
  },
  {
    key: "price_test",
    name: "Price Test",
    description: "À quel prix achèteriez-vous ce produit ?",
    defaultQuestion: "À quel prix achèteriez-vous ce produit ?",
    defaultOptions: ["4,99 €", "7,99 €", "9,99 €", "12,99 €", "14,99 €"],
    defaultQuota: 100,
    defaultRewardCents: 25,
    responseType: "choice",
    tips: [
      "Proposez 3 à 5 paliers de prix réalistes.",
      "Analysez la courbe de consentement à payer.",
    ],
  },
  {
    key: "slogan",
    name: "Slogan Test",
    description: "Quel slogan vous marque le plus ?",
    defaultQuestion: "Quel slogan vous marque le plus ?",
    defaultOptions: ["Slogan A", "Slogan B", "Slogan C"],
    defaultQuota: 100,
    defaultRewardCents: 20,
    responseType: "choice",
    tips: [
      "Gardez des slogans courts et distincts.",
      "Idéal pour valider une direction créative.",
    ],
  },
  {
    key: "concept",
    name: "Concept Test",
    description: "Quel concept vous donne le plus envie ?",
    defaultQuestion: "Quel concept vous donne le plus envie ?",
    defaultOptions: ["Concept A", "Concept B"],
    defaultQuota: 100,
    defaultRewardCents: 20,
    responseType: "choice",
    tips: [
      "Décrivez brièvement chaque concept en amont.",
      "2 concepts permettent un choix net.",
    ],
  },
  {
    key: "nps",
    name: "NPS rapide",
    description: "Note 0–10 + pourquoi",
    defaultQuestion: "Sur une échelle de 0 à 10, recommanderiez-vous ce produit à un proche ?",
    defaultOptions: [],
    defaultQuota: 100,
    defaultRewardCents: 15,
    responseType: "nps",
    tips: [
      "Le NPS est noté de 0 à 10 ; vous pouvez ajouter une question ouverte « Pourquoi ? ».",
      "Récompense légère car réponse rapide.",
    ],
  },
];

export function getTemplateByKey(key: string): CampaignTemplatePreset | undefined {
  return CAMPAIGN_TEMPLATES.find((t) => t.key === key);
}

/** Legacy template string pour le champ `template` (compat Supabase). */
export function templateKeyToLegacyTemplate(key: string): string {
  const map: Record<string, string> = {
    ab_packaging: "A/B",
    price_test: "Price test",
    slogan: "Slogan",
    concept: "Concept",
    nps: "NPS",
  };
  return map[key] ?? "A/B";
}
