import type { GatheringAreaKey, MerchantBuffType, ToolType } from '@/types/gathering';

export interface AreaDropRule {
  materialKey: string;
  chance: number;
  minToolTier: number;
}

export interface GatheringAreaDefinition {
  id: GatheringAreaKey;
  name: string;
  description: string;
  commonMaterialKey: string;
  toolType: ToolType;
  commonDropMin: number;
  commonDropMax: number;
  rareDropRules: AreaDropRule[];
}

export const GATHERING_AREAS: GatheringAreaDefinition[] = [
  {
    id: 'floresta',
    name: 'Floresta de Avel',
    description: 'Bosque antigo rico em madeira e resinas raras.',
    commonMaterialKey: 'madeira',
    toolType: 'machado',
    commonDropMin: 1,
    commonDropMax: 3,
    rareDropRules: [
      { materialKey: 'madeira_antiga', chance: 0.08, minToolTier: 1 },
      { materialKey: 'madeira_encantada', chance: 0.035, minToolTier: 2 },
      { materialKey: 'madeira_mistica', chance: 0.012, minToolTier: 4 },
    ],
  },
  {
    id: 'ravina',
    name: 'Ravina de Ferro-Bruma',
    description: 'Penhasco mineral com veios pesados e fragmentos arcanos.',
    commonMaterialKey: 'pedra',
    toolType: 'picareta',
    commonDropMin: 1,
    commonDropMax: 3,
    rareDropRules: [
      { materialKey: 'ferro_bruto', chance: 0.07, minToolTier: 1 },
      { materialKey: 'cristal', chance: 0.03, minToolTier: 2 },
      { materialKey: 'obsidiana', chance: 0.015, minToolTier: 4 },
      { materialKey: 'minerio_arcano', chance: 0.008, minToolTier: 5 },
    ],
  },
];

export const BASE_TOOL_UPGRADE_COST = {
  gold: 150,
  wood: 40,
  stone: 40,
};

export const MERCHANT_BUFF_POOL: Array<{
  type: MerchantBuffType;
  value: number;
  durationMinutes: number;
  weight: number;
}> = [
  { type: 'collection_luck', value: 0.08, durationMinutes: 10, weight: 45 },
  { type: 'collection_yield', value: 0.12, durationMinutes: 10, weight: 35 },
  { type: 'gold_bonus', value: 0.1, durationMinutes: 10, weight: 20 },
];

export const BASE_BUILDING_LIMIT = 10;

