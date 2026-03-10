import { motion } from 'framer-motion';
import { useMemo } from 'react';

import { PixelArtSprite } from '@/components/PixelArtSprite';
import { Badge } from '@/components/ui/badge';
import { getBoxPixelArt, getToolPixelArt } from '@/data/pixelArt';
import { ITEM_RARITY_LABELS, ITEM_RARITY_STYLES } from '@/data/items';
import type { BoxOpenResult, ItemRarity } from '@/types/systems';

interface BoxSpinTrackProps {
  result: BoxOpenResult;
}

interface SpinSlot {
  id: string;
  rarity: ItemRarity;
  name: string;
  sprite: string;
  isFinal: boolean;
}

const SLOT_WIDTH = 108;
const SLOT_GAP = 8;
const SLOT_STEP = SLOT_WIDTH + SLOT_GAP;
const TRACK_VIEWPORT_WIDTH = 680;
const TOTAL_SLOTS = 18;
const FINAL_SLOT_INDEX = 13;
const RARITY_CYCLE: ItemRarity[] = ['comum', 'incomum', 'raro', 'epico', 'lendario', 'mitico'];

function getResultSprite(result: BoxOpenResult): string {
  if (result.grantedToolKey) {
    return getToolPixelArt(result.grantedToolKey);
  }

  return getBoxPixelArt(result.item.rarity);
}

export function BoxSpinTrack({ result }: BoxSpinTrackProps) {
  const slots = useMemo<SpinSlot[]>(() => {
    const hash = result.item.id
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const generated: SpinSlot[] = [];

    for (let index = 0; index < TOTAL_SLOTS; index += 1) {
      if (index === FINAL_SLOT_INDEX) {
        generated.push({
          id: `${result.item.id}-${index}`,
          rarity: result.item.rarity,
          name: result.item.name,
          sprite: getResultSprite(result),
          isFinal: true,
        });
        continue;
      }

      const rarity = RARITY_CYCLE[(index + hash) % RARITY_CYCLE.length];
      generated.push({
        id: `filler-${result.item.id}-${index}`,
        rarity,
        name: 'Eco Misterioso',
        sprite: getBoxPixelArt(rarity),
        isFinal: false,
      });
    }

    return generated;
  }, [result]);

  const targetX = TRACK_VIEWPORT_WIDTH / 2 - (FINAL_SLOT_INDEX * SLOT_STEP + SLOT_WIDTH / 2);

  return (
    <div className="relative mx-auto w-full max-w-[680px] overflow-hidden rounded-xl border border-primary/35 bg-black/25 p-2">
      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-0.5 -translate-x-1/2 bg-primary/70" />

      <motion.div
        key={`${result.item.id}-${result.quantity}-${result.rotationId ?? 'norot'}`}
        className="flex gap-2"
        initial={{ x: 0 }}
        animate={{ x: targetX }}
        transition={{ duration: 2.2, ease: [0.18, 0.95, 0.25, 1] }}
      >
        {slots.map((slot) => (
          <div
            key={slot.id}
            className={`w-[108px] shrink-0 rounded-lg border p-2 text-center ${
              slot.isFinal
                ? 'border-primary/70 bg-primary/15'
                : 'border-border/60 bg-card/70'
            }`}
          >
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-md border border-border/70 bg-background/80">
              <PixelArtSprite src={slot.sprite} alt={slot.name} size={34} />
            </div>

            <p className="truncate text-xs font-semibold text-foreground">{slot.name}</p>

            <Badge className={`mt-1 justify-center ${ITEM_RARITY_STYLES[slot.rarity]}`}>
              {ITEM_RARITY_LABELS[slot.rarity]}
            </Badge>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
