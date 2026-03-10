import { create } from 'zustand';

import { BASE_BUILDING_LIMIT, GATHERING_AREAS } from '@/data/gathering';
import {
  applyDropsToMaterialState,
  composeToolState,
  createMerchantTransaction,
  ensureStarterTools,
  loadActiveMerchantBuff,
  loadBuildingDefinitions,
  loadMaterialDefinitions,
  loadToolDefinitions,
  loadToolUpgrades,
  loadUserBuildings,
  loadUserMaterials,
  loadUserTools,
  materialMapByKey,
  materialNameMap,
  replaceActiveMerchantBuff,
  updateToolOwnership,
  upsertToolUpgrade,
  upsertUserBuilding,
  upsertUserMaterial,
  equipToolByType,
} from '@/services/gathering/gatheringService';
import type {
  GatherDropResult,
  GatheringAreaKey,
  BuildingDefinitionRecord,
  MaterialDefinitionRecord,
  MerchantBuffRecord,
  ToolUpgradeRecord,
  ToolUpgradeStat,
  ToolWithState,
} from '@/types/gathering';
import type { ActionFeedback } from '@/types/game';
import { useGameStore } from '@/store/useGameStore';
import {
  calculateBuildingResourceCost,
  calculateToolUpgradeCost,
  pickMerchantBuff,
  rollGatherDrops,
} from '@/utils/gatheringMath';

interface GatheringStore {
  materialDefinitions: MaterialDefinitionRecord[];
  toolStates: ToolWithState[];
  buildingDefinitions: BuildingDefinitionRecord[];
  materialQuantities: Record<string, number>;
  buildingOwned: Record<string, number>;
  activeMerchantBuff: MerchantBuffRecord | null;
  recentDrops: GatherDropResult[];
  isLoading: boolean;
  loadedUserId: string | null;
  error: string | null;
  loadForUser: (userId: string) => Promise<void>;
  collectInArea: (userId: string, areaKey: GatheringAreaKey) => Promise<ActionFeedback>;
  buyTool: (userId: string, toolKey: string) => Promise<ActionFeedback>;
  equipTool: (userId: string, toolKey: string) => Promise<ActionFeedback>;
  upgradeTool: (userId: string, toolKey: string, stat: ToolUpgradeStat) => Promise<ActionFeedback>;
  buyBuilding: (userId: string, buildingKey: string, rebirthCount: number, amuletLimitBonus: number) => Promise<ActionFeedback>;
  sellRareMaterial: (userId: string, materialKey: string, quantity: number) => Promise<ActionFeedback>;
  getTotalBuildingCount: () => number;
  getBuildingLimit: (amuletLimitBonus: number) => number;
  getGatheringGoldPerSecond: () => number;
  clear: () => void;
}

function toErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  return 'Falha ao processar modulo de coleta.';
}

