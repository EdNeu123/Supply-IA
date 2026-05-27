import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AuthState {
  user: User | null; token: string | null; isLoading: boolean;
  setAuth: (user: User | null, token: string | null) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, token: null, isLoading: true,
  setAuth: (user, token) => set({ user, token, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
