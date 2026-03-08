import { useCallback, useEffect, useState } from 'react';
import { RefreshCcw, Trophy } from 'lucide-react';
import { toast } from 'sonner';

import { LeaderboardTable } from '@/components/ranking/LeaderboardTable';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getLeaderboard } from '@/services/ranking/rankingService';
import { useAuthStore } from '@/store/useAuthStore';
import type { LeaderboardEntry, LeaderboardMetric } from '@/types/systems';
import { formatLargeNumber } from '@/utils/format';

const metricOptions: Array<{ value: LeaderboardMetric; label: string }> = [
  { value: 'total_resource', label: 'Recurso total' },
  { value: 'passive_income', label: 'Producao passiva' },
  { value: 'rebirth_count', label: 'Novas Eras' },
  { value: 'boxes_opened', label: 'Caixas abertas' },
  { value: 'inventory_value', label: 'Valor de inventario' },
  { value: 'rarest_item', label: 'Item mais raro' },
];

const PAGE_SIZE = 25;

export function RankingPage() {
  const user = useAuthStore((state) => state.user);

  const [metric, setMetric] = useState<LeaderboardMetric>('total_resource');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myEntry, setMyEntry] = useState<LeaderboardEntry | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadRanking = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    try {
      const result = await getLeaderboard(metric, user.id, PAGE_SIZE, offset);
      setEntries(result.entries);
      setMyEntry(result.myEntry);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel carregar ranking.';
      toast.error('Erro no ranking', { description: message });
    } finally {
      setLoading(false);
    }
  }, [metric, offset, user]);

  useEffect(() => {
    void loadRanking();
  }, [loadRanking]);

  const topEntry = entries[0] ?? null;

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Jogadores na pagina"
          value={formatLargeNumber(entries.length)}
          detail={`Posicoes ${offset + 1} - ${offset + entries.length}`}
          icon={Trophy}
        />
        <StatCard
          title="Sua posicao"
          value={myEntry ? `#${myEntry.position}` : '--'}
          detail="ranking atual"
          icon={Trophy}
        />
        <StatCard
          title="Top jogador"
          value={topEntry?.username ?? '--'}
          detail="lider da pagina"
          icon={Trophy}
        />
        <StatCard
          title="Metrica ativa"
          value={metricOptions.find((option) => option.value === metric)?.label ?? '-'}
          detail="categoria atual"
          icon={Trophy}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuracao do ranking</CardTitle>
          <CardDescription>Selecione a metrica e navegue pelas paginas.</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-muted-foreground">Categoria</span>
            <select
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
              value={metric}
              onChange={(event) => {
                setMetric(event.target.value as LeaderboardMetric);
                setOffset(0);
              }}
            >
              {metricOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end gap-2">
            <Button variant="outline" className="w-full" onClick={() => void loadRanking()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>

          <div className="md:col-span-3 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
              disabled={offset === 0}
            >
              Pagina anterior
            </Button>
            <Button
              variant="outline"
              onClick={() => setOffset((value) => value + PAGE_SIZE)}
              disabled={entries.length < PAGE_SIZE}
            >
              Proxima pagina
            </Button>
          </div>
        </CardContent>
      </Card>

      <LeaderboardTable entries={entries} metric={metric} loading={loading} myEntry={myEntry} />
    </div>
  );
}
