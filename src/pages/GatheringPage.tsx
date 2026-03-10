import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Axe, Coins, Hammer, Pickaxe, Trees } from 'lucide-react';
import { toast } from 'sonner';

import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ITEM_RARITY_LABELS, ITEM_RARITY_STYLES } from '@/data/items';
import { GATHERING_AREAS } from '@/data/gathering';
import { useAuthStore } from '@/store/useAuthStore';
import { useGameStore } from '@/store/useGameStore';
import { useGatheringStore } from '@/store/useGatheringStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import type { ToolUpgradeStat, ToolWithState } from '@/types/gathering';
import { formatDuration, formatLargeNumber, formatPerSecond } from '@/utils/format';
import { calculateToolUpgradeCost, calculateBuildingResourceCost, calculateAmuletBuildingLimitBonus } from '@/utils/gatheringMath';

const TOOL_TYPE_LABELS = {
  machado: 'Machados',
  picareta: 'Picaretas',
} as const;

const TOOL_TYPE_ICONS = {
  machado: Axe,
  picareta: Pickaxe,
} as const;

const TOOL_UPGRADE_LABELS: Record<ToolUpgradeStat, string> = {
  speed: 'Velocidade',
  yield: 'Rendimento',
  luck: 'Sorte',
  duplicate: 'Duplicacao',
  rare_drop: 'Drop raro',
};

const MERCHANT_BUFF_LABELS = {
  collection_luck: 'Sorte de coleta',
  collection_yield: 'Rendimento de coleta',
  gold_bonus: 'Bônus de ouro',
} as const;

function secondsUntil(iso: string | null): number {
  if (!iso) {
    return 0;
  }

  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) {
    return 0;
  }

  return Math.max(0, Math.floor((target - Date.now()) / 1000));
}

function getCurrentUpgradeLevel(tool: ToolWithState, stat: ToolUpgradeStat): number {
  if (stat === 'speed') {
    return tool.upgrades.speedLevel;
  }

  if (stat === 'yield') {
    return tool.upgrades.yieldLevel;
  }

  if (stat === 'luck') {
    return tool.upgrades.luckLevel;
  }

  if (stat === 'duplicate') {
    return tool.upgrades.duplicateLevel;
  }

  return tool.upgrades.rareDropLevel;
}

