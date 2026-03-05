/**
 * Données mock centralisées — Mobile PulsePanel
 * Aucun appel réseau. submitAnswer met à jour le store.
 */

import { getAppStore } from '@/store/useAppStore';

export type QuestionType = 'poll' | 'choice' | 'text';

export interface MockQuestion {
  id: string;
  question: string;
  type: QuestionType;
  options?: string[];
  reward: number;
  etaSeconds: number;
  imagePlaceholder?: string;
  campaignId?: string;
}

export interface HistoryEntry {
  id: string;
  questionId: string;
  questionTitle: string;
  answer: string;
  reward: number;
  status: 'pending' | 'available';
  at: string; // ISO
}

export const mockQuestions: MockQuestion[] = [
  {
    id: 'q1',
    question: 'Quel prix seriez-vous prêt à payer pour ce produit ?',
    type: 'choice',
    options: ['Moins de 10€', '10–20€', '20–50€', 'Plus de 50€'],
    reward: 0.25,
    etaSeconds: 45,
    imagePlaceholder: 'Price test',
    campaignId: 'c1',
  },
  {
    id: 'q2',
    question: "Préférez-vous le slogan A ou B pour notre nouvelle marque ?",
    type: 'choice',
    options: ['Slogan A : "Simple et clair"', 'Slogan B : "Innovant et proche"'],
    reward: 0.15,
    etaSeconds: 30,
    campaignId: 'c2',
  },
  {
    id: 'q3',
    question: "Avez-vous déjà acheté un produit similaire dans les 6 derniers mois ?",
    type: 'choice',
    options: ['Oui', 'Non'],
    reward: 0.1,
    etaSeconds: 15,
    campaignId: 'c1',
  },
  {
    id: 'q4',
    question: "En une phrase, comment décririez-vous votre expérience d'achat ?",
    type: 'text',
    reward: 0.35,
    etaSeconds: 60,
    campaignId: 'c3',
  },
  {
    id: 'q5',
    question: 'Quelle option vous attire le plus ?',
    type: 'poll',
    options: ['Option 1', 'Option 2', 'Option 3', 'Option 4', 'Option 5'],
    reward: 0.2,
    etaSeconds: 40,
    imagePlaceholder: 'A/B test',
    campaignId: 'c2',
  },
];

/**
 * Soumet une réponse : ajoute à l'historique et crédite le reward en "pending".
 * Met à jour le store (wallet + history).
 */
export function submitAnswer(questionId: string, answer: string): HistoryEntry {
  const question = mockQuestions.find((q) => q.id === questionId);
  if (!question) {
    throw new Error(`Question ${questionId} not found`);
  }
  const entry: HistoryEntry = {
    id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    questionId,
    questionTitle: question.question,
    answer,
    reward: question.reward,
    status: 'pending',
    at: new Date().toISOString(),
  };
  getAppStore().addHistoryEntry(entry);
  getAppStore().addPendingReward(question.reward);
  return entry;
}

/**
 * Questions encore "disponibles" pour le feed (non répondues par l'utilisateur).
 */
export function getAvailableQuestions(): MockQuestion[] {
  const answeredIds = getAppStore().getState().history.map((h) => h.questionId);
  return mockQuestions.filter((q) => !answeredIds.includes(q.id));
}
