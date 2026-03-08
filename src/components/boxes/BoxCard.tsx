import { motion } from 'framer-motion';
import { Clock4, Gem, PackageOpen } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ActiveLootBoxRotation, BoxRarity } from '@/types/systems';
import { BOX_RARITY_LABELS, BOX_RARITY_STYLES } from '@/data/boxes';
import { RESOURCE_NAME } from '@/data/theme';
import { formatLargeNumber } from '@/utils/format';

interface BoxCardProps {
  activeRotation: ActiveLootBoxRotation | null;
  nextSpawnAt: string | null;
  remainingSeconds: number;
  nextSpawnSeconds: number;
  canAfford: boolean;
  isOpening: boolean;
  onOpen: () => void;
}

function getVisualClass(visual: Record<string, unknown> | null): string {
  const tone = typeof visual?.tone === 'string' ? visual.tone : 'default';

  switch (tone) {
    case 'mercador':
      return 'from-amber-500/15 via-background to-orange-900/20';
    case 'guilda':
      return 'from-emerald-500/15 via-background to-emerald-900/20';
    case 'arcana':
      return 'from-violet-500/15 via-background to-indigo-900/20';
    case 'real':
      return 'from-yellow-500/20 via-background to-amber-900/25';
    case 'lendaria':
      return 'from-rose-500/20 via-background to-orange-900/30';
    case 'celestial':
      return 'from-sky-500/25 via-background to-cyan-900/20';
    case 'amaldiocoada':
      return 'from-red-500/20 via-background to-fuchsia-900/25';
    case 'evento':
      return 'from-teal-500/20 via-background to-lime-900/20';
    case 'mistica':
      return 'from-purple-500/20 via-background to-blue-900/20';
    default:
      return 'from-slate-500/15 via-background to-slate-900/20';
  }
}

function formatRemaining(seconds: number): string {
  if (seconds <= 0) {
    return 'Expirando...';
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

function getRarityStyle(rarity: BoxRarity | string): string {
  if (rarity in BOX_RARITY_STYLES) {
    return BOX_RARITY_STYLES[rarity as BoxRarity];
  }

  return BOX_RARITY_STYLES.comum;
}

function getRarityLabel(rarity: BoxRarity | string): string {
  if (rarity in BOX_RARITY_LABELS) {
    return BOX_RARITY_LABELS[rarity as BoxRarity];
  }

  return 'Comum';
}

export function BoxCard({
  activeRotation,
  nextSpawnAt,
  remainingSeconds,
  nextSpawnSeconds,
  canAfford,
  isOpening,
  onOpen,
}: BoxCardProps) {
  if (!activeRotation) {
    return (
      <div className="ornate-card p-5">
        <div className="flex items-center gap-3">
          <PackageOpen className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Loja de Caixas</h3>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          Nenhuma caixa ativa agora. A proxima janela aparece em breve.
        </p>

        <div className="mt-4 rounded-xl border border-border/70 bg-muted/35 p-3 text-sm text-muted-foreground">
          <p>
            Proxima janela: {nextSpawnAt ? new Date(nextSpawnAt).toLocaleString('pt-BR') : 'calculando...'}
          </p>
          <p className="mt-1">Contagem regressiva: {nextSpawnSeconds > 0 ? formatRemaining(nextSpawnSeconds) : 'a qualquer momento'}</p>
        </div>
      </div>
    );
  }

  const { box } = activeRotation;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`ornate-card overflow-hidden bg-gradient-to-br ${getVisualClass(box.visual)}`}
    >
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Caixa ativa</p>
            <h3 className="mt-1 text-xl font-semibold text-foreground">{box.name}</h3>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{box.description}</p>
          </div>

          <Badge className={getRarityStyle(box.rarity)}>{getRarityLabel(box.rarity)}</Badge>
        </div>

        <div className="mt-4 grid gap-2 text-sm md:grid-cols-3">
          <div className="rounded-lg border border-border/70 bg-background/45 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Preco</p>
            <p className="mt-1 font-semibold text-foreground">
              {formatLargeNumber(box.price)} {RESOURCE_NAME}
            </p>
          </div>

          <div className="rounded-lg border border-border/70 bg-background/45 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Duracao</p>
            <p className="mt-1 font-semibold text-foreground">{box.durationMinutes} min</p>
          </div>

          <div className="rounded-lg border border-border/70 bg-background/45 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Expira em</p>
            <p className="mt-1 font-semibold text-foreground">{formatRemaining(remainingSeconds)}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock4 className="h-3.5 w-3.5" />
            Janela iniciada em {new Date(activeRotation.startsAt).toLocaleString('pt-BR')}
          </div>
          <div>
            Proxima rotacao prevista: {nextSpawnAt ? new Date(nextSpawnAt).toLocaleTimeString('pt-BR') : '--'}
          </div>
        </div>

        <Button
          className="mt-4 w-full"
          onClick={onOpen}
          disabled={isOpening || !canAfford || remainingSeconds <= 0}
        >
          <Gem className="mr-2 h-4 w-4" />
          {isOpening
            ? 'Abrindo caixa...'
            : canAfford
              ? `Abrir por ${formatLargeNumber(box.price)}`
              : 'Recursos insuficientes'}
        </Button>
      </div>
    </motion.div>
  );
}
