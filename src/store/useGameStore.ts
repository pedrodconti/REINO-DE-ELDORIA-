import { create } from 'zustand';

import { ACHIEVEMENTS } from '@/data/achievements';
import { BUILDINGS } from '@/data/buildings';
import { REBIRTH_UPGRADES } from '@/data/rebirthUpgrades';
import { UPGRADES } from '@/data/upgrades';
import type {
  AchievementId,
  ActionFeedback,
  BuildingId,
  GameProgress,
  GameSettings,
  ItemPassiveBonuses,
  LoadFeedback,
  RebirthUpgradeId,
  UpgradeId,
} from '@/types/game';
import { ensureGameSave, getRebirthUpgrades, saveGame, saveRebirthUpgrades } from '@/services/gameSaveService';
import { createEmptyBuildings, createInitialProgress, defaultItemPassiveBonuses } from '@/utils/gameDefaults';
import {
  calculateDerivedProgress,
  calculateEffectiveBuildingCost,
  calculateOfflineGain,
  calculateRebirthReward,
  calculateRebirthUpgradeCost,
  calculateSecondsOffline,
  collectUnlockedAchievements,
  isBuildingUnlocked,
  isUpgradeUnlocked,
  normalizeItemBonuses,
  roundToGamePrecision,
} from '@/utils/gameMath';
import { mapDatabaseToProgress } from '@/utils/gameMappers';

interface GameStore {
  progress: GameProgress;
  itemPassiveBonuses: ItemPassiveBonuses;
  critChance: number;
  isLoading: boolean;
  isLoaded: boolean;
  isSaving: boolean;
  loadedUserId: string | null;
  error: string | null;
  offlineReward: number;
  pendingAchievementIds: AchievementId[];
  loadForUser: (userId: string, force?: boolean, applyOfflineReward?: boolean) => Promise<LoadFeedback>;
  reloadFromCloud: (userId: string) => Promise<LoadFeedback>;
  saveForUser: (userId: string) => Promise<ActionFeedback>;
  clickMainResource: () => number;
  tick: (deltaSeconds: number) => void;
  buyBuilding: (buildingId: BuildingId) => ActionFeedback;
  buyUpgrade: (upgradeId: UpgradeId) => ActionFeedback;
  buyRebirthUpgrade: (upgradeId: RebirthUpgradeId) => ActionFeedback;
  grantResource: (amount: number, source?: 'manual' | 'passive' | 'system') => ActionFeedback;
  spendResource: (amount: number) => ActionFeedback;
  performRebirth: () => ActionFeedback;
  previewRebirthReward: () => number;
  setSetting: <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => void;
  setItemPassiveBonuses: (bonuses?: Partial<ItemPassiveBonuses>) => void;
  acknowledgeOfflineReward: () => void;
  consumeAchievementQueue: () => AchievementId[];
  resetCurrentRun: () => void;
  resetAllLocalProgress: () => void;
  clearError: () => void;
}

function formatGameError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  return 'Falha inesperada ao processar sua solicitacao.';
}

function applyDerived(progress: GameProgress, itemBonuses: ItemPassiveBonuses) {
  const derived = calculateDerivedProgress({
    buildings: progress.buildings,
    purchasedUpgrades: progress.upgrades,
    rebirthUpgrades: progress.rebirthUpgrades,
    rebirthCount: progress.rebirthCount,
    itemBonuses,
  });

  return {
    progress: {
      ...progress,
      clickPower: roundToGamePrecision(derived.clickPower),
      passiveIncome: roundToGamePrecision(derived.passiveIncome),
      globalMultiplier: roundToGamePrecision(derived.globalMultiplier),
      permanentMultipliers: {
        click: roundToGamePrecision(derived.permanentMultipliers.click),
        passive: roundToGamePrecision(derived.permanentMultipliers.passive),
        global: roundToGamePrecision(derived.permanentMultipliers.global),
      },
    },
    critChance: derived.critChance,
  };
}