export function GatheringPage() {
  const user = useAuthStore((state) => state.user);
  const progress = useGameStore((state) => state.progress);
  const inventoryItems = useInventoryStore((state) => state.items);
  const inventoryLoadedUserId = useInventoryStore((state) => state.loadedUserId);
  const loadInventory = useInventoryStore((state) => state.loadInventory);

  const materialDefinitions = useGatheringStore((state) => state.materialDefinitions);
  const toolStates = useGatheringStore((state) => state.toolStates);
  const buildingDefinitions = useGatheringStore((state) => state.buildingDefinitions);
  const materialQuantities = useGatheringStore((state) => state.materialQuantities);
  const buildingOwned = useGatheringStore((state) => state.buildingOwned);
  const activeMerchantBuff = useGatheringStore((state) => state.activeMerchantBuff);
  const recentDrops = useGatheringStore((state) => state.recentDrops);
  const isLoading = useGatheringStore((state) => state.isLoading);
  const loadedUserId = useGatheringStore((state) => state.loadedUserId);
  const error = useGatheringStore((state) => state.error);
  const loadForUser = useGatheringStore((state) => state.loadForUser);
  const collectInArea = useGatheringStore((state) => state.collectInArea);
  const buyTool = useGatheringStore((state) => state.buyTool);
  const equipTool = useGatheringStore((state) => state.equipTool);
  const upgradeTool = useGatheringStore((state) => state.upgradeTool);
  const buyBuilding = useGatheringStore((state) => state.buyBuilding);
  const sellRareMaterial = useGatheringStore((state) => state.sellRareMaterial);
  const getTotalBuildingCount = useGatheringStore((state) => state.getTotalBuildingCount);
  const getBuildingLimit = useGatheringStore((state) => state.getBuildingLimit);
  const getGatheringGoldPerSecond = useGatheringStore((state) => state.getGatheringGoldPerSecond);

  const [collectingArea, setCollectingArea] = useState<string | null>(null);
  const [busyToolKey, setBusyToolKey] = useState<string | null>(null);
  const [busyBuildingKey, setBusyBuildingKey] = useState<string | null>(null);
  const [busySellKey, setBusySellKey] = useState<string | null>(null);
  const [upgradeTarget, setUpgradeTarget] = useState<Record<string, ToolUpgradeStat>>({});
  const [sellAmountByMaterial, setSellAmountByMaterial] = useState<Record<string, string>>({});
  const [sessionSeconds, setSessionSeconds] = useState(0);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (loadedUserId !== user.id) {
      void loadForUser(user.id);
    }
  }, [loadForUser, loadedUserId, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (inventoryLoadedUserId !== user.id) {
      void loadInventory(user.id, true);
    }
  }, [inventoryLoadedUserId, loadInventory, user]);

  useEffect(() => {
    const timer = window.setInterval(() => setSessionSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const amuletLimitBonus = useMemo(
    () => calculateAmuletBuildingLimitBonus(inventoryItems),
    [inventoryItems],
  );

  const totalBuildings = getTotalBuildingCount();
  const buildingLimit = getBuildingLimit(amuletLimitBonus);
  const gatheringGoldPerSecond = getGatheringGoldPerSecond();
  const wood = materialQuantities.madeira ?? 0;
  const stone = materialQuantities.pedra ?? 0;

  const merchantBuffSeconds = secondsUntil(activeMerchantBuff?.expiresAt ?? null);
  const rareMaterials = useMemo(
    () =>
      materialDefinitions
        .filter((material) => !material.isBuildingMaterial)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [materialDefinitions],
  );

  const toolsByType = useMemo(
    () => ({
      machado: toolStates
        .filter((tool) => tool.definition.toolType === 'machado')
        .sort((a, b) => a.definition.tier - b.definition.tier),
      picareta: toolStates
        .filter((tool) => tool.definition.toolType === 'picareta')
        .sort((a, b) => a.definition.tier - b.definition.tier),
    }),
    [toolStates],
  );

  const handleCollect = async (areaKey: 'floresta' | 'ravina') => {
    if (!user) {
      return;
    }

    setCollectingArea(areaKey);
    const result = await collectInArea(user.id, areaKey);

    if (result.ok) {
      toast.success('Coleta concluida', { description: result.message });
    } else {
      toast.error('Coleta falhou', { description: result.message });
    }

    setCollectingArea(null);
  };

  const handleBuyTool = async (toolKey: string) => {
    if (!user) {
      return;
    }

    setBusyToolKey(toolKey);
    const result = await buyTool(user.id, toolKey);

    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error('Nao foi possivel comprar', { description: result.message });
    }

    setBusyToolKey(null);
  };

  const handleEquipTool = async (toolKey: string) => {
    if (!user) {
      return;
    }

    setBusyToolKey(toolKey);
    const result = await equipTool(user.id, toolKey);

    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error('Falha ao equipar', { description: result.message });
    }

    setBusyToolKey(null);
  };

  const handleUpgradeTool = async (tool: ToolWithState) => {
    if (!user) {
      return;
    }

    const stat = upgradeTarget[tool.definition.toolKey] ?? 'yield';
    setBusyToolKey(tool.definition.toolKey);
    const result = await upgradeTool(user.id, tool.definition.toolKey, stat);

    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error('Upgrade falhou', { description: result.message });
    }

    setBusyToolKey(null);
  };

  const handleBuyBuilding = async (buildingKey: string) => {
    if (!user) {
      return;
    }

    setBusyBuildingKey(buildingKey);
    const result = await buyBuilding(user.id, buildingKey, progress.rebirthCount, amuletLimitBonus);

    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error('Construcao nao comprada', { description: result.message });
    }

    setBusyBuildingKey(null);
  };

  const handleSellMaterial = async (materialKey: string, quantity: number) => {
    if (!user) {
      return;
    }

    setBusySellKey(materialKey);
    const result = await sellRareMaterial(user.id, materialKey, quantity);

    if (result.ok) {
      toast.success('Venda concluida', { description: result.message });
    } else {
      toast.error('Falha na venda', { description: result.message });
    }

    setBusySellKey(null);
  };

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Madeira" value={formatLargeNumber(wood)} detail="material de construcao" icon={Trees} />
        <StatCard title="Pedra" value={formatLargeNumber(stone)} detail="material de construcao" icon={Pickaxe} />
        <StatCard
          title="Ouro de estruturas"
          value={formatPerSecond(gatheringGoldPerSecond)}
          detail="gerado por construcoes"
          icon={Coins}
        />
        <StatCard
          title="Limite de construcoes"
          value={`${formatLargeNumber(totalBuildings)} / ${formatLargeNumber(buildingLimit)}`}
          detail={`Bonus de amuletos: +${formatLargeNumber(amuletLimitBonus)}`}
          icon={Hammer}
        />
      </section>

      {error ? (
        <div className="rounded-xl border border-destructive/45 bg-destructive/10 p-3 text-sm text-destructive">
          <p>Modulo de coleta com erro temporario: {error}</p>
          {user ? (
            <Button
              className="mt-2"
              size="sm"
              variant="outline"
              onClick={() => void loadForUser(user.id)}
            >
              Tentar novamente
            </Button>
          ) : null}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Areas de Coleta</CardTitle>
          <CardDescription>
            Colete materiais em tempo real. Ferramentas compativeis aumentam rendimento e chance de raros.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando modulo de coleta...</p> : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {GATHERING_AREAS.map((area) => {
              const equippedTool = toolStates.find(
                (tool) => tool.definition.toolType === area.toolType && tool.state.isOwned && tool.state.isEquipped,
              );
              const isCollecting = collectingArea === area.id;

              return (
                <motion.div
                  key={area.id}
                  animate={{ scale: isCollecting ? 0.98 : 1 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-xl border border-border/70 bg-muted/30 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{area.name}</h3>
                      <p className="text-sm text-muted-foreground">{area.description}</p>
                    </div>
                    <Badge>{area.toolType === 'machado' ? 'Machado' : 'Picareta'}</Badge>
                  </div>

                  <div className="mt-3 rounded-lg border border-border/60 bg-card/60 p-3 text-xs text-muted-foreground">
                    Ferramenta equipada:{' '}
                    <strong className="text-foreground">
                      {equippedTool ? `${equippedTool.definition.name} (Tier ${equippedTool.definition.tier})` : 'nenhuma'}
                    </strong>
                  </div>

                  <Button
                    className="mt-3 w-full"
                    disabled={isCollecting || isLoading}
                    onClick={() => void handleCollect(area.id)}
                  >
                    {isCollecting ? 'Coletando...' : `Coletar em ${area.name}`}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          <div className="rounded-xl border border-border/70 bg-card/60 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Drops recentes</p>
            {!recentDrops.length ? (
              <p className="mt-2 text-sm text-muted-foreground">Nenhuma coleta recente nesta sessao.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {recentDrops.map((drop, index) => (
                  <Badge
                    key={`${drop.materialKey}-${index}`}
                    className={drop.rarity === 'raro' ? 'border-amber-500/45 bg-amber-500/10 text-amber-100' : ''}
                  >
                    +{formatLargeNumber(drop.amount)} {drop.materialName}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ferramentas</CardTitle>
          <CardDescription>
            Compre, equipe e melhore machados e picaretas para liberar materiais raros.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {(Object.keys(toolsByType) as Array<keyof typeof toolsByType>).map((toolType) => {
            const Icon = TOOL_TYPE_ICONS[toolType];

            return (
              <div key={toolType} className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Icon className="h-4 w-4 text-primary" />
                  {TOOL_TYPE_LABELS[toolType]}
                </div>

                <div className="grid gap-3 xl:grid-cols-2">
                  {toolsByType[toolType].map((tool) => {
                    const selectedUpgrade = upgradeTarget[tool.definition.toolKey] ?? 'yield';
                    const currentLevel = getCurrentUpgradeLevel(tool, selectedUpgrade);
                    const upgradeCost = calculateToolUpgradeCost(currentLevel, selectedUpgrade);

                    const canBuy = progress.resourceAmount >= tool.definition.buyCostGold;
                    const canUpgrade = progress.resourceAmount >= upgradeCost.gold
                      && wood >= upgradeCost.wood
                      && stone >= upgradeCost.stone;

                    return (
                      <div key={tool.definition.id} className="rounded-xl border border-border/70 bg-muted/30 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{tool.definition.name}</p>
                            <p className="text-xs text-muted-foreground">Tier {tool.definition.tier}</p>
                          </div>
                          <Badge className={ITEM_RARITY_STYLES[tool.definition.rarity]}>
                            {ITEM_RARITY_LABELS[tool.definition.rarity]}
                          </Badge>
                        </div>

                        <div className="mt-2 text-xs text-muted-foreground">
                          <p>Velocidade base: {(tool.definition.baseSpeed * 100).toFixed(0)}%</p>
                          <p>Rendimento base: {(tool.definition.baseYield * 100).toFixed(0)}%</p>
                          <p>Sorte base: {(tool.definition.baseLuck * 100).toFixed(0)}%</p>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {!tool.state.isOwned ? (
                            <Button
                              disabled={busyToolKey === tool.definition.toolKey || !canBuy || tool.definition.isBoxOnly}
                              onClick={() => void handleBuyTool(tool.definition.toolKey)}
                            >
                              {tool.definition.isBoxOnly
                                ? 'Somente caixa'
                                : `Comprar (${formatLargeNumber(tool.definition.buyCostGold)} ouro)`}
                            </Button>
                          ) : (
                            <Button
                              variant={tool.state.isEquipped ? 'secondary' : 'outline'}
                              disabled={busyToolKey === tool.definition.toolKey || tool.state.isEquipped}
                              onClick={() => void handleEquipTool(tool.definition.toolKey)}
                            >
                              {tool.state.isEquipped ? 'Equipada' : 'Equipar'}
                            </Button>
                          )}

                          <div className="flex gap-2">
                            <select
                              className="h-10 w-full rounded-xl border border-border bg-card px-2 text-sm"
                              value={selectedUpgrade}
                              onChange={(event) =>
                                setUpgradeTarget((current) => ({
                                  ...current,
                                  [tool.definition.toolKey]: event.target.value as ToolUpgradeStat,
                                }))
                              }
                              disabled={!tool.state.isOwned}
                            >
                              {(Object.keys(TOOL_UPGRADE_LABELS) as ToolUpgradeStat[]).map((stat) => (
                                <option key={stat} value={stat}>
                                  {TOOL_UPGRADE_LABELS[stat]}
                                </option>
                              ))}
                            </select>
                            <Button
                              variant="outline"
                              disabled={
                                !tool.state.isOwned
                                || busyToolKey === tool.definition.toolKey
                                || !canUpgrade
                              }
                              onClick={() => void handleUpgradeTool(tool)}
                            >
                              Melhorar
                            </Button>
                          </div>
                        </div>

                        {tool.state.isOwned ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Custo upgrade {TOOL_UPGRADE_LABELS[selectedUpgrade]} (Nv. {currentLevel + 1}):
                            {' '}
                            {formatLargeNumber(upgradeCost.gold)} ouro, {formatLargeNumber(upgradeCost.wood)} madeira,
                            {' '}
                            {formatLargeNumber(upgradeCost.stone)} pedra.
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Construcoes de Coleta</CardTitle>
          <CardDescription>
            Custos escalam com ouro, madeira e pedra. Uma nova faixa de construcoes e liberada a cada 10 rebirths.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="rounded-xl border border-border/70 bg-card/60 p-3 text-xs text-muted-foreground">
            Rebirth atual: <strong className="text-foreground">{formatLargeNumber(progress.rebirthCount)}</strong>.
            {' '}
            Limite de construcoes: <strong className="text-foreground">{formatLargeNumber(totalBuildings)} / {formatLargeNumber(buildingLimit)}</strong>.
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {buildingDefinitions.map((building) => {
              const owned = buildingOwned[building.buildingKey] ?? 0;
              const goldCost = calculateBuildingResourceCost(building.baseGoldCost, building.goldGrowth, owned);
              const woodCost = calculateBuildingResourceCost(building.baseWoodCost, building.woodGrowth, owned);
              const stoneCost = calculateBuildingResourceCost(building.baseStoneCost, building.stoneGrowth, owned);
              const missingRebirth = Math.max(0, building.unlockRebirthRequired - progress.rebirthCount);
              const isUnlocked = missingRebirth <= 0;
              const hasResources = progress.resourceAmount >= goldCost && wood >= woodCost && stone >= stoneCost;
              const hasLimit = totalBuildings < buildingLimit;

              return (
                <div key={building.id} className="rounded-xl border border-border/70 bg-muted/30 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{building.name}</p>
                      <p className="text-xs text-muted-foreground">{building.description}</p>
                    </div>
                    <Badge>{formatPerSecond(building.goldPerSecond)}</Badge>
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground">
                    <p>Possuidas: {formatLargeNumber(owned)}</p>
                    <p>Custo: {formatLargeNumber(goldCost)} ouro, {formatLargeNumber(woodCost)} madeira, {formatLargeNumber(stoneCost)} pedra</p>
                    {isUnlocked ? (
                      <p className="text-emerald-300">Desbloqueada</p>
                    ) : (
                      <p className="text-amber-200">
                        Bloqueada: requer {formatLargeNumber(building.unlockRebirthRequired)} rebirths
                        {' '}({formatLargeNumber(missingRebirth)} faltando)
                      </p>
                    )}
                  </div>

                  <Button
                    className="mt-3 w-full"
                    disabled={
                      busyBuildingKey === building.buildingKey
                      || !isUnlocked
                      || !hasResources
                      || !hasLimit
                    }
                    onClick={() => void handleBuyBuilding(building.buildingKey)}
                  >
                    {busyBuildingKey === building.buildingKey ? 'Construindo...' : 'Construir'}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comerciante de Raros</CardTitle>
          <CardDescription>
            Materiais raros nao entram em construcao. Venda para ganhar ouro e buffs temporarios.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {activeMerchantBuff && merchantBuffSeconds > 0 ? (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
              <p className="font-semibold text-emerald-100">Buff ativo do comerciante</p>
              <p className="text-emerald-200/90">
                {MERCHANT_BUFF_LABELS[activeMerchantBuff.buffType]} +{Math.round(activeMerchantBuff.buffValue * 100)}%
                {' '}({formatDuration(merchantBuffSeconds)} restantes)
              </p>
            </div>
          ) : (
            <p className="rounded-xl border border-border/70 bg-card/60 p-3 text-sm text-muted-foreground">
              Sem buff ativo no momento.
            </p>
          )}

          {rareMaterials.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum material raro configurado no banco ainda.</p>
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {rareMaterials.map((material) => {
                const quantity = materialQuantities[material.materialKey] ?? 0;
                const draft = sellAmountByMaterial[material.materialKey] ?? '1';
                const parsed = Math.max(1, Math.floor(Number(draft)));
                const isBusy = busySellKey === material.materialKey;

                return (
                  <div key={material.id} className="rounded-xl border border-border/70 bg-muted/30 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{material.name}</p>
                        <p className="text-xs text-muted-foreground">{material.description}</p>
                      </div>
                      <Badge className="border-amber-500/45 bg-amber-500/10 text-amber-100">Raro</Badge>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      Quantidade: {formatLargeNumber(quantity)} | Valor base unitario: {formatLargeNumber(material.baseSellValue)} ouro
                    </p>

                    <div className="mt-3 flex gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={draft}
                        onChange={(event) =>
                          setSellAmountByMaterial((current) => ({
                            ...current,
                            [material.materialKey]: event.target.value,
                          }))
                        }
                      />
                      <Button
                        variant="outline"
                        disabled={isBusy || quantity <= 0}
                        onClick={() => void handleSellMaterial(material.materialKey, parsed)}
                      >
                        Vender
                      </Button>
                      <Button
                        disabled={isBusy || quantity <= 0}
                        onClick={() => void handleSellMaterial(material.materialKey, quantity)}
                      >
                        Vender tudo
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Tempo de sessao de coleta ativo: {formatDuration(sessionSeconds)}
      </p>
    </div>
  );
}
