import { Crown, Gem } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { REBIRTH_UPGRADES } from '@/data/rebirthUpgrades';
import { REBIRTH_CURRENCY_NAME } from '@/data/theme';
import { useGameStore } from '@/store/useGameStore';
import { calculateRebirthUpgradeCost } from '@/utils/gameMath';
import { formatLargeNumber, formatPercent } from '@/utils/format';

export function RebirthUpgradePanel() {
  const progress = useGameStore((state) => state.progress);
  const buyRebirthUpgrade = useGameStore((state) => state.buyRebirthUpgrade);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Crown className="h-5 w-5 text-primary" />
          Bonus Permanentes
        </CardTitle>
        <CardDescription>
          Invista {REBIRTH_CURRENCY_NAME} para multiplicadores definitivos entre runs.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {REBIRTH_UPGRADES.map((upgrade) => {
          const level = progress.rebirthUpgrades[upgrade.id] ?? 0;
          const cost = calculateRebirthUpgradeCost(upgrade.costBase, level, upgrade.costGrowth);
          const isMaxed = level >= upgrade.maxLevel;
          const canAfford = progress.rebirthCurrency >= cost;

          const handlePurchase = () => {
            const result = buyRebirthUpgrade(upgrade.id);

            if (result.ok) {
              toast.success('Bonus melhorado', {
                description: result.message,
              });
              return;
            }

            toast.error('Nao foi possivel melhorar', {
              description: result.message,
            });
          };

          return (
            <div key={upgrade.id} className="rounded-xl border border-border/70 bg-muted/45 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{upgrade.name}</p>
                  <p className="text-xs text-muted-foreground">{upgrade.flavor}</p>
                </div>

                <div className="rounded-md border border-border/70 bg-background/40 px-2 py-1 text-xs text-muted-foreground">
                  Nivel {level}/{upgrade.maxLevel}
                </div>
              </div>

              <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Gem className="h-4 w-4 text-primary" />
                <span>
                  Bonus por nivel: +{formatPercent(1 + upgrade.valuePerLevel)} ({upgrade.type})
                </span>
              </div>

              <Button className="w-full" onClick={handlePurchase} disabled={isMaxed || !canAfford}>
                {isMaxed ? 'Nivel Maximo' : `Melhorar (${formatLargeNumber(cost)} ${REBIRTH_CURRENCY_NAME})`}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
