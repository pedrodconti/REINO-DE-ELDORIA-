import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { BoxCard } from '@/components/boxes/BoxCard';
import { BoxDropReveal } from '@/components/boxes/BoxDropReveal';
import { BoxHistoryList } from '@/components/boxes/BoxHistoryList';
import { StatCard } from '@/components/StatCard';
import { RESOURCE_NAME } from '@/data/theme';
import { getLootBoxShopState, getRecentBoxOpens, openLootBox, type BoxHistoryEntry } from '@/services/boxes/boxService';
import { useAuthStore } from '@/store/useAuthStore';
import { useGameStore } from '@/store/useGameStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import type { BoxOpenResult, LootBoxShopState } from '@/types/systems';
import { formatLargeNumber } from '@/utils/format';
import { Gift, History, Timer, Wallet } from 'lucide-react';

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
    activeRotation: null,
    nextSpawnAt: null,
    serverNow: new Date().toISOString(),
  });
  const [history, setHistory] = useState<BoxHistoryEntry[]>([]);
  const [isLoadingShop, setIsLoadingShop] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
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
    const activeEndsAt = shopState.activeRotation?.endsAt ?? null;
    if (!activeEndsAt) {
      return;
    }

    const expiresAt = new Date(activeEndsAt).getTime();
    if (Number.isNaN(expiresAt)) {
      return;
    }

    if (expiresAt - nowTick <= 1000) {
      void loadShop();
    }
  }, [loadShop, nowTick, shopState.activeRotation?.endsAt]);

  const activeBox = shopState.activeRotation?.box ?? null;
  const remainingSeconds = secondsUntil(shopState.activeRotation?.endsAt ?? null);
  const nextSpawnSeconds = secondsUntil(shopState.nextSpawnAt);

  const canAfford = activeBox ? progress.resourceAmount >= activeBox.price : false;

  const handleOpenBox = async () => {
    if (!user || !activeBox) {
      return;
    }

    if (!canAfford) {
      toast.error('Recursos insuficientes', {
        description: `Voce precisa de mais ${RESOURCE_NAME} para abrir esta caixa.`,
      });
      return;
    }

    if (activeBox.price >= 500000) {
      const confirmed = window.confirm(`Confirmar compra de ${activeBox.name} por ${formatLargeNumber(activeBox.price)} ${RESOURCE_NAME}?`);
      if (!confirmed) {
        return;
      }
    }

    setIsOpening(true);
    try {
      const result = await openLootBox(activeBox.boxKey);
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
      setIsOpening(false);
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
          title="Recursos atuais"
          value={formatLargeNumber(progress.resourceAmount)}
          detail={RESOURCE_NAME}
          icon={Wallet}
        />
        <StatCard
          title="Timer da caixa"
          value={remainingSeconds > 0 ? `${remainingSeconds}s` : '--'}
          detail="janela ativa"
          icon={Timer}
        />
        <StatCard
          title="Drops recentes"
          value={formatLargeNumber(history.length)}
          detail="ultimas aberturas"
          icon={History}
        />
      </section>

      {isLoadingShop ? <p className="text-sm text-muted-foreground">Atualizando loja de caixas...</p> : null}

      <section className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <BoxCard
          activeRotation={shopState.activeRotation}
          nextSpawnAt={shopState.nextSpawnAt}
          remainingSeconds={remainingSeconds}
          nextSpawnSeconds={nextSpawnSeconds}
          canAfford={canAfford}
          isOpening={isOpening}
          onOpen={handleOpenBox}
        />

        <BoxDropReveal result={lastResult} />
      </section>

      <BoxHistoryList history={history} loading={isLoadingHistory} />
    </div>
  );
}
