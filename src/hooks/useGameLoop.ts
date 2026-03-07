import { useEffect } from 'react';

import { useGameStore } from '@/store/useGameStore';

export function useGameLoop() {
  const tick = useGameStore((state) => state.tick);
  const isLoaded = useGameStore((state) => state.isLoaded);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    let lastTick = performance.now();

    const interval = window.setInterval(() => {
      const now = performance.now();
      const deltaSeconds = (now - lastTick) / 1000;
      lastTick = now;
      tick(deltaSeconds);
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isLoaded, tick]);
}
