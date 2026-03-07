import { BUILDINGS } from '@/data/buildings';
import { REBIRTH_UPGRADES } from '@/data/rebirthUpgrades';
import type {
  BuildingsOwned,
  GameProgress,
  GameSettings,
  GameStats,
  RebirthUpgradeLevels,
} from '@/types/game';

export const defaultSettings: GameSettings = {
  soundMuted: false,
  autosaveEnabled: true,
  reduceMotion: false,
};

export function createEmptyBuildings(): BuildingsOwned {
  return BUILDINGS.reduce(
    (acc, building) => {
      acc[building.id] = 0;
      return acc;
    },
    {} as BuildingsOwned,
  );
}

export function createEmptyRebirthUpgradeLevels(): RebirthUpgradeLevels {
  return REBIRTH_UPGRADES.reduce(
    (acc, upgrade) => {
      acc[upgrade.id] = 0;
      return acc;
    },
    {} as RebirthUpgradeLevels,
  );
}

export function createInitialStats(): GameStats {
  return {
    totalClicks: 0,
    totalManualEarned: 0,
    totalPassiveEarned: 0,
    buildingsPurchased: 0,
    upgradesPurchased: 0,
    playTimeSeconds: 0,
    currentRunEarned: 0,
  };
}

export function createInitialProgress(partial?: Partial<GameProgress>): GameProgress {
  return {
    resourceAmount: 0,
    totalResourceEarned: 0,
    clickPower: 1,
    passiveIncome: 0,
    globalMultiplier: 1,
    rebirthCount: 0,
    rebirthCurrency: 0,
    buildings: createEmptyBuildings(),
    upgrades: [],
    achievements: [],
    rebirthUpgrades: createEmptyRebirthUpgradeLevels(),
    permanentMultipliers: {
      click: 1,
      passive: 1,
      global: 1,
    },
    stats: createInitialStats(),
    settings: { ...defaultSettings },
    lastSaveAt: null,
    ...partial,
  };
}
