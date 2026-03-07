import { useEffect } from 'react';
import { toast } from 'sonner';

import { getAchievementById, useGameStore } from '@/store/useGameStore';

export function useAchievementToasts() {
  const queue = useGameStore((state) => state.pendingAchievementIds);
  const consume = useGameStore((state) => state.consumeAchievementQueue);

  useEffect(() => {
    if (!queue.length) {
      return;
    }

    const unlocked = consume();

    unlocked.forEach((id) => {
      const achievement = getAchievementById(id);
      if (!achievement) {
        return;
      }

      toast.success('Conquista desbloqueada!', {
        description: `${achievement.name} - ${achievement.description}`,
      });
    });
  }, [consume, queue]);
}
