import { useEffect } from 'react';

import { useAuthStore } from '@/store/useAuthStore';
import { useGameStore } from '@/store/useGameStore';
import { useInventoryStore } from '@/store/useInventoryStore';

export function useGameBootstrap() {
  const user = useAuthStore((state) => state.user);
  const loadForUser = useGameStore((state) => state.loadForUser);
  const loadedUserId = useGameStore((state) => state.loadedUserId);
  const loadInventory = useInventoryStore((state) => state.loadInventory);
  const inventoryLoadedUserId = useInventoryStore((state) => state.loadedUserId);
  const clearInventory = useInventoryStore((state) => state.clear);

  useEffect(() => {
    if (!user) {
      clearInventory();
      return;
    }

    if (loadedUserId !== user.id) {
      void loadForUser(user.id);
      return;
    }

    if (inventoryLoadedUserId !== user.id) {
      void loadInventory(user.id, true);
    }
  }, [clearInventory, inventoryLoadedUserId, loadForUser, loadInventory, loadedUserId, user]);
}
