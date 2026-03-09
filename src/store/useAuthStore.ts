import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

import type { ActionFeedback } from '@/types/game';
import { authService } from '@/services/authService';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  recoverSession: () => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<ActionFeedback>;
  signUp: (email: string, password: string, username: string) => Promise<ActionFeedback>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

let unsubscribe: (() => void) | null = null;

function normalizeAuthError(error: unknown): string {
  const defaultMessage = 'Nao foi possivel autenticar. Tente novamente.';

  if (!error || typeof error !== 'object' || !('message' in error)) {
    return defaultMessage;
  }

  const message = String(error.message);

  if (message.toLowerCase().includes('invalid login')) {
    return 'Email ou senha invalidos.';
  }

  if (message.toLowerCase().includes('already registered')) {
    return 'Este email ja esta cadastrado. Tente fazer login.';
  }

  return message || defaultMessage;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    if (get().isInitialized) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const session = await authService.getSession();

      set({
        session,
        user: session?.user ?? null,
        isLoading: false,
        isInitialized: true,
      });

      if (!unsubscribe) {
        unsubscribe = authService.onAuthStateChange((event, nextSession) => {
          if (nextSession) {
            set({
              session: nextSession,
              user: nextSession.user,
            });
            return;
          }

          if (event === 'SIGNED_OUT') {
            set({
              session: null,
              user: null,
            });
            return;
          }

          void get().recoverSession();
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        isInitialized: true,
        error: normalizeAuthError(error),
      });
    }
  },

  recoverSession: async () => {
    try {
      const session = await authService.getSession();

      set({
        session,
        user: session?.user ?? null,
      });

      return Boolean(session);
    } catch (error) {
      set({
        error: normalizeAuthError(error),
      });

      return false;
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      await authService.signInWithEmail(email, password);
      set({ isLoading: false });

      return {
        ok: true,
        message: 'Login realizado com sucesso.',
      };
    } catch (error) {
      const message = normalizeAuthError(error);
      set({ isLoading: false, error: message });

      return {
        ok: false,
        message,
      };
    }
  },

  signUp: async (email: string, password: string, username: string) => {
    set({ isLoading: true, error: null });

    try {
      await authService.signUpWithEmail(email, password, username);
      set({ isLoading: false });

      return {
        ok: true,
        message: 'Conta criada. Verifique seu email se a confirmacao estiver ativa no Supabase.',
      };
    } catch (error) {
      const message = normalizeAuthError(error);
      set({ isLoading: false, error: message });

      return {
        ok: false,
        message,
      };
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });

    try {
      await authService.signOut();
      set({
        session: null,
        user: null,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: normalizeAuthError(error),
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
