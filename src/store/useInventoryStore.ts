import { create } from 'zustand';

import { getUserInventory, setItemEquipped, setItemTradable } from '@/services/inventory/inventoryService';
import type { ActionFeedback } from '@/types/game';
import type { UserItemRecord } from '@/types/systems';
import { useGameStore } from '@/store/useGameStore';
import { aggregateItemPassiveBonuses } from '@/utils/itemPassives';

interface InventoryStore {
  items: UserItemRecord[];
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: string | null;
  loadedUserId: string | null;
  loadInventory: (userId: string, force?: boolean) => Promise<void>;
  toggleEquip: (userId: string, userItemId: string, equip: boolean, slot?: string) => Promise<ActionFeedback>;
  setTradable: (userId: string, userItemId: string, tradable: boolean) => Promise<ActionFeedback>;
  updateItems: (items: UserItemRecord[]) => void;
  clear: () => void;
}

function toFeedbackError(error: unknown): ActionFeedback {
  if (error && typeof error === 'object' && 'message' in error) {
    return {
      ok: false,
      message: String(error.message),
    };
  }

  return {
    ok: false,
    message: 'Falha ao processar inventario.',
  };
}

function syncBonuses(items: UserItemRecord[]) {
  const bonuses = aggregateItemPassiveBonuses(items);
  useGameStore.getState().setItemPassiveBonuses(bonuses);
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,
  lastSyncedAt: null,
  loadedUserId: null,

  loadInventory: async (userId, force = false) => {
    if (!force && get().loadedUserId === userId && get().lastSyncedAt && !get().error) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const items = await getUserInventory(userId);
      syncBonuses(items);

      set({
        items,
        isLoading: false,
        loadedUserId: userId,
        lastSyncedAt: new Date().toISOString(),
      });
    } catch (error) {
      const feedback = toFeedbackError(error);
      set({
        isLoading: false,
        error: feedback.message,
      });
    }
  },

  toggleEquip: async (userId, userItemId, equip, slot) => {
    try {
      await setItemEquipped(userItemId, equip, slot);
      await get().loadInventory(userId);

      return {
        ok: true,
        message: equip ? 'Item equipado.' : 'Item desequipado.',
      };
    } catch (error) {
      return toFeedbackError(error);
    }
  },

  setTradable: async (userId, userItemId, tradable) => {
    try {
      await setItemTradable(userItemId, tradable);
      await get().loadInventory(userId);

      return {
        ok: true,
        message: tradable ? 'Item marcado para trade.' : 'Item removido do trade.',
      };
    } catch (error) {
      return toFeedbackError(error);
    }
  },

  updateItems: (items) => {
    syncBonuses(items);
    set({
      items,
      error: null,
      lastSyncedAt: new Date().toISOString(),
    });
  },

  clear: () => {
    useGameStore.getState().setItemPassiveBonuses(undefined);
    set({
      items: [],
      isLoading: false,
      error: null,
      lastSyncedAt: null,
      loadedUserId: null,
    });
  },
}));
