import { BarChart3, Building2, MousePointerClick, Sparkles, Trophy } from 'lucide-react';

import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BUILDINGS } from '@/data/buildings';
import { REBIRTH_CURRENCY_NAME, RESOURCE_NAME } from '@/data/theme';
import { useGameStore } from '@/store/useGameStore';
import { formatDuration, formatLargeNumber, formatPerSecond } from '@/utils/format';

export function StatsPage() {
  const progress = useGameStore((state) => state.progress);

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Cliques totais"
          value={formatLargeNumber(progress.stats.totalClicks)}
          detail="interacoes manuais"
          icon={MousePointerClick}
        />
        <StatCard
          title="Total manual"
          value={formatLargeNumber(progress.stats.totalManualEarned)}
          detail={RESOURCE_NAME}
          icon={Sparkles}
        />
        <StatCard
          title="Total passivo"
          value={formatLargeNumber(progress.stats.totalPassiveEarned)}
          detail={formatPerSecond(progress.passiveIncome)}
          icon={BarChart3}
        />
        <StatCard
          title="Tempo jogado"
          value={formatDuration(progress.stats.playTimeSeconds)}
          detail="tempo acumulado"
          icon={Trophy}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumo de progresso</CardTitle>
            <CardDescription>Indicadores de expansao do reino.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/35 px-3 py-2">
              <span>Total acumulado</span>
              <span className="font-semibold text-foreground">{formatLargeNumber(progress.totalResourceEarned)}</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/35 px-3 py-2">
              <span>Rebirths concluido</span>
              <span className="font-semibold text-foreground">{progress.rebirthCount.toLocaleString('pt-BR')}</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/35 px-3 py-2">
              <span>{REBIRTH_CURRENCY_NAME}</span>
              <span className="font-semibold text-foreground">{formatLargeNumber(progress.rebirthCurrency)}</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/35 px-3 py-2">
              <span>Conquistas desbloqueadas</span>
              <span className="font-semibold text-foreground">
                {progress.achievements.length.toLocaleString('pt-BR')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              Inventario de construcoes
            </CardTitle>
            <CardDescription>Quantidade atual por estrutura.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-2">
            {BUILDINGS.map((building) => (
              <div
                key={building.id}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/35 px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">{building.name}</span>
                <span className="font-semibold text-foreground">
                  {(progress.buildings[building.id] ?? 0).toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
