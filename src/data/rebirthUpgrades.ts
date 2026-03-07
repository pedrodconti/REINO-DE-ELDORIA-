import type { RebirthUpgradeDefinition } from '@/types/game';

export const REBIRTH_UPGRADES: RebirthUpgradeDefinition[] = [
  {
    id: 'decree_of_hands',
    name: 'Decreto das Maos',
    flavor: 'Aumenta permanentemente o poder de clique.',
    type: 'click',
    costBase: 3,
    costGrowth: 1.85,
    valuePerLevel: 0.12,
    maxLevel: 25,
  },
  {
    id: 'decree_of_harvest',
    name: 'Decreto da Colheita',
    flavor: 'Aumenta permanentemente a producao passiva.',
    type: 'passive',
    costBase: 3,
    costGrowth: 1.85,
    valuePerLevel: 0.12,
    maxLevel: 25,
  },
  {
    id: 'decree_of_crown',
    name: 'Decreto da Coroa',
    flavor: 'Aumenta permanentemente o multiplicador global.',
    type: 'global',
    costBase: 5,
    costGrowth: 2,
    valuePerLevel: 0.06,
    maxLevel: 20,
  },
];
