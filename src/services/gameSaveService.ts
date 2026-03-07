import { supabase } from '@/lib/supabase';
import type { GameProgress, GameSettings, RebirthUpgradeLevels } from '@/types/game';
import type { GameSaveRow, RebirthUpgradeRow } from '@/types/supabase';
import { createInitialProgress } from '@/utils/gameDefaults';
import { serializeProgressForSave, serializeRebirthUpgrades } from '@/utils/gameMappers';

async function getSaveRow(userId: string): Promise<GameSaveRow | null> {
  const { data, error } = await supabase
    .from('game_saves')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as GameSaveRow | null) ?? null;
}

async function createDefaultSave(userId: string, settings: GameSettings): Promise<GameSaveRow> {
  const defaultProgress = createInitialProgress({ settings });
  const payload = serializeProgressForSave(userId, defaultProgress);

  const { data, error } = await supabase
    .from('game_saves')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await saveRebirthUpgrades(userId, defaultProgress.rebirthUpgrades);

  return data as GameSaveRow;
}

export async function ensureGameSave(userId: string, settings: GameSettings): Promise<GameSaveRow> {
  const existing = await getSaveRow(userId);
  if (existing) {
    return existing;
  }

  return createDefaultSave(userId, settings);
}

export async function getRebirthUpgrades(userId: string): Promise<RebirthUpgradeRow[]> {
  const { data, error } = await supabase
    .from('rebirth_upgrades')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return (data as RebirthUpgradeRow[]) ?? [];
}

export async function saveGame(userId: string, progress: GameProgress): Promise<GameSaveRow> {
  const payload = serializeProgressForSave(userId, progress);

  const { data, error } = await supabase
    .from('game_saves')
    .upsert(payload, {
      onConflict: 'user_id',
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as GameSaveRow;
}

export async function saveRebirthUpgrades(userId: string, levels: RebirthUpgradeLevels): Promise<void> {
  const payload = serializeRebirthUpgrades(userId, levels);

  const { error } = await supabase.from('rebirth_upgrades').upsert(payload, {
    onConflict: 'user_id,upgrade_key',
  });

  if (error) {
    throw error;
  }
}
