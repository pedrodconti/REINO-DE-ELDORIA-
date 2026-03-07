import { useEffect } from 'react';

import { useAuthStore } from '@/store/useAuthStore';
import { useGameStore } from '@/store/useGameStore';

export function useGameBootstrap() {
  const user = useAuthStore((state) => state.user);
  const loadForUser = useGameStore((state) => state.loadForUser);
  const loadedUserId = useGameStore((state) => state.loadedUserId);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (loadedUserId === user.id) {
      return;
    }

    void loadForUser(user.id);
  }, [loadedUserId, loadForUser, user]);
}
