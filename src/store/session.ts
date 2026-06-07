import { create } from 'zustand';
import type { Employee } from '../lib/types';
import { getSession, signOut as authSignOut } from '../lib/auth';

interface SessionState {
  employee: Employee | null;
  hydrate: () => void;
  setEmployee: (e: Employee) => void;
  logout: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  employee: getSession()?.employee ?? null,
  hydrate: () => set({ employee: getSession()?.employee ?? null }),
  setEmployee: (e) => set({ employee: e }),
  logout: async () => {
    await authSignOut();
    set({ employee: null });
  },
}));
