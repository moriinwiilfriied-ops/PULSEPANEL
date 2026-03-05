/**
 * Store global (Zustand) — onboarding + wallet + history
 * Compatible Expo Go, pas de dépendances natives.
 */

import { create } from 'zustand';
import type { HistoryEntry } from '@/lib/mockData';

interface OnboardingState {
  age: number | null;
  region: string | null;
  tags: string[];
  completed: boolean;
}

interface WalletState {
  pending: number;
  available: number;
  history: HistoryEntry[];
}

interface AppState extends OnboardingState, WalletState {
  setOnboarding: (age: number | null, region: string | null, tags: string[]) => void;
  completeOnboarding: () => void;
  addHistoryEntry: (entry: HistoryEntry) => void;
  addPendingReward: (amount: number) => void;
  /** Simuler validation : transfère `amount` de pending vers available */
  simulateValidation: (amount: number) => void;
  /** DEV: transfère tout le pending vers available */
  validateAllPending: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  age: null,
  region: null,
  tags: [],
  completed: false,

  pending: 0,
  available: 0,
  history: [],

  setOnboarding: (age, region, tags) =>
    set({ age, region, tags }),

  completeOnboarding: () =>
    set({ completed: true }),

  addHistoryEntry: (entry) =>
    set((s) => ({ history: [entry, ...s.history] })),

  addPendingReward: (amount) =>
    set((s) => ({ pending: s.pending + amount })),

  simulateValidation: (amount) =>
    set((s) => {
      const transfer = Math.min(amount, s.pending);
      let remaining = transfer;
      const newHistory = s.history.map((h) => {
        if (h.status === 'pending' && remaining >= h.reward) {
          remaining -= h.reward;
          return { ...h, status: 'available' as const };
        }
        return h;
      });
      return {
        pending: s.pending - transfer,
        available: s.available + transfer,
        history: newHistory,
      };
    }),

  validateAllPending: () =>
    set((s) => ({
      pending: 0,
      available: s.available + s.pending,
      history: s.history.map((h) => ({ ...h, status: 'available' as const })),
    })),
}));

export function getAppStore() {
  return useAppStore.getState();
}
