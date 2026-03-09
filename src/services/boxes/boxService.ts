import { supabase } from '@/lib/supabase';
import type { BoxOpenResult, LootBoxShopState } from '@/types/systems';

export interface BoxHistoryEntry {
  id: string;
  openedAt: string;
  pricePaid: number;
  boxName: string;
  boxRarity: string;
  itemName: string;
  itemRarity: string;
}

function normalizeShopState(payload: unknown): LootBoxShopState {
  const defaultState: LootBoxShopState = {
    activeRotations: [],
    nextSpawnAt: null,
    serverNow: new Date().toISOString(),
  };

  if (!payload || typeof payload !== 'object') {
    return defaultState;
  }

  const parsed = payload as Partial<LootBoxShopState>;
  const activeRotations = Array.isArray(parsed.activeRotations)
    ? parsed.activeRotations
        .filter((rotation) => Boolean(rotation?.rotationId) && Boolean(rotation?.box))
        .map((rotation) => ({
          ...rotation,
          hasOpened: Boolean(rotation.hasOpened),
          box: {
            ...rotation.box,
            price: Number(rotation.box?.price ?? 0),
            spawnWeight: Number(rotation.box?.spawnWeight ?? 0),
            durationMinutes: Number(rotation.box?.durationMinutes ?? 0),
          },
        }))
    : [];

  return {
    activeRotations,
    nextSpawnAt: parsed.nextSpawnAt ?? null,
    serverNow: parsed.serverNow ?? defaultState.serverNow,
  };
}

export async function getLootBoxShopState(): Promise<LootBoxShopState> {
  const { data, error } = await supabase.rpc('refresh_loot_box_shop');

  if (error) {
    throw error;
  }

  return normalizeShopState(data);
}

export async function openLootBox(rotationId: string): Promise<BoxOpenResult> {
  const { data, error } = await supabase.rpc('open_active_loot_box', {
    p_rotation_id: rotationId,
  });

  if (error) {
    throw error;
  }

  return data as BoxOpenResult;
}

export async function getRecentBoxOpens(userId: string, limit = 12): Promise<BoxHistoryEntry[]> {
  const { data, error } = await supabase
    .from('box_open_history')
    .select(
      'id, opened_at, price_paid, loot_boxes(name, rarity), item_definitions(name, rarity)',
    )
    .eq('user_id', userId)
    .order('opened_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  type HistoryRow = {
    id: string;
    opened_at: string;
    price_paid: number | string;
    loot_boxes: { name: string; rarity: string } | Array<{ name: string; rarity: string }> | null;
    item_definitions: { name: string; rarity: string } | Array<{ name: string; rarity: string }> | null;
  };

  return ((data ?? []) as HistoryRow[]).map((row) => {
    const boxRow = Array.isArray(row.loot_boxes) ? row.loot_boxes[0] : row.loot_boxes;
    const itemRow = Array.isArray(row.item_definitions) ? row.item_definitions[0] : row.item_definitions;

    return {
      id: row.id,
      openedAt: row.opened_at,
      pricePaid: Number(row.price_paid ?? 0),
      boxName: boxRow?.name ?? 'Caixa desconhecida',
      boxRarity: boxRow?.rarity ?? 'comum',
      itemName: itemRow?.name ?? 'Item desconhecido',
      itemRarity: itemRow?.rarity ?? 'comum',
    };
  });
}
