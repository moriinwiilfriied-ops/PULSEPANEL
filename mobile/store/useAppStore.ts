/**
 * Store global (Zustand) — onboarding + wallet + history
 * Compatible Expo Go, pas de dépendances natives.
 * Si Supabase configuré, serverWallet est la source de vérité (balances + historique).
 */

import { create } from 'zustand';
import type { HistoryEntry } from '@/lib/mockData';
import type { ServerWalletHistoryEntry } from '@/lib/supabaseApi';

export interface ServerWalletData {
  pendingCents: number;
  availableCents: number;
  history: ServerWalletHistoryEntry[];
  /** false si aucune ligne user_balances (afficher message "répondez à une question SB"). */
  hasBalanceRow?: boolean;
}

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
  /** Quand non null, wallet affiche ces données (Supabase) au lieu de pending/available/history */
  serverWallet: ServerWalletData | null;
}

interface AppState extends OnboardingState, WalletState {
  setOnboarding: (age: number | null, region: string | null, tags: string[]) => void;
  completeOnboarding: () => void;
  /** Remet l'état app à zéro (signOut). À appeler après signOut + ensureAnonSession, avant redirection onboarding. */
  resetForSignOut: () => void;
  addHistoryEntry: (entry: HistoryEntry) => void;
  addPendingReward: (amount: number) => void;
  setServerWallet: (data: ServerWalletData | null) => void;
  /** Simuler validation : transfère `amount` de pending vers available */
  simulateValidation: (amount: number) => void;
  /** DEV: transfère tout le pending vers available */
  validateAllPending: () => void;
  /** Sans backend : remet pending/available/history à zéro pour ne pas afficher d'anciennes données mock. */
  clearLocalWalletForNoBackend: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  age: null,
  region: null,
  tags: [],
  completed: false,

  pending: 0,
  available: 0,
  history: [],
  serverWallet: null,

  setServerWallet: (data) => set({ serverWallet: data }),

  setOnboarding: (age, region, tags) =>
    set({ age, region, tags }),

  completeOnboarding: () =>
    set({ completed: true }),

  resetForSignOut: () =>
    set({
      completed: false,
      age: null,
      region: null,
      tags: [],
      serverWallet: null,
      pending: 0,
      available: 0,
      history: [],
    }),

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

  clearLocalWalletForNoBackend: () =>
    set({ pending: 0, available: 0, history: [] }),
}));

export function getAppStore() {
  return useAppStore.getState();
}
