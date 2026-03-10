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
import type {
  GatheringAreaKey,
  MaterialRarity,
  MerchantBuffType,
  ToolType,
} from '@/types/gathering';

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

export interface MaterialDefinitionRow {
  id: string;
  material_key: string;
  name: string;
  description: string;
  rarity: MaterialRarity;
  area_key: GatheringAreaKey;
  is_building_material: boolean;
  base_sell_value: NumericValue;
  created_at: string;
  updated_at: string;
}

export interface UserMaterialRow {
  user_id: string;
  material_definition_id: string;
  quantity: NumericValue;
  created_at: string;
  updated_at: string;
}

export interface ToolDefinitionRow {
  id: string;
  tool_key: string;
  name: string;
  tool_type: ToolType;
  tier: number;
  rarity: ItemRarity;
  buy_cost_gold: NumericValue;
  is_box_only: boolean;
  base_speed: NumericValue;
  base_yield: NumericValue;
  base_luck: NumericValue;
  base_duplicate_chance: NumericValue;
  base_rare_drop_chance: NumericValue;
  created_at: string;
  updated_at: string;
}

export interface UserToolRow {
  id: string;
  user_id: string;
  tool_definition_id: string;
  is_owned: boolean;
  is_equipped: boolean;
  created_at: string;
  updated_at: string;
}

export interface ToolUpgradeRow {
  user_id: string;
  tool_definition_id: string;
  speed_level: number;
  yield_level: number;
  luck_level: number;
  duplicate_level: number;
  rare_drop_level: number;
  created_at: string;
  updated_at: string;
}

export interface BuildingDefinitionRow {
  id: string;
  building_key: string;
  name: string;
  description: string;
  base_gold_cost: NumericValue;
  base_wood_cost: NumericValue;
  base_stone_cost: NumericValue;
  gold_growth: NumericValue;
  wood_growth: NumericValue;
  stone_growth: NumericValue;
  gold_per_second: NumericValue;
  unlock_rebirth_required: number;
  created_at: string;
  updated_at: string;
}

export interface UserBuildingRow {
  user_id: string;
  building_definition_id: string;
  owned_count: number;
  created_at: string;
  updated_at: string;
}

export interface MerchantTransactionRow {
  id: string;
  user_id: string;
  material_definition_id: string;
  quantity: number;
  gold_earned: NumericValue;
  bonus_type: MerchantBuffType | null;
  bonus_value: NumericValue;
  created_at: string;
}

export interface UserCollectionBuffRow {
  id: string;
  user_id: string;
  buff_type: MerchantBuffType;
  buff_value: NumericValue;
  expires_at: string;
  created_at: string;
}