function unlockAchievements(progress: GameProgress): { progress: GameProgress; newlyUnlocked: AchievementId[] } {
  const newlyUnlocked = collectUnlockedAchievements({
    unlocked: progress.achievements,
    stats: progress.stats,
    totalResourceEarned: progress.totalResourceEarned,
    rebirthCount: progress.rebirthCount,
    passiveIncome: progress.passiveIncome,
    buildings: progress.buildings,
    upgrades: progress.upgrades,
  });

  if (!newlyUnlocked.length) {
    return {
      progress,
      newlyUnlocked: [],
    };
  }

  return {
    progress: {
      ...progress,
      achievements: [...progress.achievements, ...newlyUnlocked],
    },
    newlyUnlocked,
  };
}

function createRunReset(progress: GameProgress): GameProgress {
  return createInitialProgress({
    rebirthCount: progress.rebirthCount,
    rebirthCurrency: progress.rebirthCurrency,
    crownDiamonds: progress.crownDiamonds,
    rebirthUpgrades: { ...progress.rebirthUpgrades },
    achievements: [...progress.achievements],
    totalResourceEarned: progress.totalResourceEarned,
    stats: {
      ...progress.stats,
      currentRunEarned: 0,
    },
    settings: { ...progress.settings },
  });
}

export const useGameStore = create<GameStore>((set, get) => ({
  progress: createInitialProgress(),
  itemPassiveBonuses: { ...defaultItemPassiveBonuses },
  critChance: 0,
  isLoading: false,
  isLoaded: false,
  isSaving: false,
  loadedUserId: null,
  error: null,
  offlineReward: 0,
  pendingAchievementIds: [],

  loadForUser: async (userId, force = false, applyOfflineReward = true) => {
    const current = get();
    if (!force && current.isLoaded && current.loadedUserId === userId) {
      return {
        ok: true,
        message: 'Progresso ja carregado.',
      };
    }

    set({ isLoading: true, error: null });

    try {
      const existingSettings = get().progress.settings;
      const saveRow = await ensureGameSave(userId, existingSettings);
      const rebirthRows = await getRebirthUpgrades(userId);

      let progress = mapDatabaseToProgress(saveRow, rebirthRows, existingSettings);
      const initialDerived = applyDerived(progress, get().itemPassiveBonuses);
      progress = initialDerived.progress;

      const secondsOffline = applyOfflineReward ? calculateSecondsOffline(progress.lastSaveAt) : 0;
      const offlineGain = applyOfflineReward
        ? calculateOfflineGain(
            progress.passiveIncome,
            secondsOffline,
            get().itemPassiveBonuses.offlineIncomeBonus,
          )
        : 0;

      if (offlineGain > 0) {
        progress = {
          ...progress,
          resourceAmount: progress.resourceAmount + offlineGain,
          totalResourceEarned: progress.totalResourceEarned + offlineGain,
          stats: {
            ...progress.stats,
            totalPassiveEarned: progress.stats.totalPassiveEarned + offlineGain,
            currentRunEarned: progress.stats.currentRunEarned + offlineGain,
          },
        };
      }

      const unlockedResult = unlockAchievements(progress);
      const pendingQueue = [...get().pendingAchievementIds, ...unlockedResult.newlyUnlocked];

      const derivedResult = applyDerived(unlockedResult.progress, get().itemPassiveBonuses);

      set({
        progress: derivedResult.progress,
        critChance: derivedResult.critChance,
        isLoading: false,
        isLoaded: true,
        loadedUserId: userId,
        offlineReward: offlineGain,
        pendingAchievementIds: pendingQueue,
      });

      return {
        ok: true,
        message: 'Progresso carregado com sucesso.',
      };
    } catch (error) {
      const message = formatGameError(error);
      set({
        isLoading: false,
        isLoaded: false,
        error: message,
      });

      return {
        ok: false,
        message,
      };
    }
  },

  reloadFromCloud: async (userId) => get().loadForUser(userId, true, false),

  saveForUser: async (userId) => {
    set({ isSaving: true, error: null });

    try {
      const currentProgress = get().progress;
      const saved = await saveGame(userId, currentProgress);
      await saveRebirthUpgrades(userId, currentProgress.rebirthUpgrades);

      set((state) => ({
        isSaving: false,
        progress: {
          ...state.progress,
          lastSaveAt: saved.last_save_at,
        },
      }));

      return {
        ok: true,
        message: 'Progresso salvo na nuvem.',
      };
    } catch (error) {
      const message = formatGameError(error);
      set({
        isSaving: false,
        error: message,
      });

      return {
        ok: false,
        message,
      };
    }
  },

  clickMainResource: () => {
    const baseGain = get().progress.clickPower;
    const isCritical = Math.random() < get().critChance;
    const gain = isCritical ? baseGain * 2 : baseGain;

    set((state) => {
      let progress: GameProgress = {
        ...state.progress,
        resourceAmount: state.progress.resourceAmount + gain,
        totalResourceEarned: state.progress.totalResourceEarned + gain,
        stats: {
          ...state.progress.stats,
          totalClicks: state.progress.stats.totalClicks + 1,
          totalManualEarned: state.progress.stats.totalManualEarned + gain,
          currentRunEarned: state.progress.stats.currentRunEarned + gain,
        },
      };

      const unlockedResult = unlockAchievements(progress);
      progress = unlockedResult.progress;

      return {
        progress,
        pendingAchievementIds: [...state.pendingAchievementIds, ...unlockedResult.newlyUnlocked],
      };
    });

    return gain;
  },

  tick: (deltaSeconds) => {
    if (deltaSeconds <= 0) {
      return;
    }

    set((state) => {
      const passiveGain = state.progress.passiveIncome * deltaSeconds;

      let progress: GameProgress = {
        ...state.progress,
        resourceAmount: state.progress.resourceAmount + passiveGain,
        totalResourceEarned: state.progress.totalResourceEarned + passiveGain,
        stats: {
          ...state.progress.stats,
          totalPassiveEarned: state.progress.stats.totalPassiveEarned + passiveGain,
          currentRunEarned: state.progress.stats.currentRunEarned + passiveGain,
          playTimeSeconds: state.progress.stats.playTimeSeconds + deltaSeconds,
        },
      };

      const unlockedResult = unlockAchievements(progress);
      progress = unlockedResult.progress;

      return {
        progress,
        pendingAchievementIds: [...state.pendingAchievementIds, ...unlockedResult.newlyUnlocked],
      };
    });
  },

  buyBuilding: (buildingId) => {
    const building = BUILDINGS.find((entry) => entry.id === buildingId);

    if (!building) {
      return {
        ok: false,
        message: 'Construcao nao encontrada.',
      };
    }

    const state = get();
    const currentOwned = state.progress.buildings[buildingId] ?? 0;
    const cost = calculateEffectiveBuildingCost(
      building.baseCost,
      currentOwned,
      building.costGrowth,
      state.itemPassiveBonuses.buildingDiscount,
    );

    if (!isBuildingUnlocked(state.progress.totalResourceEarned, building.unlockAtTotalEarned)) {
      return {
        ok: false,
        message: `Desbloqueia em ${building.unlockAtTotalEarned.toLocaleString('pt-BR')} recursos totais.`,
      };
    }

    if (state.progress.resourceAmount < cost) {
      return {
        ok: false,
        message: 'Recursos insuficientes para esta construcao.',
      };
    }

    set((currentState) => {
      const owned = currentState.progress.buildings[buildingId] ?? 0;
      const effectiveCost = calculateEffectiveBuildingCost(
        building.baseCost,
        owned,
        building.costGrowth,
        currentState.itemPassiveBonuses.buildingDiscount,
      );

      if (currentState.progress.resourceAmount < effectiveCost) {
        return {};
      }

      const nextBuildings = {
        ...currentState.progress.buildings,
        [buildingId]: owned + 1,
      };

      let progress: GameProgress = {
        ...currentState.progress,
        resourceAmount: currentState.progress.resourceAmount - effectiveCost,
        buildings: nextBuildings,
        stats: {
          ...currentState.progress.stats,
          buildingsPurchased: currentState.progress.stats.buildingsPurchased + 1,
        },
      };

      const derived = applyDerived(progress, currentState.itemPassiveBonuses);
      progress = derived.progress;

      const unlockedResult = unlockAchievements(progress);
      progress = unlockedResult.progress;

      return {
        progress,
        critChance: derived.critChance,
        pendingAchievementIds: [...currentState.pendingAchievementIds, ...unlockedResult.newlyUnlocked],
      };
    });

    return {
      ok: true,
      message: `${building.name} construida com sucesso.`,
    };
  },

  buyUpgrade: (upgradeId) => {
    const upgrade = UPGRADES.find((entry) => entry.id === upgradeId);

    if (!upgrade) {
      return {
        ok: false,
        message: 'Upgrade nao encontrado.',
      };
    }

    const state = get();

    if (
      !isUpgradeUnlocked(
        upgradeId,
        state.progress.totalResourceEarned,
        state.progress.buildings,
        state.progress.upgrades,
      )
    ) {
      return {
        ok: false,
        message: 'Este upgrade ainda nao foi desbloqueado.',
      };
    }

    if (state.progress.resourceAmount < upgrade.cost) {
      return {
        ok: false,
        message: 'Recursos insuficientes para comprar este upgrade.',
      };
    }

    set((currentState) => {
      let progress: GameProgress = {
        ...currentState.progress,
        resourceAmount: currentState.progress.resourceAmount - upgrade.cost,
        upgrades: [...currentState.progress.upgrades, upgradeId],
        stats: {
          ...currentState.progress.stats,
          upgradesPurchased: currentState.progress.stats.upgradesPurchased + 1,
        },
      };

      const derived = applyDerived(progress, currentState.itemPassiveBonuses);
      progress = derived.progress;

      const unlockedResult = unlockAchievements(progress);
      progress = unlockedResult.progress;

      return {
        progress,
        critChance: derived.critChance,
        pendingAchievementIds: [...currentState.pendingAchievementIds, ...unlockedResult.newlyUnlocked],
      };
    });

    return {
      ok: true,
      message: `${upgrade.name} adquirido.`,
    };
  },

  buyRebirthUpgrade: (upgradeId) => {
    const upgrade = REBIRTH_UPGRADES.find((entry) => entry.id === upgradeId);

    if (!upgrade) {
      return {
        ok: false,
        message: 'Bonus de Nova Era nao encontrado.',
      };
    }

    const state = get();
    const currentLevel = state.progress.rebirthUpgrades[upgradeId] ?? 0;

    if (currentLevel >= upgrade.maxLevel) {
      return {
        ok: false,
        message: 'Este bonus ja esta no nivel maximo.',
      };
    }

    const cost = calculateRebirthUpgradeCost(upgrade.costBase, currentLevel, upgrade.costGrowth);

    if (state.progress.rebirthCurrency < cost) {
      return {
        ok: false,
        message: 'Selos da Aurora insuficientes.',
      };
    }

    set((currentState) => {
      const nextLevels = {
        ...currentState.progress.rebirthUpgrades,
        [upgradeId]: currentLevel + 1,
      };

      let progress: GameProgress = {
        ...currentState.progress,
        rebirthCurrency: currentState.progress.rebirthCurrency - cost,
        rebirthUpgrades: nextLevels,
      };

      const derived = applyDerived(progress, currentState.itemPassiveBonuses);
      progress = derived.progress;

      return {
        progress,
        critChance: derived.critChance,
      };
    });

    return {
      ok: true,
      message: `${upgrade.name} melhorado para nivel ${currentLevel + 1}.`,
    };
  },

  grantResource: (amount, source = 'system') => {
    const gain = roundToGamePrecision(amount);
    if (gain <= 0) {
      return {
        ok: false,
        message: 'Quantidade invalida para adicionar recursos.',
      };
    }

    set((state) => {
      let progress: GameProgress = {
        ...state.progress,
        resourceAmount: state.progress.resourceAmount + gain,
        totalResourceEarned: state.progress.totalResourceEarned + gain,
        stats: {
          ...state.progress.stats,
          totalManualEarned:
            source === 'manual' ? state.progress.stats.totalManualEarned + gain : state.progress.stats.totalManualEarned,
          totalPassiveEarned:
            source === 'passive' ? state.progress.stats.totalPassiveEarned + gain : state.progress.stats.totalPassiveEarned,
          currentRunEarned: state.progress.stats.currentRunEarned + gain,
        },
      };

      const unlockedResult = unlockAchievements(progress);
      progress = unlockedResult.progress;

      return {
        progress,
        pendingAchievementIds: [...state.pendingAchievementIds, ...unlockedResult.newlyUnlocked],
      };
    });

    return {
      ok: true,
      message: 'Recursos adicionados com sucesso.',
    };
  },

  spendResource: (amount) => {
    const cost = roundToGamePrecision(amount);
    if (cost <= 0) {
      return {
        ok: false,
        message: 'Quantidade invalida para gasto.',
      };
    }

    if (get().progress.resourceAmount < cost) {
      return {
        ok: false,
        message: 'Ouro insuficiente.',
      };
    }

    set((state) => ({
      progress: {
        ...state.progress,
        resourceAmount: state.progress.resourceAmount - cost,
      },
    }));

    return {
      ok: true,
      message: 'Gasto aplicado.',
    };
  },

  performRebirth: () => {
    const state = get();
    const reward = calculateRebirthReward(
      state.progress.stats.currentRunEarned,
      state.progress.rebirthCount,
      state.itemPassiveBonuses.rebirthRewardBonus,
    );

    if (reward <= 0) {
      return {
        ok: false,
        message: 'Voce precisa acumular mais recursos nesta run para iniciar uma Nova Era.',
      };
    }

    set((currentState) => {
      let progress: GameProgress = {
        ...createRunReset(currentState.progress),
        rebirthCount: currentState.progress.rebirthCount + 1,
        rebirthCurrency: currentState.progress.rebirthCurrency + reward,
        stats: {
          ...currentState.progress.stats,
          currentRunEarned: 0,
        },
      };

      const derived = applyDerived(progress, currentState.itemPassiveBonuses);
      progress = derived.progress;

      const unlockedResult = unlockAchievements(progress);
      progress = unlockedResult.progress;

      return {
        progress,
        critChance: derived.critChance,
        offlineReward: 0,
        pendingAchievementIds: [...currentState.pendingAchievementIds, ...unlockedResult.newlyUnlocked],
      };
    });

    return {
      ok: true,
      message: `Nova Era iniciada. Voce recebeu ${reward.toLocaleString('pt-BR')} Selos da Aurora.`,
    };
  },

  previewRebirthReward: () => {
    const progress = get().progress;
    return calculateRebirthReward(
      progress.stats.currentRunEarned,
      progress.rebirthCount,
      get().itemPassiveBonuses.rebirthRewardBonus,
    );
  },

  setSetting: (key, value) => {
    set((state) => ({
      progress: {
        ...state.progress,
        settings: {
          ...state.progress.settings,
          [key]: value,
        },
      },
    }));
  },

  setItemPassiveBonuses: (bonuses) => {
    set((state) => {
      const normalized = normalizeItemBonuses(bonuses ?? defaultItemPassiveBonuses);
      const derived = applyDerived(state.progress, normalized);

      return {
        itemPassiveBonuses: normalized,
        progress: derived.progress,
        critChance: derived.critChance,
      };
    });
  },

  acknowledgeOfflineReward: () => {
    set({ offlineReward: 0 });
  },

  consumeAchievementQueue: () => {
    const queue = [...get().pendingAchievementIds];
    if (queue.length === 0) {
      return [];
    }

    set({ pendingAchievementIds: [] });
    return queue;
  },

  resetCurrentRun: () => {
    set((state) => {
      const derived = applyDerived(createRunReset(state.progress), state.itemPassiveBonuses);
      return {
        progress: derived.progress,
        critChance: derived.critChance,
        offlineReward: 0,
        error: null,
      };
    });
  },

  resetAllLocalProgress: () => {
    set((state) => {
      const derived = applyDerived(
        createInitialProgress({
          settings: { ...state.progress.settings },
          buildings: createEmptyBuildings(),
        }),
        state.itemPassiveBonuses,
      );

      return {
        progress: derived.progress,
        critChance: derived.critChance,
        offlineReward: 0,
        pendingAchievementIds: [],
        error: null,
      };
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));

export function getAchievementById(id: AchievementId) {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id);
}
