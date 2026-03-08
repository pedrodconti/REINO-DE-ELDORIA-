export type BuildingId =
  | 'humble_hut'
  | 'lumber_mill'
  | 'alchemist_lab'
  | 'mage_tower'
  | 'dragon_keep'
  | 'celestial_forge';

export type UpgradeId =
  | 'iron_sickle'
  | 'veteran_hands'
  | 'enchanted_pulleys'
  | 'royal_granary'
  | 'rune_windmill'
  | 'crystal_catalyst'
  | 'archmage_conclave'
  | 'draconic_tithe'
  | 'crown_of_dawn'
  | 'oath_of_constellation';

export type AchievementId =
  | 'first_click'
  | 'hundred_clicks'
  | 'first_building'
  | 'ten_buildings'
  | 'first_upgrade'
  | 'thousand_essence'
  | 'first_rebirth'
  | 'realm_expander'
  | 'arcane_magnate'
  | 'passive_master';

export type RebirthUpgradeId = 'decree_of_hands' | 'decree_of_harvest' | 'decree_of_crown';

export type UpgradeType = 'click' | 'passive' | 'global';
export type RebirthUpgradeType = 'click' | 'passive' | 'global';

export type AchievementConditionType =
  | 'total_clicks'
  | 'total_buildings'
  | 'total_upgrades'
  | 'total_resource'
  | 'rebirth_count'
  | 'passive_income';

export interface BuildingDefinition {
  id: BuildingId;
  name: string;
  flavor: string;
  baseCost: number;
  baseProduction: number;
  costGrowth: number;
  unlockAtTotalEarned: number;
}

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  flavor: string;
  type: UpgradeType;
  cost: number;
  multiplier: number;
  unlockAtTotalEarned: number;
  requiresBuilding?: {
    id: BuildingId;
    quantity: number;
  };
}

export interface AchievementDefinition {
  id: AchievementId;
  name: string;
  description: string;
  condition: AchievementConditionType;
  target: number;
}

export interface RebirthUpgradeDefinition {
  id: RebirthUpgradeId;
  name: string;
  flavor: string;
  type: RebirthUpgradeType;
  costBase: number;
  costGrowth: number;
  valuePerLevel: number;
  maxLevel: number;
}

export type BuildingsOwned = Record<BuildingId, number>;
export type RebirthUpgradeLevels = Record<RebirthUpgradeId, number>;

export interface PermanentMultipliers {
  click: number;
  passive: number;
  global: number;
}

export interface ItemPassiveBonuses {
  clickFlat: number;
  passiveFlat: number;
  globalMultiplierBonus: number;
  clickCritChance: number;
  buildingDiscount: number;
  rebirthRewardBonus: number;
  itemDropBonus: number;
  offlineIncomeBonus: number;
  rareBoxSpawnBonus: number;
  boxCooldownReduction: number;
}

export interface GameStats {
  totalClicks: number;
  totalManualEarned: number;
  totalPassiveEarned: number;
  buildingsPurchased: number;
  upgradesPurchased: number;
  playTimeSeconds: number;
  currentRunEarned: number;
  boxesOpened: number;
  tradesCompleted: number;
}

export interface GameSettings {
  soundMuted: boolean;
  autosaveEnabled: boolean;
  reduceMotion: boolean;
}

export interface GameProgress {
  resourceAmount: number;
  totalResourceEarned: number;
  clickPower: number;
  passiveIncome: number;
  globalMultiplier: number;
  rebirthCount: number;
  rebirthCurrency: number;
  buildings: BuildingsOwned;
  upgrades: UpgradeId[];
  achievements: AchievementId[];
  rebirthUpgrades: RebirthUpgradeLevels;
  permanentMultipliers: PermanentMultipliers;
  stats: GameStats;
  settings: GameSettings;
  lastSaveAt: string | null;
}

export interface ActionFeedback {
  ok: boolean;
  message: string;
}

export interface LoadFeedback {
  ok: boolean;
  message: string;
}
