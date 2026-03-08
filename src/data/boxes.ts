import type { BoxRarity } from '@/types/systems';

export const BOX_RARITY_LABELS: Record<BoxRarity, string> = {
  comum: 'Comum',
  incomum: 'Incomum',
  raro: 'Raro',
  epico: 'Epico',
  lendario: 'Lendario',
  mitico: 'Mitico',
};

export const BOX_RARITY_STYLES: Record<BoxRarity, string> = {
  comum: 'border-slate-500/50 bg-slate-500/10 text-slate-200',
  incomum: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200',
  raro: 'border-sky-500/50 bg-sky-500/10 text-sky-200',
  epico: 'border-violet-500/50 bg-violet-500/10 text-violet-200',
  lendario: 'border-amber-500/50 bg-amber-500/10 text-amber-100',
  mitico: 'border-rose-500/50 bg-rose-500/10 text-rose-100',
};
