import { BASE_TOOL_UPGRADE_COST, GATHERING_AREAS, MERCHANT_BUFF_POOL } from '@/data/gathering';
import type {
  GatherActionResult,
  GatherDropResult,
  GatheringAreaKey,
  MerchantBuffRecord,
  MerchantBuffType,
  ToolWithState,
  ToolUpgradeStat,
} from '@/types/gathering';
import type { UserItemRecord } from '@/types/systems';

const BASE_COLLECTION_COOLDOWN_MS = 2200;
const MIN_COLLECTION_COOLDOWN_MS = 250;

function randomBetween(min: number, max: number): number {
  if (max <= min) {
    return min;
  }

  return min + Math.floor(Math.random() * (max - min + 1));
}

export function rollGatherDrops(params: {
  areaKey: GatheringAreaKey;
  tool: ToolWithState;
  materialNameMap: Map<string, string>;
  merchantBuff: MerchantBuffRecord | null;
}): GatherActionResult {
  const area = GATHERING_AREAS.find((entry) => entry.id === params.areaKey);
  if (!area) {
    return { areaKey: params.areaKey, drops: [] };
  }

  const yieldBonus = params.tool.definition.baseYield + params.tool.upgrades.yieldLevel * 0.15;
  const luckBonus = params.tool.definition.baseLuck + params.tool.upgrades.luckLevel * 0.01;
  const speedBonus = params.tool.definition.baseSpeed + params.tool.upgrades.speedLevel * 0.04;
  const duplicateChance = params.tool.definition.baseDuplicateChance + params.tool.upgrades.duplicateLevel * 0.01;
  const rareDropBonus = params.tool.definition.baseRareDropChance + params.tool.upgrades.rareDropLevel * 0.01;

  const buffYield = params.merchantBuff?.buffType === 'collection_yield' ? params.merchantBuff.buffValue : 0;
  const buffLuck = params.merchantBuff?.buffType === 'collection_luck' ? params.merchantBuff.buffValue : 0;

  const commonBase = randomBetween(area.commonDropMin, area.commonDropMax);
  const commonAmount = Math.max(1, Math.floor(commonBase * (1 + yieldBonus + buffYield + speedBonus * 0.2)));

  const drops: GatherDropResult[] = [
    {
      materialKey: area.commonMaterialKey,
      materialName: params.materialNameMap.get(area.commonMaterialKey) ?? area.commonMaterialKey,
      amount: commonAmount,
      rarity: 'comum',
    },
  ];

  area.rareDropRules.forEach((rule) => {
    if (params.tool.definition.tier < rule.minToolTier) {
      return;
    }

    const chance = Math.min(0.85, rule.chance + luckBonus + buffLuck + rareDropBonus);
    if (Math.random() > chance) {
      return;
    }

    let amount = 1;
    if (Math.random() < duplicateChance) {
      amount += 1;
    }

    drops.push({
      materialKey: rule.materialKey,
      materialName: params.materialNameMap.get(rule.materialKey) ?? rule.materialKey,
      amount,
      rarity: 'raro',
    });
  });

  return {
    areaKey: params.areaKey,
    drops,
  };
}

export function calculateToolCollectionCooldownMs(tool: ToolWithState): number {
  const tierReduction = Math.max(0, tool.definition.tier - 1) * 0.12;
  const speedReduction = tool.upgrades.speedLevel * 0.05;
  const baseSpeedReduction = tool.definition.baseSpeed * 0.6;

  const totalReduction = Math.min(0.9, tierReduction + speedReduction + baseSpeedReduction);
  const rawCooldown = BASE_COLLECTION_COOLDOWN_MS * (1 - totalReduction);

  return Math.max(MIN_COLLECTION_COOLDOWN_MS, Math.floor(rawCooldown));
}

export function calculateToolUpgradeCost(level: number, stat: ToolUpgradeStat) {
  const growth = 1.16 + level * 0.01;
  const statWeight = stat === 'speed' ? 1 : stat === 'yield' ? 1.08 : stat === 'luck' ? 1.15 : stat === 'duplicate' ? 1.2 : 1.25;

  return {
    gold: Math.floor(BASE_TOOL_UPGRADE_COST.gold * growth * statWeight),
    wood: Math.floor(BASE_TOOL_UPGRADE_COST.wood * growth),
    stone: Math.floor(BASE_TOOL_UPGRADE_COST.stone * growth),
  };
}

export function calculateBuildingResourceCost(baseCost: number, growth: number, owned: number): number {
  return Math.floor(baseCost * growth ** Math.max(0, owned));
}

export function calculateAmuletBuildingLimitBonus(items: UserItemRecord[]): number {
  const rarityWeight: Record<UserItemRecord['definition']['rarity'], number> = {
    comum: 1,
    incomum: 2,
    raro: 3,
    epico: 4,
    lendario: 6,
    mitico: 8,
  };

  return items
    .filter((item) => item.definition.category === 'amuletos')
    .reduce((acc, item) => acc + rarityWeight[item.definition.rarity] * item.quantity, 0);
}

export function pickMerchantBuff(): { type: MerchantBuffType; value: number; durationMinutes: number } | null {
  const totalWeight = MERCHANT_BUFF_POOL.reduce((acc, item) => acc + item.weight, 0);
  if (totalWeight <= 0) {
    return null;
  }

  let ticket = Math.random() * totalWeight;

  for (const candidate of MERCHANT_BUFF_POOL) {
    ticket -= candidate.weight;
    if (ticket <= 0) {
      return {
        type: candidate.type,
        value: candidate.value,
        durationMinutes: candidate.durationMinutes,
      };
    }
  }

  return null;
}
