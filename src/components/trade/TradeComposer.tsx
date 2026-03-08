import { Send, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { TradeSearchPlayer, UserItemRecord } from '@/types/systems';
import { ITEM_RARITY_LABELS, ITEM_RARITY_STYLES } from '@/data/items';

interface TradeComposerProps {
  receiverQuery: string;
  note: string;
  searchResults: TradeSearchPlayer[];
  selectedReceiver: TradeSearchPlayer | null;
  tradableItems: UserItemRecord[];
  selectedItems: Record<string, number>;
  loadingSearch: boolean;
  creatingTrade: boolean;
  onReceiverQueryChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onPickReceiver: (player: TradeSearchPlayer) => void;
  onToggleItem: (itemId: string, quantity: number) => void;
  onSubmit: () => void;
}

export function TradeComposer({
  receiverQuery,
  note,
  searchResults,
  selectedReceiver,
  tradableItems,
  selectedItems,
  loadingSearch,
  creatingTrade,
  onReceiverQueryChange,
  onNoteChange,
  onPickReceiver,
  onToggleItem,
  onSubmit,
}: TradeComposerProps) {
  const selectedCount = Object.keys(selectedItems).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Nova proposta de troca</CardTitle>
        <CardDescription>Escolha um jogador, selecione seus itens negociaveis e envie a proposta.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="trade-player-search">Buscar jogador por nome</Label>
          <div className="flex items-center gap-2">
            <Input
              id="trade-player-search"
              value={receiverQuery}
              onChange={(event) => onReceiverQueryChange(event.target.value)}
              placeholder="Digite o nome do jogador"
            />
            <Button variant="outline" size="icon" disabled>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {loadingSearch ? <p className="text-xs text-muted-foreground">Buscando jogadores...</p> : null}

          {!loadingSearch && searchResults.length > 0 ? (
            <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border border-border/70 bg-muted/35 p-2">
              {searchResults.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  className={`w-full rounded-lg px-2 py-1 text-left text-sm transition ${
                    selectedReceiver?.id === player.id
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  onClick={() => onPickReceiver(player)}
                >
                  {player.username}
                </button>
              ))}
            </div>
          ) : null}

          {selectedReceiver ? (
            <p className="text-xs text-primary">Destino selecionado: {selectedReceiver.username}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Seus itens ofertados</Label>
          {!tradableItems.length ? (
            <p className="rounded-xl border border-border/70 bg-muted/35 p-3 text-sm text-muted-foreground">
              Nenhum item negociavel no momento.
            </p>
          ) : (
            <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
              {tradableItems.map((item) => {
                const selectedQuantity = selectedItems[item.id] ?? 0;
                return (
                  <div key={item.id} className="rounded-xl border border-border/70 bg-muted/35 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{item.definition.name}</p>
                        <p className="text-xs text-muted-foreground">Qtd disponivel: {item.quantity.toLocaleString('pt-BR')}</p>
                      </div>
                      <Badge className={ITEM_RARITY_STYLES[item.definition.rarity]}>
                        {ITEM_RARITY_LABELS[item.definition.rarity]}
                      </Badge>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={item.quantity}
                        value={selectedQuantity}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          onToggleItem(item.id, Number.isFinite(value) ? value : 0);
                        }}
                      />
                      <span className="text-xs text-muted-foreground">quantidade na oferta</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="trade-note">Mensagem (opcional)</Label>
          <Input
            id="trade-note"
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Ex.: procuro itens de producao passiva"
            maxLength={180}
          />
        </div>

        <Button
          className="w-full"
          onClick={onSubmit}
          disabled={creatingTrade || !selectedReceiver || selectedCount === 0}
        >
          <Send className="mr-2 h-4 w-4" />
          {creatingTrade ? 'Enviando...' : 'Enviar proposta'}
        </Button>
      </CardContent>
    </Card>
  );
}
