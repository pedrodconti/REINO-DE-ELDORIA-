import type { ItemPassiveBonuses } from '@/types/game';
import type { ItemDefinitionRecord, UserItemRecord } from '@/types/systems';
import { defaultItemPassiveBonuses } from '@/utils/gameDefaults';

export function aggregateItemPassiveBonuses(items: UserItemRecord[]): ItemPassiveBonuses {
  const equipped = items.filter((item) => item.isEquipped);

  return equipped.reduce<ItemPassiveBonuses>((acc, item) => {
    applyPassive(acc, item.definition, item.quantity);
    return acc;
  }, { ...defaultItemPassiveBonuses });
}

function applyPassive(target: ItemPassiveBonuses, definition: ItemDefinitionRecord, quantity: number) {
  const totalValue = definition.passiveValue * Math.max(1, quantity);

  switch (definition.passiveType) {
    case 'click_flat':
      target.clickFlat += totalValue;
      break;
    case 'passive_flat':
      target.passiveFlat += totalValue;
      break;
    case 'global_multiplier':
      target.globalMultiplierBonus += totalValue;
      break;
    case 'click_crit_chance':
      target.clickCritChance += totalValue;
      break;
    case 'building_discount':
      target.buildingDiscount += totalValue;
      break;
    case 'rebirth_bonus':
      target.rebirthRewardBonus += totalValue;
      break;
    case 'item_drop_bonus':
      target.itemDropBonus += totalValue;
      break;
    case 'offline_bonus':
      target.offlineIncomeBonus += totalValue;
      break;
    case 'rare_box_spawn_bonus':
      target.rareBoxSpawnBonus += totalValue;
      break;
    case 'box_cooldown_reduction':
      target.boxCooldownReduction += totalValue;
      break;
    default:
      break;
  }
}

export function formatPassiveEffect(definition: ItemDefinitionRecord): string {
  const valueText = definition.passiveValue >= 1
    ? `+${definition.passiveValue.toLocaleString('pt-BR')}`
    : `+${(definition.passiveValue * 100).toFixed(1)}%`;

  switch (definition.passiveType) {
    case 'click_flat':
      return `${valueText} recurso por clique`;
    case 'passive_flat':
      return `${valueText} recurso passivo por segundo`;
    case 'global_multiplier':
      return `${valueText} multiplicador global`;
    case 'click_crit_chance':
      return `${valueText} chance de critico no clique`;
    case 'building_discount':
      return `${valueText} desconto em construcoes`;
    case 'rebirth_bonus':
      return `${valueText} bonus de recompensa de rebirth`;
    case 'item_drop_bonus':
      return `${valueText} bonus de drop de itens`;
    case 'offline_bonus':
      return `${valueText} bonus de recurso offline`;
    case 'rare_box_spawn_bonus':
      return `${valueText} chance de caixa rara aparecer`;
    case 'box_cooldown_reduction':
      return `${valueText} reducao de cooldown de caixas`;
    default:
      return 'Efeito passivo desconhecido';
  }
}
