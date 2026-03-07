import { motion } from 'framer-motion';
import { WandSparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UPGRADES } from '@/data/upgrades';
import { useGameStore } from '@/store/useGameStore';
import { isUpgradeUnlocked } from '@/utils/gameMath';
import { formatLargeNumber, formatPercent } from '@/utils/format';

export function UpgradeCardList() {
  const progress = useGameStore((state) => state.progress);
  const buyUpgrade = useGameStore((state) => state.buyUpgrade);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <WandSparkles className="h-5 w-5 text-primary" />
          Upgrades
        </CardTitle>
        <CardDescription>Melhore clique, passivo e bonus globais.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <TooltipProvider>
          {UPGRADES.map((upgrade, index) => {
            const purchased = progress.upgrades.includes(upgrade.id);
            const unlocked = isUpgradeUnlocked(
              upgrade.id,
              progress.totalResourceEarned,
              progress.buildings,
              progress.upgrades,
            );

            const canAfford = progress.resourceAmount >= upgrade.cost;
            const disabled = purchased || !unlocked || !canAfford;

            const handleBuy = () => {
              const result = buyUpgrade(upgrade.id);

              if (result.ok) {
                toast.success('Upgrade comprado', {
                  description: result.message,
                });
                return;
              }

              toast.error('Compra falhou', {
                description: result.message,
              });
            };

            return (
              <motion.div
                key={upgrade.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-xl border border-border/70 bg-muted/45 p-3"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{upgrade.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{upgrade.flavor}</p>
                  </div>

                  <Badge className="bg-secondary/25 text-secondary-foreground">
                    +{formatPercent(upgrade.multiplier)}
                  </Badge>
                </div>

                <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="capitalize">Tipo: {upgrade.type}</span>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help rounded-md border border-border/70 px-2 py-0.5">
                        requisitos
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {upgrade.requiresBuilding
                        ? `Precisa de ${upgrade.requiresBuilding.quantity}x ${upgrade.requiresBuilding.id}.`
                        : 'Sem requisito de construcao.'}
                    </TooltipContent>
                  </Tooltip>
                </div>

                <Button className="w-full" variant={purchased ? 'secondary' : 'default'} onClick={handleBuy} disabled={disabled}>
                  {purchased
                    ? 'Adquirido'
                    : unlocked
                      ? `Comprar (${formatLargeNumber(upgrade.cost)})`
                      : `Bloqueado (${formatLargeNumber(upgrade.unlockAtTotalEarned)})`}
                </Button>
              </motion.div>
            );
          })}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
