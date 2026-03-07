import { motion } from 'framer-motion';
import { Hammer } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BUILDINGS } from '@/data/buildings';
import { useGameStore } from '@/store/useGameStore';
import { calculateBuildingCost, getTotalBuildingsOwned, isBuildingUnlocked } from '@/utils/gameMath';
import { formatLargeNumber, formatPerSecond } from '@/utils/format';

export function BuildingCardList() {
  const progress = useGameStore((state) => state.progress);
  const buyBuilding = useGameStore((state) => state.buyBuilding);

  const basePassive = BUILDINGS.reduce((acc, building) => {
    const count = progress.buildings[building.id] ?? 0;
    return acc + count * building.baseProduction;
  }, 0);

  const passiveMultiplierFactor = basePassive > 0 ? progress.passiveIncome / basePassive : 1;
  const totalOwned = getTotalBuildingsOwned(progress.buildings);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Hammer className="h-5 w-5 text-primary" />
          Construcoes
        </CardTitle>
        <CardDescription>{totalOwned.toLocaleString('pt-BR')} estruturas ativas</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <TooltipProvider>
          {BUILDINGS.map((building, index) => {
            const owned = progress.buildings[building.id] ?? 0;
            const cost = calculateBuildingCost(building.baseCost, owned, building.costGrowth);
            const unlocked = isBuildingUnlocked(progress.totalResourceEarned, building.unlockAtTotalEarned);
            const canAfford = progress.resourceAmount >= cost;
            const estimatedProduction = building.baseProduction * Math.max(owned, 1) * passiveMultiplierFactor;

            const handleBuy = () => {
              const result = buyBuilding(building.id);

              if (result.ok) {
                toast.success('Construcao adquirida', {
                  description: result.message,
                });
                return;
              }

              toast.error('Nao foi possivel comprar', {
                description: result.message,
              });
            };

            return (
              <motion.div
                key={building.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-xl border border-border/70 bg-muted/45 p-3"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{building.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{building.flavor}</p>
                  </div>
                  <Badge className="border-primary/30 bg-primary/10 text-primary">x{owned}</Badge>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Producao: {formatPerSecond(estimatedProduction)}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help rounded-md border border-border/70 px-2 py-0.5">
                        desbloqueio
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Desbloqueia com {formatLargeNumber(building.unlockAtTotalEarned)} recursos totais.
                    </TooltipContent>
                  </Tooltip>
                </div>

                <Button
                  className="w-full"
                  variant={canAfford && unlocked ? 'default' : 'outline'}
                  onClick={handleBuy}
                  disabled={!canAfford || !unlocked}
                >
                  {unlocked
                    ? `Comprar (${formatLargeNumber(cost)})`
                    : `Bloqueado (${formatLargeNumber(building.unlockAtTotalEarned)})`}
                </Button>
              </motion.div>
            );
          })}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
