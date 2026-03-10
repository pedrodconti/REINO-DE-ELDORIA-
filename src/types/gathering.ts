export type GatheringAreaKey = 'floresta' | 'ravina';
export type ToolType = 'machado' | 'picareta';
export type MaterialRarity = 'comum' | 'raro';
export type MerchantBuffType = 'collection_luck' | 'collection_yield' | 'gold_bonus';
export type ToolUpgradeStat = 'speed' | 'yield' | 'luck' | 'duplicate' | 'rare_drop';

export interface MaterialDefinitionRecord {
  id: string;
  materialKey: string;
  name: string;
  description: string;
  rarity: MaterialRarity;
  areaKey: GatheringAreaKey;
  isBuildingMaterial: boolean;
  baseSellValue: number;
}

export interface UserMaterialRecord {
  userId: string;
  materialDefinitionId: string;
  quantity: number;
}

export interface ToolDefinitionRecord {
  id: string;
  toolKey: string;
  name: string;
  toolType: ToolType;
  tier: number;
  rarity: 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario' | 'mitico';
  buyCostGold: number;
  isBoxOnly: boolean;
  baseSpeed: number;
  baseYield: number;
  baseLuck: number;
  baseDuplicateChance: number;
  baseRareDropChance: number;
}

export interface ToolUpgradeRecord {
  userId: string;
  toolDefinitionId: string;
  speedLevel: number;
  yieldLevel: number;
  luckLevel: number;
  duplicateLevel: number;
  rareDropLevel: number;
}

export interface UserToolRecord {
  id: string;
  userId: string;
  toolDefinitionId: string;
  isOwned: boolean;
  isEquipped: boolean;
}

export interface ToolWithState {
  definition: ToolDefinitionRecord;
  state: UserToolRecord;
  upgrades: ToolUpgradeRecord;
}

export interface BuildingDefinitionRecord {
  id: string;
  buildingKey: string;
  name: string;
  description: string;
  baseGoldCost: number;
  baseWoodCost: number;
  baseStoneCost: number;
  goldGrowth: number;
  woodGrowth: number;
  stoneGrowth: number;
  goldPerSecond: number;
  unlockRebirthRequired: number;
}

export interface UserBuildingRecord {
  userId: string;
  buildingDefinitionId: string;
  ownedCount: number;
}

export interface MerchantBuffRecord {
  id: string;
  userId: string;
  buffType: MerchantBuffType;
  buffValue: number;
  expiresAt: string;
  createdAt: string;
}

export interface GatherDropResult {
  materialKey: string;
  materialName: string;
  amount: number;
  rarity: MaterialRarity;
}

export interface GatherActionResult {
  areaKey: GatheringAreaKey;
  drops: GatherDropResult[];
}

