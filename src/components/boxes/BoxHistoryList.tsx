import { History } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { BoxHistoryEntry } from '@/services/boxes/boxService';
import { BOX_RARITY_STYLES } from '@/data/boxes';
import { ITEM_RARITY_STYLES } from '@/data/items';
import { formatLargeNumber } from '@/utils/format';

interface BoxHistoryListProps {
  history: BoxHistoryEntry[];
  loading: boolean;
}

export function BoxHistoryList({ history, loading }: BoxHistoryListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5 text-primary" />
          Historico recente de drops
        </CardTitle>
        <CardDescription>Ultimas caixas abertas nesta conta.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-2">
        {loading ? <p className="text-sm text-muted-foreground">Carregando historico...</p> : null}

        {!loading && history.length === 0 ? (
          <p className="rounded-xl border border-border/70 bg-muted/35 p-3 text-sm text-muted-foreground">
            Nenhuma caixa aberta ainda.
          </p>
        ) : null}

        {history.map((entry) => {
          const boxStyle = entry.boxRarity in BOX_RARITY_STYLES
            ? BOX_RARITY_STYLES[entry.boxRarity as keyof typeof BOX_RARITY_STYLES]
            : BOX_RARITY_STYLES.comum;

          const itemStyle = entry.itemRarity in ITEM_RARITY_STYLES
            ? ITEM_RARITY_STYLES[entry.itemRarity as keyof typeof ITEM_RARITY_STYLES]
            : ITEM_RARITY_STYLES.comum;

          return (
            <div key={entry.id} className="rounded-xl border border-border/70 bg-muted/35 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{entry.itemName}</p>
                  <p className="text-xs text-muted-foreground">{new Date(entry.openedAt).toLocaleString('pt-BR')}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className={boxStyle}>{entry.boxName}</Badge>
                  <Badge className={itemStyle}>Drop</Badge>
                </div>
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                Custo pago: {formatLargeNumber(entry.pricePaid)} diamantes
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
