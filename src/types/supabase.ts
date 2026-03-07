import type {
  AchievementId,
  BuildingId,
  GameSettings,
  GameStats,
  RebirthUpgradeId,
  UpgradeId,
} from '@/types/game';

export type NumericValue = number | string;

export interface ProfileRow {
  id: string;
  username: string | null;
  created_at: string;
  updated_at: string;
}

export interface GameSaveStatsPayload extends GameStats {
  settings?: GameSettings;
  permanentMultipliers?: {
    click: number;
    passive: number;
    global: number;
  };
}

export interface GameSaveRow {
  id: string;
  user_id: string;
  resource_amount: NumericValue;
  total_resource_earned: NumericValue;
  click_power: NumericValue;
  passive_income: NumericValue;
  global_multiplier: NumericValue;
  rebirth_count: number;
  rebirth_currency: NumericValue;
  buildings: Partial<Record<BuildingId, number>>;
  upgrades: UpgradeId[];
  achievements: AchievementId[];
  stats: GameSaveStatsPayload;
  last_save_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RebirthUpgradeRow {
  id: string;
  user_id: string;
  upgrade_key: RebirthUpgradeId;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface GameSaveUpsertPayload {
  user_id: string;
  resource_amount: number;
  total_resource_earned: number;
  click_power: number;
  passive_income: number;
  global_multiplier: number;
  rebirth_count: number;
  rebirth_currency: number;
  buildings: Record<BuildingId, number>;
  upgrades: UpgradeId[];
  achievements: AchievementId[];
  stats: GameSaveStatsPayload;
  last_save_at: string;
}
