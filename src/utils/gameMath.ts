import { ACHIEVEMENTS } from '@/data/achievements';
import { BUILDINGS } from '@/data/buildings';
import { REBIRTH_UPGRADES } from '@/data/rebirthUpgrades';
import { UPGRADES } from '@/data/upgrades';
import type {
  AchievementDefinition,
  AchievementId,
  BuildingsOwned,
  GameStats,
  RebirthUpgradeLevels,
  RebirthUpgradeType,
  UpgradeId,
} from '@/types/game';

export const DEFAULT_BUILDING_COST_GROWTH = 1.15;
const MAX_OFFLINE_SECONDS = 60 * 60 * 8;

export function calculateBuildingCost(baseCost: number, owned: number, growth = DEFAULT_BUILDING_COST_GROWTH): number {
  return baseCost * growth ** owned;
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

function getPurchasedMultiplier(
  ids: UpgradeId[],
  type: 'click' | 'passive' | 'global',
): number {
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
}): {
  clickPower: number;
  passiveIncome: number;
  globalMultiplier: number;
  permanentMultipliers: {
    click: number;
    passive: number;
    global: number;
  };
} {
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

  const globalMultiplier = upgradeGlobalMultiplier * permanentGlobal;
  const clickPower = 1 * clickUpgradeMultiplier * permanentClick * globalMultiplier;
  const passiveIncome = basePassiveIncome * passiveUpgradeMultiplier * permanentPassive * globalMultiplier;

  return {
    clickPower,
    passiveIncome,
    globalMultiplier,
    permanentMultipliers: {
      click: permanentClick,
      passive: permanentPassive,
      global: permanentGlobal,
    },
  };
}

export function calculateRebirthReward(currentRunEarned: number, rebirthCount: number): number {
  const normalized = Math.max(0, currentRunEarned) / 50000;
  if (normalized < 1) {
    return 0;
  }

  const streakBonus = 1 + rebirthCount * 0.05;
  return Math.floor(Math.sqrt(normalized) * streakBonus);
}

export function calculateOfflineGain(passiveIncome: number, secondsOffline: number): number {
  const clampedSeconds = Math.min(Math.max(0, secondsOffline), MAX_OFFLINE_SECONDS);
  return passiveIncome * clampedSeconds;
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
