import { Gem, MousePointerClick, Rocket, Timer } from 'lucide-react';

import { AchievementPanel } from '@/components/AchievementPanel';
import { BuildingCardList } from '@/components/BuildingCardList';
import { OfflineRewardBanner } from '@/components/OfflineRewardBanner';
import { ResourceClicker } from '@/components/ResourceClicker';
import { StatCard } from '@/components/StatCard';
import { UpgradeCardList } from '@/components/UpgradeCardList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { REBIRTH_CURRENCY_NAME, RESOURCE_NAME } from '@/data/theme';
import { useGameStore } from '@/store/useGameStore';
import { formatLargeNumber, formatPerSecond } from '@/utils/format';

export function DashboardPage() {
  const progress = useGameStore((state) => state.progress);
  const offlineReward = useGameStore((state) => state.offlineReward);
  const clickMainResource = useGameStore((state) => state.clickMainResource);
  const acknowledgeOfflineReward = useGameStore((state) => state.acknowledgeOfflineReward);

  return (
    <div className="space-y-4">
      <OfflineRewardBanner amount={offlineReward} onClose={acknowledgeOfflineReward} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total acumulado"
          value={formatLargeNumber(progress.totalResourceEarned)}
          detail={`${RESOURCE_NAME} coletados`}
          icon={Rocket}
        />
        <StatCard
          title="Forca de clique"
          value={formatLargeNumber(progress.clickPower)}
          detail="por clique"
          icon={MousePointerClick}
        />
        <StatCard
          title="Renda passiva"
          value={formatPerSecond(progress.passiveIncome)}
          detail="producao automatica"
          icon={Timer}
        />
        <StatCard
          title={REBIRTH_CURRENCY_NAME}
          value={formatLargeNumber(progress.rebirthCurrency)}
          detail={`${progress.rebirthCount} novas eras`}
          icon={Gem}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <ResourceClicker
          resourceName={RESOURCE_NAME}
          resourceAmount={progress.resourceAmount}
          clickPower={progress.clickPower}
          passiveIncome={progress.passiveIncome}
          onMainClick={clickMainResource}
        />

        <Tabs defaultValue="buildings">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="buildings">Construcoes</TabsTrigger>
            <TabsTrigger value="upgrades">Upgrades</TabsTrigger>
            <TabsTrigger value="achievements">Conquistas</TabsTrigger>
          </TabsList>

          <TabsContent value="buildings">
            <BuildingCardList />
          </TabsContent>

          <TabsContent value="upgrades">
            <UpgradeCardList />
          </TabsContent>

          <TabsContent value="achievements">
            <AchievementPanel />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
