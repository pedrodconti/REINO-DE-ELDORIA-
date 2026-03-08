import type { ItemCategory, ItemRarity } from '@/types/systems';

export const ITEM_RARITY_ORDER: ItemRarity[] = ['comum', 'incomum', 'raro', 'epico', 'lendario', 'mitico'];

export const ITEM_RARITY_LABELS: Record<ItemRarity, string> = {
  comum: 'Comum',
  incomum: 'Incomum',
  raro: 'Raro',
  epico: 'Epico',
  lendario: 'Lendario',
  mitico: 'Mitico',
};

export const ITEM_RARITY_STYLES: Record<ItemRarity, string> = {
  comum: 'border-slate-500/45 bg-slate-500/10 text-slate-200',
  incomum: 'border-emerald-500/45 bg-emerald-500/10 text-emerald-200',
  raro: 'border-sky-500/45 bg-sky-500/10 text-sky-200',
  epico: 'border-violet-500/45 bg-violet-500/10 text-violet-200',
  lendario: 'border-amber-500/45 bg-amber-500/10 text-amber-100',
  mitico: 'border-rose-500/45 bg-rose-500/10 text-rose-100',
};

export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  amuletos: 'Amuletos',
  aneis: 'Aneis',
  reliquias: 'Reliquias',
  grimorios: 'Grimorios',
  artefatos: 'Artefatos',
  brasoes: 'Brasoes',
  fragmentos: 'Fragmentos',
  mascotes: 'Mascotes',
  talismas: 'Talismas',
  coroas: 'Coroas',
  runas: 'Runas',
};
