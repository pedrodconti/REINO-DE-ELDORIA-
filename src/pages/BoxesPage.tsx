import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { BoxCard, EmptyBoxCard } from '@/components/boxes/BoxCard';
import { BoxDropReveal } from '@/components/boxes/BoxDropReveal';
import { BoxHistoryList } from '@/components/boxes/BoxHistoryList';
import { StatCard } from '@/components/StatCard';
import { BOX_CURRENCY_NAME, REBIRTH_CURRENCY_NAME, SEALS_PER_DIAMOND } from '@/data/theme';
import { getLootBoxShopState, getRecentBoxOpens, openLootBox, type BoxHistoryEntry } from '@/services/boxes/boxService';
import { useAuthStore } from '@/store/useAuthStore';
import { useGameStore } from '@/store/useGameStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import type { BoxOpenResult, LootBoxShopState } from '@/types/systems';
import { toDiamondsFromSeals } from '@/utils/currency';
import { formatDuration, formatLargeNumber } from '@/utils/format';
import { Gem, Gift, History, Timer } from 'lucide-react';

function secondsUntil(targetIso: string | null): number {
  if (!targetIso) {
    return 0;
  }

  const target = new Date(targetIso).getTime();
  if (Number.isNaN(target)) {
    return 0;
  }

  return Math.max(0, Math.floor((target - Date.now()) / 1000));
}

export function BoxesPage() {
  const user = useAuthStore((state) => state.user);
  const progress = useGameStore((state) => state.progress);
  const reloadFromCloud = useGameStore((state) => state.reloadFromCloud);
  const loadInventory = useInventoryStore((state) => state.loadInventory);

  const [shopState, setShopState] = useState<LootBoxShopState>({
    activeRotations: [],
    nextSpawnAt: null,
    serverNow: new Date().toISOString(),
  });
  const [history, setHistory] = useState<BoxHistoryEntry[]>([]);
  const [isLoadingShop, setIsLoadingShop] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [openingRotationId, setOpeningRotationId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<BoxOpenResult | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  const loadShop = useCallback(async () => {
    setIsLoadingShop(true);
    try {
      const state = await getLootBoxShopState();
      setShopState(state);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel carregar a loja de caixas.';
      toast.error('Falha ao carregar caixas', { description: message });
    } finally {
      setIsLoadingShop(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsLoadingHistory(true);
    try {
      const data = await getRecentBoxOpens(user.id);
      setHistory(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel carregar historico.';
      toast.error('Erro no historico', { description: message });
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    void loadShop();
    void loadHistory();
  }, [loadHistory, loadShop]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const shouldRefreshByExpiration = shopState.activeRotations.some((rotation) => {
      const expiresAt = new Date(rotation.endsAt).getTime();
      if (Number.isNaN(expiresAt)) {
        return false;
      }

      return expiresAt - nowTick <= 1000;
    });

    const nextSpawnAtMs = shopState.nextSpawnAt ? new Date(shopState.nextSpawnAt).getTime() : null;
    const shouldRefreshBySpawn = nextSpawnAtMs !== null && !Number.isNaN(nextSpawnAtMs) && nextSpawnAtMs - nowTick <= 1000;

    if (shouldRefreshByExpiration || shouldRefreshBySpawn) {
      void loadShop();
    }
  }, [loadShop, nowTick, shopState.activeRotations, shopState.nextSpawnAt]);

  const activeRotations = useMemo(
    () =>
      [...shopState.activeRotations].sort(
        (a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime(),
      ),
    [shopState.activeRotations],
  );

  const nextSpawnSeconds = secondsUntil(shopState.nextSpawnAt);
  const availableDiamonds = toDiamondsFromSeals(progress.rebirthCurrency);

  const handleOpenBox = async (rotationId: string) => {
    if (!user) {
      return;
    }

    const rotation = activeRotations.find((entry) => entry.rotationId === rotationId);
    if (!rotation) {
      toast.error('Rotacao de caixa nao encontrada.');
      return;
    }

    if (rotation.hasOpened) {
      toast.error('Voce ja abriu esta caixa nesta rotacao.');
      return;
    }

    if (availableDiamonds < rotation.box.price) {
      toast.error('Diamantes insuficientes', {
        description: `Voce precisa de mais ${BOX_CURRENCY_NAME} para abrir esta caixa.`,
      });
      return;
    }

    if (rotation.box.price >= 80) {
      const confirmed = window.confirm(
        `Confirmar compra de ${rotation.box.name} por ${formatLargeNumber(rotation.box.price)} ${BOX_CURRENCY_NAME}?\n(${formatLargeNumber(rotation.box.price * SEALS_PER_DIAMOND)} ${REBIRTH_CURRENCY_NAME})`,
      );

      if (!confirmed) {
        return;
      }
    }

    setOpeningRotationId(rotation.rotationId);
    try {
      const result = await openLootBox(rotation.rotationId);
      setLastResult(result);

      toast.success('Caixa aberta com sucesso!', {
        description: `Voce recebeu ${result.item.name}.`,
      });

      await Promise.all([
        reloadFromCloud(user.id),
        loadInventory(user.id, true),
        loadHistory(),
        loadShop(),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel abrir caixa.';
      toast.error('Falha ao abrir caixa', {
        description: message,
      });
    } finally {
      setOpeningRotationId(null);
    }
  };

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Caixas abertas"
          value={formatLargeNumber(progress.stats.boxesOpened)}
          detail="total da conta"
          icon={Gift}
        />
        <StatCard
          title={BOX_CURRENCY_NAME}
          value={formatLargeNumber(availableDiamonds)}
          detail={`1 diamante = ${SEALS_PER_DIAMOND} ${REBIRTH_CURRENCY_NAME.toLowerCase()}`}
          icon={Gem}
        />
        <StatCard
          title={REBIRTH_CURRENCY_NAME}
          value={formatLargeNumber(progress.rebirthCurrency)}
          detail="saldo atual"
          icon={Timer}
        />
        <StatCard
          title="Proxima rotacao"
          value={nextSpawnSeconds > 0 ? formatDuration(nextSpawnSeconds) : '--'}
          detail={`${activeRotations.length} caixa(s) ativa(s)`}
          icon={History}
        />
      </section>

      {isLoadingShop ? <p className="text-sm text-muted-foreground">Atualizando loja de caixas...</p> : null}

      <section className="space-y-4">
        {activeRotations.length === 0 ? (
          <EmptyBoxCard nextSpawnAt={shopState.nextSpawnAt} nextSpawnSeconds={nextSpawnSeconds} />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {activeRotations.map((rotation) => {
              const canAfford = availableDiamonds >= rotation.box.price;
              const remainingSeconds = secondsUntil(rotation.endsAt);

              return (
                <BoxCard
                  key={rotation.rotationId}
                  rotation={rotation}
                  nextSpawnAt={shopState.nextSpawnAt}
                  remainingSeconds={remainingSeconds}
                  nextSpawnSeconds={nextSpawnSeconds}
                  canAfford={canAfford}
                  availableDiamonds={availableDiamonds}
                  isOpening={openingRotationId === rotation.rotationId}
                  onOpen={handleOpenBox}
                />
              );
            })}
          </div>
        )}

        <BoxDropReveal result={lastResult} />
      </section>

      <BoxHistoryList history={history} loading={isLoadingHistory} />
    </div>
  );
}
