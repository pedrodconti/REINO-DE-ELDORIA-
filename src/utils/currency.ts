import { SEALS_PER_DIAMOND } from '@/data/theme';

export function toDiamondsFromSeals(seals: number): number {
  if (!Number.isFinite(seals) || seals <= 0) {
    return 0;
  }

  return Math.floor(seals / SEALS_PER_DIAMOND);
}

export function toSealsFromDiamonds(diamonds: number): number {
  if (!Number.isFinite(diamonds) || diamonds <= 0) {
    return 0;
  }

  return Math.floor(diamonds) * SEALS_PER_DIAMOND;
}
