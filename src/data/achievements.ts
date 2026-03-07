import type { AchievementDefinition } from '@/types/game';

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first_click',
    name: 'Primeiro Juramento',
    description: 'Realize seu primeiro clique em Fragmentos de Eter.',
    condition: 'total_clicks',
    target: 1,
  },
  {
    id: 'hundred_clicks',
    name: 'Mao Incansavel',
    description: 'Acumule 100 cliques manuais.',
    condition: 'total_clicks',
    target: 100,
  },
  {
    id: 'first_building',
    name: 'Pedra Fundamental',
    description: 'Compre sua primeira construcao.',
    condition: 'total_buildings',
    target: 1,
  },
  {
    id: 'ten_buildings',
    name: 'Vila em Crescimento',
    description: 'Tenha 10 construcoes ao mesmo tempo.',
    condition: 'total_buildings',
    target: 10,
  },
  {
    id: 'first_upgrade',
    name: 'Engenho Real',
    description: 'Compre seu primeiro upgrade.',
    condition: 'total_upgrades',
    target: 1,
  },
  {
    id: 'thousand_essence',
    name: 'Tesouro Inicial',
    description: 'Acumule 1.000 Fragmentos de Eter no total.',
    condition: 'total_resource',
    target: 1000,
  },
  {
    id: 'first_rebirth',
    name: 'Primeira Nova Era',
    description: 'Realize seu primeiro reset de prestigo.',
    condition: 'rebirth_count',
    target: 1,
  },
  {
    id: 'realm_expander',
    name: 'Engenheiro do Reino',
    description: 'Tenha 50 construcoes ativas.',
    condition: 'total_buildings',
    target: 50,
  },
  {
    id: 'arcane_magnate',
    name: 'Magnata Arcano',
    description: 'Acumule 1.000.000 de Fragmentos de Eter no total.',
    condition: 'total_resource',
    target: 1000000,
  },
  {
    id: 'passive_master',
    name: 'Mestre da Colheita',
    description: 'Alcance 1.000 Fragmentos de Eter por segundo.',
    condition: 'passive_income',
    target: 1000,
  },
];
