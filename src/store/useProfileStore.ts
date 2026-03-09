import { create } from 'zustand';

import type { ActionFeedback } from '@/types/game';
import type { ProfileRow } from '@/types/supabase';
import { getMyProfile, hasCompleteUsername, setMyUsername, validateUsername } from '@/services/profileService';

interface ProfileStore {
  profile: ProfileRow | null;
  isLoading: boolean;
  loadedUserId: string | null;
  error: string | null;
  ensureLoaded: (userId: string, force?: boolean) => Promise<void>;
  saveUsername: (userId: string, username: string) => Promise<ActionFeedback>;
  clear: () => void;
}

function toErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  return 'Falha ao carregar perfil.';
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: null,
  isLoading: false,
  loadedUserId: null,
  error: null,

  ensureLoaded: async (userId, force = false) => {
    if (!force && get().loadedUserId === userId && get().profile) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const profile = await getMyProfile(userId);

      set({
        profile,
        isLoading: false,
        loadedUserId: userId,
      });
    } catch (error) {
      set({
        profile: null,
        isLoading: false,
        loadedUserId: userId,
        error: toErrorMessage(error),
      });
    }
  },

  saveUsername: async (userId, username) => {
    const validationError = validateUsername(username);
    if (validationError) {
      return {
        ok: false,
        message: validationError,
      };
    }

    try {
      const profile = await setMyUsername(userId, username);

      set({
        profile,
        loadedUserId: userId,
        error: null,
      });

      return {
        ok: true,
        message: hasCompleteUsername(profile.username)
          ? 'Nome salvo com sucesso.'
          : 'Nome salvo, mas ainda invalido.',
      };
    } catch (error) {
      return {
        ok: false,
        message: toErrorMessage(error),
      };
    }
  },

  clear: () => {
    set({
      profile: null,
      isLoading: false,
      loadedUserId: null,
      error: null,
    });
  },
}));
