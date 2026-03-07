/**
 * Données mock centralisées — Dashboard PulsePanel
 * Aucun appel réseau. Campagnes et réponses en mémoire.
 */

export type CampaignTemplate = 'A/B' | 'Price test' | 'Slogan';

export interface CampaignTargeting {
  ageMin: number;
  ageMax: number;
  regions: string[];
  tags: string[];
}

export interface Campaign {
  id: string;
  name: string;
  template: CampaignTemplate;
  question: string;
  options: string[];
  targeting: CampaignTargeting;
  quota: number;
  rewardUser: number;
  pricePerResponse: number;
  total: number;
  createdAt: string; // ISO
  status: 'active' | 'paused' | 'completed';
  /** Pour la liste (depuis DB responses_count). */
  responsesCount?: number;
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

const campaigns: Campaign[] = [
  {
    id: 'c1',
    name: 'Test prix produit X',
    template: 'Price test',
    question: 'Quel prix seriez-vous prêt à payer pour ce produit ?',
    options: ['Moins de 10€', '10–20€', '20–50€', 'Plus de 50€'],
    targeting: { ageMin: 18, ageMax: 65, regions: ['Île-de-France'], tags: ['Tech'] },
    quota: 200,
    rewardUser: 0.25,
    pricePerResponse: 0.78,
    total: 156,
    createdAt: '2025-02-01T10:00:00Z',
    status: 'active',
  },
  {
    id: 'c2',
    name: 'Slogan marque',
    template: 'Slogan',
    question: 'Préférez-vous le slogan A ou B ?',
    options: ['Slogan A', 'Slogan B'],
    targeting: { ageMin: 25, ageMax: 45, regions: [], tags: ['Mode', 'Culture'] },
    quota: 100,
    rewardUser: 0.15,
    pricePerResponse: 0.61,
    total: 61,
    createdAt: '2025-02-10T14:00:00Z',
    status: 'active',
  },
];

const responsesByCampaign: Record<string, CampaignResponse[]> = {
  c1: [
    { id: 'r1', campaignId: 'c1', questionId: 'q1', answer: '10–20€', reward: 0.25, trustLevel: 72, at: '2025-02-15T09:00:00Z' },
    { id: 'r2', campaignId: 'c1', questionId: 'q1', answer: '20–50€', reward: 0.25, trustLevel: 85, at: '2025-02-15T10:30:00Z' },
    { id: 'r3', campaignId: 'c1', questionId: 'q1', answer: 'Moins de 10€', reward: 0.25, trustLevel: 60, at: '2025-02-15T11:00:00Z' },
  ],
  c2: [
    { id: 'r4', campaignId: 'c2', questionId: 'q2', answer: 'Slogan A', reward: 0.15, trustLevel: 90, at: '2025-02-12T08:00:00Z' },
    { id: 'r5', campaignId: 'c2', questionId: 'q2', answer: 'Slogan B', reward: 0.15, trustLevel: 78, at: '2025-02-12T09:00:00Z' },
  ],
};

/** Prix mock: pricePerResponse = rewardUser * 1.7 + 0.35 */
export function calcPricePerResponse(rewardUser: number): number {
  return Math.round((rewardUser * 1.7 + 0.35) * 100) / 100;
}

export function getCampaigns(): Campaign[] {
  return [...campaigns];
}

export function getCampaign(id: string): Campaign | undefined {
  return campaigns.find((c) => c.id === id);
}

export function getResponses(campaignId: string): CampaignResponse[] {
  return [...(responsesByCampaign[campaignId] ?? [])];
}

export function addCampaign(c: Omit<Campaign, 'id' | 'createdAt' | 'pricePerResponse' | 'total' | 'status'>): Campaign {
  const pricePerResponse = calcPricePerResponse(c.rewardUser);
  const total = Math.round(c.quota * pricePerResponse * 100) / 100;
  const campaign: Campaign = {
    ...c,
    id: `c-${Date.now()}`,
    createdAt: new Date().toISOString(),
    pricePerResponse,
    total,
    status: 'active',
  };
  campaigns.push(campaign);
  responsesByCampaign[campaign.id] = [];
  return campaign;
}

/** Stats mock pour une campagne */
export function getCampaignStats(campaignId: string) {
  const campaign = getCampaign(campaignId);
  const responses = getResponses(campaignId);
  if (!campaign) return null;
  const responsesCount = responses.length;
  const distribution: Record<string, number> = {};
  responses.forEach((r) => {
    distribution[r.answer] = (distribution[r.answer] ?? 0) + 1;
  });
  const trustAvg = responses.length
    ? responses.reduce((s, r) => s + r.trustLevel, 0) / responses.length
    : 0;
  const qualityBadge = trustAvg >= 80 ? 'Haute' : trustAvg >= 60 ? 'Moyenne' : 'À améliorer';
  return {
    campaign,
    responsesCount,
    quota: campaign.quota,
    distribution,
    trustAvg: Math.round(trustAvg * 10) / 10,
    qualityBadge,
    verbatims: responses,
  };
}
