import { ShieldCheck, Swords } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { UserItemRecord } from '@/types/systems';
import { ITEM_CATEGORY_LABELS, ITEM_RARITY_LABELS, ITEM_RARITY_STYLES } from '@/data/items';
import { formatLargeNumber } from '@/utils/format';
import { formatPassiveEffect } from '@/utils/itemPassives';

interface InventoryItemGridProps {
  items: UserItemRecord[];
  loading: boolean;
  busyItemId: string | null;
  onToggleEquip: (item: UserItemRecord) => void;
  onToggleTradable: (item: UserItemRecord) => void;
}

export function InventoryItemGrid({
  items,
  loading,
  busyItemId,
  onToggleEquip,
  onToggleTradable,
}: InventoryItemGridProps) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando inventario...</p>;
  }

  if (!items.length) {
    return (
      <div className="rounded-xl border border-border/70 bg-muted/35 p-4 text-sm text-muted-foreground">
        Seu inventario esta vazio. Abra caixas para conseguir itens.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const rarityStyle = ITEM_RARITY_STYLES[item.definition.rarity];
        const rarityLabel = ITEM_RARITY_LABELS[item.definition.rarity];
        const categoryLabel = ITEM_CATEGORY_LABELS[item.definition.category];
        const isBusy = busyItemId === item.id;

        return (
          <div key={item.id} className="ornate-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">{item.definition.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.definition.description}</p>
              </div>
              <Badge className={rarityStyle}>{rarityLabel}</Badge>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>{categoryLabel}</Badge>
              <Badge>Qtd: {item.quantity.toLocaleString('pt-BR')}</Badge>
              {item.isEquipped ? <Badge className="border-primary/40 bg-primary/15 text-primary">Equipado</Badge> : null}
              {item.isLockedInTrade ? <Badge className="border-destructive/40 bg-destructive/15 text-destructive">Em trade</Badge> : null}
              {item.isMarkedTradable ? <Badge className="border-accent/40 bg-accent/15 text-accent-foreground">Negociavel</Badge> : null}
            </div>

            <div className="mt-3 rounded-lg border border-border/70 bg-muted/35 p-3 text-xs text-muted-foreground">
              <p>{formatPassiveEffect(item.definition)}</p>
              <p className="mt-1">Valor base: {formatLargeNumber(item.definition.baseValue)}</p>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button
                variant={item.isEquipped ? 'outline' : 'default'}
                size="sm"
                onClick={() => onToggleEquip(item)}
                disabled={isBusy || item.isLockedInTrade || (item.definition.stackable && item.quantity > 1 && !item.isEquipped)}
              >
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                {item.isEquipped ? 'Desequipar' : 'Equipar'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleTradable(item)}
                disabled={isBusy || !item.definition.tradable || item.isEquipped || item.isLockedInTrade}
              >
                <Swords className="mr-1.5 h-3.5 w-3.5" />
                {item.isMarkedTradable ? 'Nao negociar' : 'Marcar trade'}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
