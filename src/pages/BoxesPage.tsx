import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { BoxCard, EmptyBoxCard } from '@/components/boxes/BoxCard';
import { BoxDropReveal } from '@/components/boxes/BoxDropReveal';
import { BoxHistoryList } from '@/components/boxes/BoxHistoryList';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BOX_CURRENCY_NAME, REBIRTH_CURRENCY_NAME, SEALS_PER_DIAMOND } from '@/data/theme';
import {
  convertSealsToDiamonds,
  getLootBoxShopState,
  getRecentBoxOpens,
  openLootBox,
  type BoxHistoryEntry,
} from '@/services/boxes/boxService';
import { useAuthStore } from '@/store/useAuthStore';
import { useGameStore } from '@/store/useGameStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import type { BoxOpenResult, LootBoxShopState } from '@/types/systems';
import { formatDuration, formatLargeNumber } from '@/utils/format';
import { Coins, Gem, Gift, History, Timer } from 'lucide-react';

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
  const [shopError, setShopError] = useState<string | null>(null);
  const [history, setHistory] = useState<BoxHistoryEntry[]>([]);
  const [isLoadingShop, setIsLoadingShop] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [openingRotationId, setOpeningRotationId] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [convertAmount, setConvertAmount] = useState('1');
  const [lastResult, setLastResult] = useState<BoxOpenResult | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  const loadShop = useCallback(async () => {
    setIsLoadingShop(true);
    try {
      const state = await getLootBoxShopState();
      setShopState(state);
      setShopError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel carregar a loja de caixas.';
      setShopError(message);
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
  const availableDiamonds = progress.crownDiamonds;
  const availableSeals = progress.rebirthCurrency;
  const maxConvertibleDiamonds = Math.floor(availableSeals / SEALS_PER_DIAMOND);

  const handleConvertSeals = async () => {
    if (!user) {
      return;
    }

    const diamonds = Math.floor(Number(convertAmount));
    if (!Number.isFinite(diamonds) || diamonds <= 0) {
      toast.error('Digite um valor valido para conversao.');
      return;
    }

    if (diamonds > maxConvertibleDiamonds) {
      toast.error('Saldo insuficiente de Selos da Aurora.');
      return;
    }

    setIsConverting(true);
    try {
      const result = await convertSealsToDiamonds(diamonds);

      toast.success('Conversao concluida', {
        description: `${formatLargeNumber(result.spentSeals)} ${REBIRTH_CURRENCY_NAME} -> ${formatLargeNumber(result.convertedDiamonds)} ${BOX_CURRENCY_NAME}`,
      });

      await Promise.all([
        reloadFromCloud(user.id),
        loadShop(),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha na conversao de moeda.';
      toast.error('Nao foi possivel converter', { description: message });
    } finally {
      setIsConverting(false);
    }
  };

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
        `Confirmar compra de ${rotation.box.name} por ${formatLargeNumber(rotation.box.price)} ${BOX_CURRENCY_NAME}?`,
      );

      if (!confirmed) {
        return;
      }
    }

    setOpeningRotationId(rotation.rotationId);
    try {
      const result = await openLootBox({
        rotationId: rotation.rotationId,
        boxKey: rotation.box.boxKey,
      });
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
          detail="saldo atual"
          icon={Gem}
        />
        <StatCard
          title={REBIRTH_CURRENCY_NAME}
          value={formatLargeNumber(availableSeals)}
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

      <section className="ornate-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[220px] flex-1 space-y-1 text-sm">
            <span className="text-muted-foreground">Converter Selos em Diamantes (1000:1)</span>
            <Input
              type="number"
              min={1}
              value={convertAmount}
              onChange={(event) => setConvertAmount(event.target.value)}
            />
          </label>

          <Button variant="outline" onClick={() => setConvertAmount(String(maxConvertibleDiamonds))}>
            Converter maximo
          </Button>

          <Button onClick={handleConvertSeals} disabled={isConverting || maxConvertibleDiamonds <= 0}>
            <Coins className="mr-2 h-4 w-4" />
            {isConverting ? 'Convertendo...' : 'Converter'}
          </Button>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Maximo conversivel agora: {formatLargeNumber(maxConvertibleDiamonds)} {BOX_CURRENCY_NAME}.
        </p>
      </section>

      {isLoadingShop ? <p className="text-sm text-muted-foreground">Atualizando loja de caixas...</p> : null}
      {shopError ? (
        <div className="rounded-xl border border-destructive/45 bg-destructive/10 p-3 text-sm text-destructive">
          Loja de caixas com erro temporario: {shopError}
        </div>
      ) : null}

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
