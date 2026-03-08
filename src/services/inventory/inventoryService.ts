import { supabase } from '@/lib/supabase';
import type { UserItemRecord } from '@/types/systems';
import type { ItemDefinitionRow, UserItemRow } from '@/types/supabase';

type UserItemWithDefinition = UserItemRow & {
  item_definitions: ItemDefinitionRow;
};

function mapUserItem(row: UserItemWithDefinition): UserItemRecord {
  return {
    id: row.id,
    userId: row.user_id,
    itemDefinitionId: row.item_definition_id,
    quantity: row.quantity,
    isEquipped: row.is_equipped,
    equippedSlot: row.equipped_slot,
    isLockedInTrade: row.is_locked_in_trade,
    isMarkedTradable: row.is_marked_tradable,
    acquiredAt: row.acquired_at,
    metadata: row.metadata ?? {},
    definition: {
      id: row.item_definitions.id,
      itemKey: row.item_definitions.item_key,
      name: row.item_definitions.name,
      description: row.item_definitions.description,
      rarity: row.item_definitions.rarity,
      category: row.item_definitions.category,
      passiveType: row.item_definitions.passive_type,
      passiveValue: Number(row.item_definitions.passive_value ?? 0),
      stackable: row.item_definitions.stackable,
      tradable: row.item_definitions.tradable,
      baseValue: Number(row.item_definitions.base_value ?? 0),
      metadata: row.item_definitions.metadata ?? {},
    },
  };
}

export async function getUserInventory(userId: string): Promise<UserItemRecord[]> {
  const { data, error } = await supabase
    .from('user_items')
    .select('*, item_definitions(*)')
    .eq('user_id', userId)
    .order('acquired_at', { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as UserItemWithDefinition[]).map(mapUserItem);
}

export async function getPublicTradableInventory(userId: string): Promise<UserItemRecord[]> {
  const { data, error } = await supabase
    .from('user_items')
    .select('*, item_definitions(*)')
    .eq('user_id', userId)
    .eq('is_marked_tradable', true)
    .eq('is_equipped', false)
    .eq('is_locked_in_trade', false)
    .order('acquired_at', { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as UserItemWithDefinition[]).map(mapUserItem);
}

export async function setItemEquipped(userItemId: string, equip: boolean, slot?: string): Promise<void> {
  const { error } = await supabase.rpc('set_item_equipped', {
    p_user_item_id: userItemId,
    p_equip: equip,
    p_slot: slot ?? null,
  });

  if (error) {
    throw error;
  }
}

export async function setItemTradable(userItemId: string, tradable: boolean): Promise<void> {
  const { error } = await supabase
    .from('user_items')
    .update({ is_marked_tradable: tradable })
    .eq('id', userItemId);

  if (error) {
    throw error;
  }
}
