import { useEffect } from 'react';

import { useAuthStore } from '@/store/useAuthStore';
import { useGameStore } from '@/store/useGameStore';
import { useGatheringStore } from '@/store/useGatheringStore';

export function useGatheringPassiveLoop() {
  const user = useAuthStore((state) => state.user);
  const isGameLoaded = useGameStore((state) => state.isLoaded);
  const gatheringLoadedUserId = useGatheringStore((state) => state.loadedUserId);

  useEffect(() => {
    if (!user || !isGameLoaded || gatheringLoadedUserId !== user.id) {
      return;
    }

    const interval = window.setInterval(() => {
      const gatheringRate = useGatheringStore.getState().getGatheringGoldPerSecond();

      if (gatheringRate <= 0) {
        return;
      }

      useGameStore.getState().grantResource(gatheringRate, 'passive');
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [gatheringLoadedUserId, isGameLoaded, user]);
}
