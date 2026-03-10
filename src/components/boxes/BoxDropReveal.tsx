import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

import { BoxSpinTrack } from '@/components/boxes/BoxSpinTrack';
import { PixelArtSprite } from '@/components/PixelArtSprite';
import { Badge } from '@/components/ui/badge';
import { getBoxPixelArt, getToolPixelArt } from '@/data/pixelArt';
import type { BoxOpenResult, ItemRarity } from '@/types/systems';
import { ITEM_RARITY_LABELS, ITEM_RARITY_STYLES } from '@/data/items';
import { formatPassiveEffect } from '@/utils/itemPassives';

interface BoxDropRevealProps {
  result: BoxOpenResult | null;
}

function getRarityStyle(rarity: ItemRarity | string): string {
  if (rarity in ITEM_RARITY_STYLES) {
    return ITEM_RARITY_STYLES[rarity as ItemRarity];
  }

  return ITEM_RARITY_STYLES.comum;
}

function getRarityLabel(rarity: ItemRarity | string): string {
  if (rarity in ITEM_RARITY_LABELS) {
    return ITEM_RARITY_LABELS[rarity as ItemRarity];
  }

  return 'Comum';
}

function getResultSprite(result: BoxOpenResult): string {
  if (result.grantedToolKey) {
    return getToolPixelArt(result.grantedToolKey);
  }

  return getBoxPixelArt(result.item.rarity);
}

export function BoxDropReveal({ result }: BoxDropRevealProps) {
  return (
    <AnimatePresence mode="wait">
      {result ? (
        <motion.div
          key={`${result.item.id}-${result.quantity}`}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8 }}
          className="ornate-card p-5"
        >
          <BoxSpinTrack result={result} />

          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Ultima recompensa</p>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-1 rounded-lg border border-border/70 bg-background/80 p-2">
                <PixelArtSprite src={getResultSprite(result)} alt={result.item.name} size={34} />
              </div>

              <div>
              <h3 className="text-lg font-semibold text-foreground">{result.item.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{result.item.description}</p>
              </div>
            </div>

            <Badge className={getRarityStyle(result.item.rarity)}>{getRarityLabel(result.item.rarity)}</Badge>
          </div>

          <div className="mt-4 rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4" />
              {formatPassiveEffect(result.item)}
            </div>
            <p className="mt-1 text-xs text-primary/90">Quantidade obtida: {result.quantity.toLocaleString('pt-BR')}</p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="empty-drop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="ornate-card p-5"
        >
          <p className="text-sm text-muted-foreground">
            Abra uma caixa para revelar um item com bonus passivo para seu reino.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
