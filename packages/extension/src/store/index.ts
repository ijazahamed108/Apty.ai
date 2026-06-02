import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole, Walkthrough, WalkthroughStep } from '@mini-apty/shared';

type AuthState = {
  token: string | null;
  user: { id: string; email: string; role: UserRole } | null;
  setAuth: (token: string, user: { id: string; email: string; role: UserRole }) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'mini-apty-auth' }
  )
);

type AuthorState = {
  isRecording: boolean;
  steps: WalkthroughStep[];
  setRecording: (value: boolean) => void;
  addStep: (step: WalkthroughStep) => void;
  updateStep: (id: string, patch: Partial<WalkthroughStep>) => void;
  removeStep: (id: string) => void;
  clear: () => void;
};

export const useAuthorStore = create<AuthorState>((set) => ({
  isRecording: false,
  steps: [],
  setRecording: (value) => set({ isRecording: value }),
  addStep: (step) => set((s) => ({ steps: [...s.steps, step] })),
  updateStep: (id, patch) =>
    set((s) => ({
      steps: s.steps.map((step) => (step.id === id ? { ...step, ...patch } : step)),
    })),
  removeStep: (id) => set((s) => ({ steps: s.steps.filter((step) => step.id !== id) })),
  clear: () => set({ steps: [], isRecording: false }),
}));

type CacheState = {
  walkthroughs: Record<string, Walkthrough>;
  setWalkthrough: (wt: Walkthrough) => void;
  getWalkthrough: (id: string) => Walkthrough | undefined;
};

export const useCacheStore = create<CacheState>((set, get) => ({
  walkthroughs: {},
  setWalkthrough: (wt) =>
    set((s) => ({ walkthroughs: { ...s.walkthroughs, [wt.id]: wt } })),
  getWalkthrough: (id) => get().walkthroughs[id],
}));
