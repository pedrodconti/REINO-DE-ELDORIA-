import { BUILDINGS } from '@/data/buildings';
import { REBIRTH_UPGRADES } from '@/data/rebirthUpgrades';
import type {
  BuildingId,
  GameProgress,
  RebirthUpgradeId,
  UpgradeId,
} from '@/types/game';
import type {
  GameSaveRow,
  GameSaveUpsertPayload,
  NumericValue,
  RebirthUpgradeRow,
} from '@/types/supabase';
import { createEmptyBuildings, createEmptyRebirthUpgradeLevels, createInitialProgress } from '@/utils/gameDefaults';

function toNumber(value: NumericValue | null | undefined, fallback = 0): number {
  if (value === null || value === undefined) {
    return fallback;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBuildings(input: Partial<Record<BuildingId, number>> | null | undefined) {
  const defaults = createEmptyBuildings();
  if (!input) {
    return defaults;
  }

  return Object.keys(defaults).reduce((acc, key) => {
    const buildingKey = key as BuildingId;
    acc[buildingKey] = toNumber(input[buildingKey], 0);
    return acc;
  }, defaults);
}

function normalizeRebirthUpgrades(rows: RebirthUpgradeRow[] | null | undefined) {
  const defaults = createEmptyRebirthUpgradeLevels();

  if (!rows) {
    return defaults;
  }

  rows.forEach((row) => {
    const key = row.upgrade_key as RebirthUpgradeId;
    if (key in defaults) {
      defaults[key] = Math.max(0, row.level);
    }
  });

  return defaults;
}

function sanitizeUpgradeList(input: UpgradeId[] | null | undefined): UpgradeId[] {
  if (!input) {
    return [];
  }

  const allowed = new Set<UpgradeId>([
    'iron_sickle',
    'veteran_hands',
    'enchanted_pulleys',
    'royal_granary',
    'rune_windmill',
    'crystal_catalyst',
    'archmage_conclave',
    'draconic_tithe',
    'crown_of_dawn',
    'oath_of_constellation',
  ]);

  return input.filter((item) => allowed.has(item));
}

function sanitizeAchievementList(input: string[] | null | undefined) {
  const allowed = new Set([
    'first_click',
    'hundred_clicks',
    'first_building',
    'ten_buildings',
    'first_upgrade',
    'thousand_essence',
    'first_rebirth',
    'realm_expander',
    'arcane_magnate',
    'passive_master',
  ]);

  if (!input) {
    return [];
  }

  return input.filter((item): item is GameProgress['achievements'][number] => allowed.has(item));
}

export function mapDatabaseToProgress(
  row: GameSaveRow | null,
  rebirthRows: RebirthUpgradeRow[] | null,
  fallbackSettings: GameProgress['settings'],
): GameProgress {
  if (!row) {
    return createInitialProgress({ settings: fallbackSettings });
  }

  const settings = row.stats?.settings;

  const progress = createInitialProgress({
    resourceAmount: toNumber(row.resource_amount, 0),
    totalResourceEarned: toNumber(row.total_resource_earned, 0),
    clickPower: toNumber(row.click_power, 1),
    passiveIncome: toNumber(row.passive_income, 0),
    globalMultiplier: toNumber(row.global_multiplier, 1),
    rebirthCount: row.rebirth_count ?? 0,
    rebirthCurrency: toNumber(row.rebirth_currency, 0),
    buildings: normalizeBuildings(row.buildings),
    upgrades: sanitizeUpgradeList(row.upgrades),
    achievements: sanitizeAchievementList(row.achievements),
    rebirthUpgrades: normalizeRebirthUpgrades(rebirthRows),
    stats: {
      totalClicks: toNumber(row.stats?.totalClicks, 0),
      totalManualEarned: toNumber(row.stats?.totalManualEarned, 0),
      totalPassiveEarned: toNumber(row.stats?.totalPassiveEarned, 0),
      buildingsPurchased: toNumber(row.stats?.buildingsPurchased, 0),
      upgradesPurchased: toNumber(row.stats?.upgradesPurchased, 0),
      playTimeSeconds: toNumber(row.stats?.playTimeSeconds, 0),
      currentRunEarned: toNumber(row.stats?.currentRunEarned, 0),
      boxesOpened: toNumber(row.stats?.boxesOpened, 0),
      tradesCompleted: toNumber(row.stats?.tradesCompleted, 0),
    },
    settings: {
      soundMuted: settings?.soundMuted ?? fallbackSettings.soundMuted,
      autosaveEnabled: settings?.autosaveEnabled ?? fallbackSettings.autosaveEnabled,
      reduceMotion: settings?.reduceMotion ?? fallbackSettings.reduceMotion,
    },
    lastSaveAt: row.last_save_at,
  });

  return progress;
}

export function serializeProgressForSave(userId: string, progress: GameProgress): GameSaveUpsertPayload {
  return {
    user_id: userId,
    resource_amount: progress.resourceAmount,
    total_resource_earned: progress.totalResourceEarned,
    click_power: progress.clickPower,
    passive_income: progress.passiveIncome,
    global_multiplier: progress.globalMultiplier,
    rebirth_count: progress.rebirthCount,
    rebirth_currency: progress.rebirthCurrency,
    buildings: progress.buildings,
    upgrades: progress.upgrades,
    achievements: progress.achievements,
    stats: {
      ...progress.stats,
      settings: progress.settings,
      permanentMultipliers: progress.permanentMultipliers,
    },
    last_save_at: new Date().toISOString(),
  };
}

export function serializeRebirthUpgrades(
  userId: string,
  levels: Record<RebirthUpgradeId, number>,
): Array<{ user_id: string; upgrade_key: RebirthUpgradeId; level: number }> {
  return REBIRTH_UPGRADES.map((upgrade) => ({
    user_id: userId,
    upgrade_key: upgrade.id,
    level: levels[upgrade.id] ?? 0,
  }));
}

export function getBuildingCostById(buildingId: BuildingId, owned: number): number {
  const building = BUILDINGS.find((entry) => entry.id === buildingId);
  if (!building) {
    return Number.POSITIVE_INFINITY;
  }

  return building.baseCost * building.costGrowth ** owned;
}
