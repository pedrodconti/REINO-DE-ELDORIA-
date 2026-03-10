import type {
  AchievementId,
  BuildingId,
  GameSettings,
  GameStats,
  RebirthUpgradeId,
  UpgradeId,
} from '@/types/game';
import type {
  ItemCategory,
  ItemPassiveType,
  ItemRarity,
  LootBoxKey,
  TradeStatus,
} from '@/types/systems';

export type NumericValue = number | string;

export interface ProfileRow {
  id: string;
  username: string | null;
  username_changed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GameSaveStatsPayload extends GameStats {
  crownDiamonds?: number;
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
  crown_diamonds?: NumericValue | null;
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
  crown_diamonds?: number;
  buildings: Record<BuildingId, number>;
  upgrades: UpgradeId[];
  achievements: AchievementId[];
  stats: GameSaveStatsPayload;
  last_save_at: string;
}

export interface LootBoxRow {
  id: string;
  box_key: LootBoxKey | string;
  name: string;
  description: string;
  rarity: string;
  price: NumericValue;
  spawn_weight: number;
  duration_minutes: number;
  min_gap_minutes: number;
  max_gap_minutes: number;
  active: boolean;
  visual: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ItemDefinitionRow {
  id: string;
  item_key: string;
  name: string;
  description: string;
  rarity: ItemRarity;
  category: ItemCategory;
  passive_type: ItemPassiveType;
  passive_value: NumericValue;
  stackable: boolean;
  tradable: boolean;
  base_value: NumericValue;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface UserItemRow {
  id: string;
  user_id: string;
  item_definition_id: string;
  quantity: number;
  is_equipped: boolean;
  equipped_slot: string | null;
  is_locked_in_trade: boolean;
  is_marked_tradable: boolean;
  acquired_at: string;
  metadata: Record<string, unknown>;
  updated_at: string;
}

export interface LeaderboardCacheRow {
  user_id: string;
  username: string;
  total_resource: NumericValue;
  passive_income: NumericValue;
  rebirth_count: number;
  boxes_opened: number;
  inventory_value: NumericValue;
  highest_item_rarity: ItemRarity | null;
  highest_item_tier: number;
  updated_at: string;
}

export interface TradeRow {
  id: string;
  proposer_user_id: string;
  receiver_user_id: string;
  status: TradeStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
}

export interface TradeItemRow {
  id: string;
  trade_id: string;
  owner_user_id: string;
  user_item_id: string;
  quantity: number;
  item_definition_id: string;
  item_name: string;
  item_rarity: ItemRarity;
  item_category: ItemCategory;
  created_at: string;
}
