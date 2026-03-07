const SUFFIXES = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function formatLargeNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  const absolute = Math.abs(value);

  if (absolute < 1000) {
    return value.toLocaleString('pt-BR', {
      maximumFractionDigits: value < 10 ? 2 : 0,
    });
  }

  const tier = Math.floor(Math.log10(absolute) / 3);

  if (tier - 1 >= SUFFIXES.length) {
    return value.toExponential(2);
  }

  const suffix = SUFFIXES[tier - 1];
  const short = value / 10 ** (tier * 3);

  return `${short.toLocaleString('pt-BR', {
    minimumFractionDigits: short < 10 ? 2 : 1,
    maximumFractionDigits: short < 10 ? 2 : 1,
  })}${suffix}`;
}

export function formatPerSecond(value: number): string {
  return `${formatLargeNumber(value)}/s`;
}

export function formatPercent(multiplier: number): string {
  return `${((multiplier - 1) * 100).toFixed(1)}%`;
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${remainder}s`;
  }

  return `${remainder}s`;
}