export const useGatheringStore = create<GatheringStore>((set, get) => ({
  materialDefinitions: [],
  toolStates: [],
  buildingDefinitions: [],
  materialQuantities: {},
  buildingOwned: {},
  activeMerchantBuff: null,
  recentDrops: [],
  isLoading: false,
  loadedUserId: null,
  error: null,

  loadForUser: async (userId) => {
    set({ isLoading: true, error: null });

    try {
      const [materials, tools, buildings, userMaterials, userToolsRaw, upgradesRaw, userBuildingsRaw, activeBuff] = await Promise.all([
        loadMaterialDefinitions(),
        loadToolDefinitions(),
        loadBuildingDefinitions(),
        loadUserMaterials(userId),
        loadUserTools(userId),
        loadToolUpgrades(userId),
        loadUserBuildings(userId),
        loadActiveMerchantBuff(userId),
      ]);

      await ensureStarterTools({
        userId,
        toolDefinitions: tools,
        currentTools: userToolsRaw,
      });

      const userTools = await loadUserTools(userId);

      const toolStates = composeToolState({
        definitions: tools,
        userTools,
        upgrades: upgradesRaw,
      });

      const materialDefMap = new Map(materials.map((entry) => [entry.id, entry]));
      const materialQuantities: Record<string, number> = {};
      materials.forEach((material) => {
        materialQuantities[material.materialKey] = 0;
      });

      userMaterials.forEach((row) => {
        const definition = materialDefMap.get(row.materialDefinitionId);
        if (!definition) {
          return;
        }

        materialQuantities[definition.materialKey] = row.quantity;
      });

      const buildingDefMap = new Map(buildings.map((entry) => [entry.id, entry]));
      const buildingOwned: Record<string, number> = {};
      buildings.forEach((building) => {
        buildingOwned[building.buildingKey] = 0;
      });

      userBuildingsRaw.forEach((row) => {
        const definition = buildingDefMap.get(row.buildingDefinitionId);
        if (!definition) {
          return;
        }

        buildingOwned[definition.buildingKey] = row.ownedCount;
      });

      set({
        materialDefinitions: materials,
        toolStates,
        buildingDefinitions: buildings,
        materialQuantities,
        buildingOwned,
        activeMerchantBuff: activeBuff,
        isLoading: false,
        loadedUserId: userId,
      });
    } catch (error) {
      set({
        isLoading: false,
        loadedUserId: userId,
        error: toErrorMessage(error),
      });
    }
  },

  collectInArea: async (userId, areaKey) => {
    try {
      const state = get();
      const area = GATHERING_AREAS.find((entry) => entry.id === areaKey);
      if (!area) {
        return { ok: false, message: 'Area de coleta invalida.' };
      }

      const nowMs = Date.now();
      const activeBuff = state.activeMerchantBuff
        && new Date(state.activeMerchantBuff.expiresAt).getTime() > nowMs
        ? state.activeMerchantBuff
        : null;

      const equippedTool = state.toolStates.find((tool) => (
        tool.definition.toolType === area.toolType && tool.state.isOwned && tool.state.isEquipped
      ));

      if (!equippedTool) {
        return {
          ok: false,
          message: `Equipe um ${area.toolType === 'machado' ? 'machado' : 'picareta'} para coletar nesta area.`,
        };
      }

      const materialNames = materialNameMap(state.materialDefinitions);
      const dropResult = rollGatherDrops({
        areaKey,
        tool: equippedTool,
        materialNameMap: materialNames,
        merchantBuff: activeBuff,
      });

      if (dropResult.drops.length === 0) {
        return {
          ok: false,
          message: 'Nenhum drop obtido nesta tentativa.',
        };
      }

      const materialByKey = materialMapByKey(state.materialDefinitions);
      const nextMaterialQuantities = applyDropsToMaterialState(state.materialQuantities, dropResult.drops);

      await Promise.all(
        dropResult.drops.map(async (drop) => {
          const definition = materialByKey.get(drop.materialKey);
          if (!definition) {
            return;
          }

          await upsertUserMaterial(
            userId,
            definition.id,
            nextMaterialQuantities[drop.materialKey] ?? 0,
          );
        }),
      );

      set({
        materialQuantities: nextMaterialQuantities,
        recentDrops: dropResult.drops,
        activeMerchantBuff: activeBuff,
      });

      const summary = dropResult.drops
        .map((drop) => `+${drop.amount} ${drop.materialName}`)
        .join(', ');

      return {
        ok: true,
        message: `Coleta concluida: ${summary}.`,
      };
    } catch (error) {
      return {
        ok: false,
        message: toErrorMessage(error),
      };
    }
  },

  buyTool: async (userId, toolKey) => {
    try {
      const state = get();
      const tool = state.toolStates.find((entry) => entry.definition.toolKey === toolKey);
      if (!tool) {
        return { ok: false, message: 'Ferramenta nao encontrada.' };
      }

      if (tool.state.isOwned) {
        return { ok: false, message: 'Voce ja possui esta ferramenta.' };
      }

      if (tool.definition.isBoxOnly) {
        return { ok: false, message: 'Esta ferramenta so e obtida em caixas especiais.' };
      }

      const spendResult = useGameStore.getState().spendResource(tool.definition.buyCostGold);
      if (!spendResult.ok) {
        return { ok: false, message: spendResult.message };
      }

      await updateToolOwnership({
        userId,
        toolDefinitionId: tool.definition.id,
        owned: true,
      });

      set({
        toolStates: state.toolStates.map((entry) => {
          if (entry.definition.id !== tool.definition.id) {
            return entry;
          }

          return {
            ...entry,
            state: {
              ...entry.state,
              isOwned: true,
            },
          };
        }),
      });

      return { ok: true, message: `${tool.definition.name} comprada com sucesso.` };
    } catch (error) {
      return {
        ok: false,
        message: toErrorMessage(error),
      };
    }
  },

  equipTool: async (userId, toolKey) => {
    try {
      const state = get();
      const tool = state.toolStates.find((entry) => entry.definition.toolKey === toolKey);
      if (!tool) {
        return { ok: false, message: 'Ferramenta nao encontrada.' };
      }

      if (!tool.state.isOwned) {
        return { ok: false, message: 'Compre esta ferramenta antes de equipar.' };
      }

      const definitionMap = new Map(
        state.toolStates.map((entry) => [entry.definition.id, entry.definition]),
      );

      await equipToolByType({
        userId,
        toolType: tool.definition.toolType,
        toolDefinitionId: tool.definition.id,
        toolDefinitionMap: definitionMap,
      });

      set({
        toolStates: state.toolStates.map((entry) => ({
          ...entry,
          state: {
            ...entry.state,
            isEquipped: entry.definition.toolType === tool.definition.toolType
              ? entry.definition.id === tool.definition.id
              : entry.state.isEquipped,
          },
        })),
      });

      return { ok: true, message: `${tool.definition.name} equipada.` };
    } catch (error) {
      return {
        ok: false,
        message: toErrorMessage(error),
      };
    }
  },

  upgradeTool: async (userId, toolKey, stat) => {
    try {
      const state = get();
      const tool = state.toolStates.find((entry) => entry.definition.toolKey === toolKey);
      if (!tool) {
        return { ok: false, message: 'Ferramenta nao encontrada.' };
      }

      if (!tool.state.isOwned) {
        return { ok: false, message: 'Compre a ferramenta antes de melhorar.' };
      }

      const currentLevel = stat === 'speed'
        ? tool.upgrades.speedLevel
        : stat === 'yield'
          ? tool.upgrades.yieldLevel
          : stat === 'luck'
            ? tool.upgrades.luckLevel
            : stat === 'duplicate'
              ? tool.upgrades.duplicateLevel
              : tool.upgrades.rareDropLevel;

      const cost = calculateToolUpgradeCost(currentLevel, stat);

      const wood = state.materialQuantities.madeira ?? 0;
      const stone = state.materialQuantities.pedra ?? 0;

      if (wood < cost.wood || stone < cost.stone) {
        return {
          ok: false,
          message: 'Materiais insuficientes para este upgrade.',
        };
      }

      const spendGold = useGameStore.getState().spendResource(cost.gold);
      if (!spendGold.ok) {
        return {
          ok: false,
          message: spendGold.message,
        };
      }

      const nextUpgrade: ToolUpgradeRecord = {
        ...tool.upgrades,
        speedLevel: stat === 'speed' ? currentLevel + 1 : tool.upgrades.speedLevel,
        yieldLevel: stat === 'yield' ? currentLevel + 1 : tool.upgrades.yieldLevel,
        luckLevel: stat === 'luck' ? currentLevel + 1 : tool.upgrades.luckLevel,
        duplicateLevel: stat === 'duplicate' ? currentLevel + 1 : tool.upgrades.duplicateLevel,
        rareDropLevel: stat === 'rare_drop' ? currentLevel + 1 : tool.upgrades.rareDropLevel,
      };

      const nextMaterialQuantities = {
        ...state.materialQuantities,
        madeira: wood - cost.wood,
        pedra: stone - cost.stone,
      };

      const materialByKey = materialMapByKey(state.materialDefinitions);
      const woodDef = materialByKey.get('madeira');
      const stoneDef = materialByKey.get('pedra');

      await upsertToolUpgrade({
        userId,
        toolDefinitionId: tool.definition.id,
        next: nextUpgrade,
      });

      if (woodDef) {
        await upsertUserMaterial(userId, woodDef.id, nextMaterialQuantities.madeira);
      }

      if (stoneDef) {
        await upsertUserMaterial(userId, stoneDef.id, nextMaterialQuantities.pedra);
      }

      set({
        materialQuantities: nextMaterialQuantities,
        toolStates: state.toolStates.map((entry) => {
          if (entry.definition.id !== tool.definition.id) {
            return entry;
          }

          return {
            ...entry,
            upgrades: nextUpgrade,
          };
        }),
      });

      return {
        ok: true,
        message: `Upgrade aplicado em ${tool.definition.name}.`,
      };
    } catch (error) {
      return {
        ok: false,
        message: toErrorMessage(error),
      };
    }
  },

  buyBuilding: async (userId, buildingKey, rebirthCount, amuletLimitBonus) => {
    try {
      const state = get();
      const building = state.buildingDefinitions.find((entry) => entry.buildingKey === buildingKey);
      if (!building) {
        return { ok: false, message: 'Construcao nao encontrada.' };
      }

      if (rebirthCount < building.unlockRebirthRequired) {
        const missing = building.unlockRebirthRequired - rebirthCount;
        return {
          ok: false,
          message: `Faltam ${missing.toLocaleString('pt-BR')} rebirth(s) para desbloquear.`,
        };
      }

      const totalOwned = Object.values(state.buildingOwned).reduce((acc, value) => acc + value, 0);
      const limit = BASE_BUILDING_LIMIT + Math.max(0, amuletLimitBonus);

      if (totalOwned >= limit) {
        return {
          ok: false,
          message: 'Limite de construcoes atingido. Equipe amuletos para aumentar o limite.',
        };
      }

      const owned = state.buildingOwned[building.buildingKey] ?? 0;
      const goldCost = calculateBuildingResourceCost(building.baseGoldCost, building.goldGrowth, owned);
      const woodCost = calculateBuildingResourceCost(building.baseWoodCost, building.woodGrowth, owned);
      const stoneCost = calculateBuildingResourceCost(building.baseStoneCost, building.stoneGrowth, owned);

      const wood = state.materialQuantities.madeira ?? 0;
      const stone = state.materialQuantities.pedra ?? 0;

      if (wood < woodCost || stone < stoneCost) {
        return {
          ok: false,
          message: 'Madeira ou pedra insuficiente para construir.',
        };
      }

      const spendGold = useGameStore.getState().spendResource(goldCost);
      if (!spendGold.ok) {
        return {
          ok: false,
          message: spendGold.message,
        };
      }

      const nextOwned = owned + 1;
      const nextMaterials = {
        ...state.materialQuantities,
        madeira: wood - woodCost,
        pedra: stone - stoneCost,
      };

      const materialByKey = materialMapByKey(state.materialDefinitions);
      const woodDef = materialByKey.get('madeira');
      const stoneDef = materialByKey.get('pedra');

      await upsertUserBuilding({
        userId,
        buildingDefinitionId: building.id,
        ownedCount: nextOwned,
      });

      if (woodDef) {
        await upsertUserMaterial(userId, woodDef.id, nextMaterials.madeira);
      }

      if (stoneDef) {
        await upsertUserMaterial(userId, stoneDef.id, nextMaterials.pedra);
      }

      set({
        materialQuantities: nextMaterials,
        buildingOwned: {
          ...state.buildingOwned,
          [building.buildingKey]: nextOwned,
        },
      });

      return {
        ok: true,
        message: `${building.name} construida com sucesso.`,
      };
    } catch (error) {
      return {
        ok: false,
        message: toErrorMessage(error),
      };
    }
  },

  sellRareMaterial: async (userId, materialKey, quantity) => {
    try {
      const state = get();
      const definition = state.materialDefinitions.find((entry) => entry.materialKey === materialKey);
      if (!definition) {
        return { ok: false, message: 'Material nao encontrado.' };
      }

      if (definition.isBuildingMaterial) {
        return { ok: false, message: 'Materiais comuns nao sao comprados pelo comerciante.' };
      }

      const qty = Math.max(0, Math.floor(quantity));
      if (qty <= 0) {
        return { ok: false, message: 'Quantidade invalida para venda.' };
      }

      const currentQty = state.materialQuantities[materialKey] ?? 0;
      if (currentQty < qty) {
        return { ok: false, message: 'Quantidade insuficiente para vender.' };
      }

      const now = Date.now();
      const buff = state.activeMerchantBuff && new Date(state.activeMerchantBuff.expiresAt).getTime() > now
        ? state.activeMerchantBuff
        : null;

      const goldBonus = buff?.buffType === 'gold_bonus' ? buff.buffValue : 0;
      const goldEarned = Math.floor(definition.baseSellValue * qty * (1 + goldBonus));

      const nextQty = currentQty - qty;
      await upsertUserMaterial(userId, definition.id, nextQty);

      const rolledBuff = Math.random() < 0.45 ? pickMerchantBuff() : null;
      let activeBuff = buff;

      if (rolledBuff) {
        const expiresAt = new Date(Date.now() + rolledBuff.durationMinutes * 60_000).toISOString();
        await replaceActiveMerchantBuff({
          userId,
          buffType: rolledBuff.type,
          buffValue: rolledBuff.value,
          expiresAt,
        });

        activeBuff = {
          id: '',
          userId,
          buffType: rolledBuff.type,
          buffValue: rolledBuff.value,
          expiresAt,
          createdAt: new Date().toISOString(),
        };
      }

      await createMerchantTransaction({
        userId,
        materialDefinitionId: definition.id,
        quantity: qty,
        goldEarned,
        bonusType: rolledBuff?.type ?? null,
        bonusValue: rolledBuff?.value ?? 0,
      });

      useGameStore.getState().grantResource(goldEarned, 'system');

      set({
        materialQuantities: {
          ...state.materialQuantities,
          [materialKey]: nextQty,
        },
        activeMerchantBuff: activeBuff,
      });

      const buffMessage = rolledBuff
        ? ` Buff temporario ativo: ${rolledBuff.type} (+${Math.round(rolledBuff.value * 100)}%).`
        : '';

      return {
        ok: true,
        message: `Venda concluida. +${goldEarned.toLocaleString('pt-BR')} ouro.${buffMessage}`,
      };
    } catch (error) {
      return {
        ok: false,
        message: toErrorMessage(error),
      };
    }
  },

  getTotalBuildingCount: () => Object.values(get().buildingOwned).reduce((acc, value) => acc + value, 0),

  getBuildingLimit: (amuletLimitBonus) => BASE_BUILDING_LIMIT + Math.max(0, amuletLimitBonus),

  getGatheringGoldPerSecond: () => {
    const state = get();
    const total = state.buildingDefinitions.reduce((acc, building) => {
      const owned = state.buildingOwned[building.buildingKey] ?? 0;
      return acc + building.goldPerSecond * owned;
    }, 0);

    return Math.max(0, total);
  },

  clear: () => {
    set({
      materialDefinitions: [],
      toolStates: [],
      buildingDefinitions: [],
      materialQuantities: {},
      buildingOwned: {},
      activeMerchantBuff: null,
      recentDrops: [],
      isLoading: false,
      loadedUserId: null,
      error: null,
    });
  },
}));
