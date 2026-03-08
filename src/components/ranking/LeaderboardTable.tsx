import { Crown } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ITEM_RARITY_LABELS, ITEM_RARITY_STYLES } from '@/data/items';
import type { LeaderboardEntry, LeaderboardMetric } from '@/types/systems';
import { formatLargeNumber, formatPerSecond } from '@/utils/format';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  metric: LeaderboardMetric;
  loading: boolean;
  myEntry: LeaderboardEntry | null;
}

function metricLabel(metric: LeaderboardMetric): string {
  switch (metric) {
    case 'total_resource':
      return 'Recurso total';
    case 'passive_income':
      return 'Producao passiva';
    case 'rebirth_count':
      return 'Novas Eras';
    case 'boxes_opened':
      return 'Caixas abertas';
    case 'inventory_value':
      return 'Valor do inventario';
    case 'rarest_item':
      return 'Raridade de item';
    default:
      return 'Pontuacao';
  }
}

function metricValue(entry: LeaderboardEntry, metric: LeaderboardMetric): string {
  switch (metric) {
    case 'total_resource':
      return formatLargeNumber(entry.totalResource);
    case 'passive_income':
      return formatPerSecond(entry.passiveIncome);
    case 'rebirth_count':
      return entry.rebirthCount.toLocaleString('pt-BR');
    case 'boxes_opened':
      return entry.boxesOpened.toLocaleString('pt-BR');
    case 'inventory_value':
      return formatLargeNumber(entry.inventoryValue);
    case 'rarest_item':
      return entry.highestItemRarity ? ITEM_RARITY_LABELS[entry.highestItemRarity] : 'Sem item';
    default:
      return '-';
  }
}

export function LeaderboardTable({ entries, metric, loading, myEntry }: LeaderboardTableProps) {
  const label = metricLabel(metric);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Crown className="h-5 w-5 text-primary" />
          Ranking - {label}
        </CardTitle>
        <CardDescription>Classificacao geral dos jogadores de Eldoria.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? <p className="text-sm text-muted-foreground">Atualizando ranking...</p> : null}

        {!loading && entries.length === 0 ? (
          <p className="rounded-xl border border-border/70 bg-muted/35 p-3 text-sm text-muted-foreground">
            Nenhum dado de ranking encontrado ainda.
          </p>
        ) : null}

        {entries.map((entry) => (
          <div key={entry.userId} className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/35 px-3 py-2">
            <div className="flex items-center gap-3">
              <Badge className={entry.position <= 3 ? 'border-primary/45 bg-primary/15 text-primary' : ''}>
                #{entry.position}
              </Badge>
              <div>
                <p className="font-semibold text-foreground">{entry.username}</p>
                <p className="text-xs text-muted-foreground">Valor de inventario: {formatLargeNumber(entry.inventoryValue)}</p>
              </div>
            </div>

            <div className="text-right">
              {metric === 'rarest_item' && entry.highestItemRarity ? (
                <Badge className={ITEM_RARITY_STYLES[entry.highestItemRarity]}>
                  {ITEM_RARITY_LABELS[entry.highestItemRarity]}
                </Badge>
              ) : (
                <p className="font-semibold text-foreground">{metricValue(entry, metric)}</p>
              )}
            </div>
          </div>
        ))}

        {myEntry ? (
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
            Sua posicao: <strong>#{myEntry.position}</strong> ({metricValue(myEntry, metric)})
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
