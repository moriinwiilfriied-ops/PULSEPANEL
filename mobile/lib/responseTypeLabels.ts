/**
 * Libellés de type de réponse — cohérence sémantique feed / answer.
 * S'appuie sur template + type + options pour afficher le bon libellé
 * (ex. Price test → "Test prix", A/B → "Choix A/B", pas "Choix binaire" partout).
 */

import type { MockQuestion } from '@/lib/mockData';

export function getResponseTypeLabel(q: {
  type: string;
  template?: string | null;
  options?: string[] | null;
}): string {
  const optCount = Array.isArray(q.options) ? q.options.length : 0;

  if (q.type === 'text') return 'Réponse courte';

  if (q.template === 'A/B') return 'Choix A/B';
  if (q.template === 'Price test') return 'Test prix';
  if (q.template === 'Slogan') {
    if (optCount > 2) return 'Choix multiple';
    return 'Choix binaire';
  }
  if (q.template === 'NPS') return 'Note 0–10';

  if (q.type === 'poll') {
    if (optCount <= 2) return 'Question rapide';
    return 'Choix multiple';
  }

  if (q.type === 'choice') {
    if (optCount === 2) return 'Choix binaire';
    if (optCount > 2) return 'Choix multiple';
  }

  return 'Question rapide';
}
