import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { TradeComposer } from '@/components/trade/TradeComposer';
import { TradeList } from '@/components/trade/TradeList';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  createTradeOffer,
  getMyTrades,
  respondTrade,
  searchPlayersByUsername,
} from '@/services/trade/tradeService';
import { useAuthStore } from '@/store/useAuthStore';
import { useGameStore } from '@/store/useGameStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import type { TradeOfferItemInput, TradeRecord, TradeSearchPlayer } from '@/types/systems';
import { formatLargeNumber } from '@/utils/format';
import { ArrowLeftRight, Clock3, Inbox, Send } from 'lucide-react';

function toOfferInput(selected: Record<string, number>): TradeOfferItemInput[] {
  return Object.entries(selected)
    .map(([userItemId, quantity]) => ({ userItemId, quantity: Math.floor(quantity) }))
    .filter((item) => item.quantity > 0);
}

export function TradePage() {
  const user = useAuthStore((state) => state.user);
  const loadInventory = useInventoryStore((state) => state.loadInventory);
  const inventoryItems = useInventoryStore((state) => state.items);
  const reloadFromCloud = useGameStore((state) => state.reloadFromCloud);

  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [processingTradeId, setProcessingTradeId] = useState<string | null>(null);

  const [receiverQuery, setReceiverQuery] = useState('');
  const [receiverNote, setReceiverNote] = useState('');
  const [searchResults, setSearchResults] = useState<TradeSearchPlayer[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedReceiver, setSelectedReceiver] = useState<TradeSearchPlayer | null>(null);
  const [selectedOfferItems, setSelectedOfferItems] = useState<Record<string, number>>({});
  const [selectedCounterItems, setSelectedCounterItems] = useState<Record<string, Record<string, number>>>({});
  const [creatingTrade, setCreatingTrade] = useState(false);

  const tradableItems = useMemo(
    () =>
      inventoryItems.filter(
        (item) => item.isMarkedTradable && !item.isLockedInTrade && !item.isEquipped && item.definition.tradable,
      ),
    [inventoryItems],
  );

  const incomingPending = useMemo(
    () => trades.filter((trade) => trade.receiverUserId === user?.id && trade.status === 'pending').length,
    [trades, user?.id],
  );

  const outgoingPending = useMemo(
    () => trades.filter((trade) => trade.proposerUserId === user?.id && trade.status === 'pending').length,
    [trades, user?.id],
  );

  const loadTrades = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsLoadingTrades(true);
    try {
      const data = await getMyTrades(user.id);
      setTrades(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar trocas.';
      toast.error('Erro no trade', { description: message });
    } finally {
      setIsLoadingTrades(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void loadInventory(user.id, true);
    void loadTrades();
  }, [loadInventory, loadTrades, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const query = receiverQuery.trim();

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const results = await searchPlayersByUsername(query, user.id);
        setSearchResults(results);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha na busca de jogadores.';
        toast.error('Busca indisponivel', { description: message });
      } finally {
        setLoadingSearch(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [receiverQuery, user]);

  const handleOfferItemChange = (itemId: string, quantity: number) => {
    setSelectedOfferItems((state) => {
      if (quantity <= 0) {
        const next = { ...state };
        delete next[itemId];
        return next;
      }

      return {
        ...state,
        [itemId]: quantity,
      };
    });
  };

  const handleCounterItemChange = (tradeId: string, itemId: string, quantity: number) => {
    setSelectedCounterItems((state) => {
      const current = { ...(state[tradeId] ?? {}) };

      if (quantity <= 0) {
        delete current[itemId];
      } else {
        current[itemId] = quantity;
      }

      return {
        ...state,
        [tradeId]: current,
      };
    });
  };

  const refreshAfterTradeMutation = async () => {
    if (!user) {
      return;
    }

    await Promise.all([
      loadInventory(user.id, true),
      loadTrades(),
      reloadFromCloud(user.id),
    ]);
  };

  const handleCreateTrade = async () => {
    if (!selectedReceiver) {
      toast.error('Selecione um jogador para receber a proposta.');
      return;
    }

    const offeredItems = toOfferInput(selectedOfferItems);
    if (!offeredItems.length) {
      toast.error('Selecione ao menos um item para a proposta.');
      return;
    }

    setCreatingTrade(true);
    try {
      await createTradeOffer(selectedReceiver.username, offeredItems, receiverNote.trim());
      toast.success('Trade enviada com sucesso.');

      setReceiverNote('');
      setSelectedOfferItems({});
      setSelectedReceiver(null);
      setReceiverQuery('');
      setSearchResults([]);

      await refreshAfterTradeMutation();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao criar proposta de trade.';
      toast.error('Nao foi possivel enviar trade', { description: message });
    } finally {
      setCreatingTrade(false);
    }
  };

  const runTradeAction = async (tradeId: string, action: 'accepted' | 'rejected' | 'cancelled') => {
    setProcessingTradeId(tradeId);
    try {
      const receiverItems = action === 'accepted'
        ? toOfferInput(selectedCounterItems[tradeId] ?? {})
        : [];

      await respondTrade(tradeId, action, receiverItems);

      toast.success('Trade atualizada com sucesso.');
      await refreshAfterTradeMutation();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao processar trade.';
      toast.error('Acao de trade falhou', { description: message });
    } finally {
      setProcessingTradeId(null);
    }
  };

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Trades totais" value={formatLargeNumber(trades.length)} detail="historico carregado" icon={ArrowLeftRight} />
        <StatCard title="Pendentes recebidas" value={formatLargeNumber(incomingPending)} detail="aguardando resposta" icon={Inbox} />
        <StatCard title="Pendentes enviadas" value={formatLargeNumber(outgoingPending)} detail="aguardando outro jogador" icon={Send} />
        <StatCard title="Itens negociaveis" value={formatLargeNumber(tradableItems.length)} detail="marcados para trade" icon={Clock3} />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <TradeComposer
          receiverQuery={receiverQuery}
          note={receiverNote}
          searchResults={searchResults}
          selectedReceiver={selectedReceiver}
          tradableItems={tradableItems}
          selectedItems={selectedOfferItems}
          loadingSearch={loadingSearch}
          creatingTrade={creatingTrade}
          onReceiverQueryChange={setReceiverQuery}
          onNoteChange={setReceiverNote}
          onPickReceiver={setSelectedReceiver}
          onToggleItem={handleOfferItemChange}
          onSubmit={handleCreateTrade}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dicas de trade segura</CardTitle>
            <CardDescription>Boas praticas para evitar perdas em negociacao.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Itens equipados nao podem entrar em troca.</p>
            <p>2. Itens com cadeado ja estao comprometidos em outra proposta.</p>
            <p>3. A confirmacao e atomica no backend: ou tudo troca, ou nada troca.</p>
            <p>4. Revise a proposta antes de aceitar.</p>
          </CardContent>
        </Card>
      </div>

      <TradeList
        trades={trades}
        currentUserId={user?.id ?? ''}
        tradableItems={tradableItems}
        selectedCounterItems={selectedCounterItems}
        loading={isLoadingTrades}
        processingTradeId={processingTradeId}
        onCounterItemChange={handleCounterItemChange}
        onAccept={(tradeId) => void runTradeAction(tradeId, 'accepted')}
        onReject={(tradeId) => void runTradeAction(tradeId, 'rejected')}
        onCancel={(tradeId) => void runTradeAction(tradeId, 'cancelled')}
      />
    </div>
  );
}
