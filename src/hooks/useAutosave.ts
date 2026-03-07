import { useEffect } from 'react';

import { useAuthStore } from '@/store/useAuthStore';
import { useGameStore } from '@/store/useGameStore';

const AUTOSAVE_INTERVAL_MS = 15_000;

export function useAutosave() {
  const user = useAuthStore((state) => state.user);
  const saveForUser = useGameStore((state) => state.saveForUser);
  const autosaveEnabled = useGameStore((state) => state.progress.settings.autosaveEnabled);
  const isLoaded = useGameStore((state) => state.isLoaded);

  useEffect(() => {
    if (!user || !autosaveEnabled || !isLoaded) {
      return;
    }

    const interval = window.setInterval(() => {
      void saveForUser(user.id);
    }, AUTOSAVE_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [autosaveEnabled, isLoaded, saveForUser, user]);

  useEffect(() => {
    if (!user || !autosaveEnabled || !isLoaded) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void saveForUser(user.id);
      }
    };

    const handleBeforeUnload = () => {
      void saveForUser(user.id);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [autosaveEnabled, isLoaded, saveForUser, user]);
}
