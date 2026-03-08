import { ACHIEVEMENTS } from '@/data/achievements';
import { BUILDINGS } from '@/data/buildings';
import { REBIRTH_UPGRADES } from '@/data/rebirthUpgrades';
import { UPGRADES } from '@/data/upgrades';
import type {
  AchievementDefinition,
  AchievementId,
  BuildingsOwned,
  GameStats,
  ItemPassiveBonuses,
  RebirthUpgradeLevels,
  RebirthUpgradeType,
  UpgradeId,
} from '@/types/game';

export const DEFAULT_BUILDING_COST_GROWTH = 1.15;
const MAX_OFFLINE_SECONDS = 60 * 60 * 8;

const emptyItemBonuses: ItemPassiveBonuses = {
  clickFlat: 0,
  passiveFlat: 0,
  globalMultiplierBonus: 0,
  clickCritChance: 0,
  buildingDiscount: 0,
  rebirthRewardBonus: 0,
  itemDropBonus: 0,
  offlineIncomeBonus: 0,
  rareBoxSpawnBonus: 0,
  boxCooldownReduction: 0,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeItemBonuses(input?: Partial<ItemPassiveBonuses> | null): ItemPassiveBonuses {
  return {
    clickFlat: input?.clickFlat ?? 0,
    passiveFlat: input?.passiveFlat ?? 0,
    globalMultiplierBonus: input?.globalMultiplierBonus ?? 0,
    clickCritChance: clamp(input?.clickCritChance ?? 0, 0, 0.75),
    buildingDiscount: clamp(input?.buildingDiscount ?? 0, 0, 0.5),
    rebirthRewardBonus: clamp(input?.rebirthRewardBonus ?? 0, 0, 2),
    itemDropBonus: clamp(input?.itemDropBonus ?? 0, 0, 3),
    offlineIncomeBonus: clamp(input?.offlineIncomeBonus ?? 0, 0, 2),
    rareBoxSpawnBonus: clamp(input?.rareBoxSpawnBonus ?? 0, 0, 1),
    boxCooldownReduction: clamp(input?.boxCooldownReduction ?? 0, 0, 0.75),
  };
}

export function calculateBuildingCost(baseCost: number, owned: number, growth = DEFAULT_BUILDING_COST_GROWTH): number {
  return baseCost * growth ** owned;
}

export function calculateEffectiveBuildingCost(
  baseCost: number,
  owned: number,
  growth: number,
  buildingDiscount = 0,
): number {
  const rawCost = calculateBuildingCost(baseCost, owned, growth);
  return rawCost * (1 - clamp(buildingDiscount, 0, 0.5));
}

export function calculateRebirthUpgradeCost(baseCost: number, currentLevel: number, growth: number): number {
  return baseCost * growth ** currentLevel;
}

export function getTotalBuildingsOwned(buildings: BuildingsOwned): number {
  return Object.values(buildings).reduce((acc, amount) => acc + amount, 0);
}

export function isBuildingUnlocked(totalEarned: number, unlockAt: number): boolean {
  return totalEarned >= unlockAt;
}

export function isUpgradeUnlocked(
  upgradeId: UpgradeId,
  totalEarned: number,
  buildings: BuildingsOwned,
  purchased: UpgradeId[],
): boolean {
  if (purchased.includes(upgradeId)) {
    return false;
  }

  const upgrade = UPGRADES.find((entry) => entry.id === upgradeId);
  if (!upgrade) {
    return false;
  }

  if (totalEarned < upgrade.unlockAtTotalEarned) {
    return false;
  }

  if (!upgrade.requiresBuilding) {
    return true;
  }

  return buildings[upgrade.requiresBuilding.id] >= upgrade.requiresBuilding.quantity;
}

function getPurchasedMultiplier(ids: UpgradeId[], type: 'click' | 'passive' | 'global'): number {
  const owned = new Set(ids);
  return UPGRADES.filter((upgrade) => upgrade.type === type && owned.has(upgrade.id)).reduce(
    (acc, upgrade) => acc * upgrade.multiplier,
    1,
  );
}

function getPermanentBonus(levels: RebirthUpgradeLevels, type: RebirthUpgradeType): number {
  return REBIRTH_UPGRADES.filter((upgrade) => upgrade.type === type).reduce((acc, upgrade) => {
    const level = levels[upgrade.id] ?? 0;
    return acc + level * upgrade.valuePerLevel;
  }, 1);
}

export function calculateDerivedProgress(input: {
  buildings: BuildingsOwned;
  purchasedUpgrades: UpgradeId[];
  rebirthUpgrades: RebirthUpgradeLevels;
  rebirthCount: number;
  itemBonuses?: ItemPassiveBonuses;
}): {
  clickPower: number;
  passiveIncome: number;
  globalMultiplier: number;
  permanentMultipliers: {
    click: number;
    passive: number;
    global: number;
  };
  critChance: number;
} {
  const itemBonuses = normalizeItemBonuses(input.itemBonuses ?? emptyItemBonuses);

  const basePassiveIncome = BUILDINGS.reduce((acc, building) => {
    const amount = input.buildings[building.id] ?? 0;
    return acc + amount * building.baseProduction;
  }, 0);

  const clickUpgradeMultiplier = getPurchasedMultiplier(input.purchasedUpgrades, 'click');
  const passiveUpgradeMultiplier = getPurchasedMultiplier(input.purchasedUpgrades, 'passive');
  const upgradeGlobalMultiplier = getPurchasedMultiplier(input.purchasedUpgrades, 'global');

  const permanentClick = getPermanentBonus(input.rebirthUpgrades, 'click');
  const permanentPassive = getPermanentBonus(input.rebirthUpgrades, 'passive');
  const permanentGlobal = getPermanentBonus(input.rebirthUpgrades, 'global') * (1 + input.rebirthCount * 0.02);

  const itemGlobalMultiplier = 1 + itemBonuses.globalMultiplierBonus;
  const globalMultiplier = upgradeGlobalMultiplier * permanentGlobal * itemGlobalMultiplier;
  const clickBase = 1 + itemBonuses.clickFlat;
  const passiveBase = basePassiveIncome + itemBonuses.passiveFlat;

  const clickPower = clickBase * clickUpgradeMultiplier * permanentClick * globalMultiplier;
  const passiveIncome = passiveBase * passiveUpgradeMultiplier * permanentPassive * globalMultiplier;

  return {
    clickPower,
    passiveIncome,
    globalMultiplier,
    permanentMultipliers: {
      click: permanentClick,
      passive: permanentPassive,
      global: permanentGlobal,
    },
    critChance: itemBonuses.clickCritChance,
  };
}

export function calculateRebirthReward(
  currentRunEarned: number,
  rebirthCount: number,
  rebirthRewardBonus = 0,
): number {
  const normalized = Math.max(0, currentRunEarned) / 50000;
  if (normalized < 1) {
    return 0;
  }

  const streakBonus = 1 + rebirthCount * 0.05;
  const itemBonus = 1 + clamp(rebirthRewardBonus, 0, 2);
  return Math.floor(Math.sqrt(normalized) * streakBonus * itemBonus);
}

export function calculateOfflineGain(
  passiveIncome: number,
  secondsOffline: number,
  offlineIncomeBonus = 0,
): number {
  const clampedSeconds = Math.min(Math.max(0, secondsOffline), MAX_OFFLINE_SECONDS);
  const bonusMultiplier = 1 + clamp(offlineIncomeBonus, 0, 2);
  return passiveIncome * clampedSeconds * bonusMultiplier;
}

export function calculateSecondsOffline(lastSaveAt: string | null): number {
  if (!lastSaveAt) {
    return 0;
  }

  const lastSaveTimestamp = new Date(lastSaveAt).getTime();
  if (Number.isNaN(lastSaveTimestamp)) {
    return 0;
  }

  return Math.max(0, (Date.now() - lastSaveTimestamp) / 1000);
}

export function evaluateAchievement(
  achievement: AchievementDefinition,
  input: {
    stats: GameStats;
    totalResourceEarned: number;
    rebirthCount: number;
    passiveIncome: number;
    buildings: BuildingsOwned;
    upgrades: UpgradeId[];
  },
): boolean {
  switch (achievement.condition) {
    case 'total_clicks':
      return input.stats.totalClicks >= achievement.target;
    case 'total_buildings':
      return getTotalBuildingsOwned(input.buildings) >= achievement.target;
    case 'total_upgrades':
      return input.upgrades.length >= achievement.target;
    case 'total_resource':
      return input.totalResourceEarned >= achievement.target;
    case 'rebirth_count':
      return input.rebirthCount >= achievement.target;
    case 'passive_income':
      return input.passiveIncome >= achievement.target;
    default:
      return false;
  }
}

export function collectUnlockedAchievements(input: {
  unlocked: AchievementId[];
  stats: GameStats;
  totalResourceEarned: number;
  rebirthCount: number;
  passiveIncome: number;
  buildings: BuildingsOwned;
  upgrades: UpgradeId[];
}): AchievementId[] {
  const unlockedSet = new Set(input.unlocked);
  const newlyUnlocked: AchievementId[] = [];

  ACHIEVEMENTS.forEach((achievement) => {
    if (unlockedSet.has(achievement.id)) {
      return;
    }

    const achieved = evaluateAchievement(achievement, {
      stats: input.stats,
      totalResourceEarned: input.totalResourceEarned,
      rebirthCount: input.rebirthCount,
      passiveIncome: input.passiveIncome,
      buildings: input.buildings,
      upgrades: input.upgrades,
    });

    if (achieved) {
      newlyUnlocked.push(achievement.id);
    }
  });

  return newlyUnlocked;
}

export function roundToGamePrecision(value: number): number {
  return Math.round(value * 1000) / 1000;
}
