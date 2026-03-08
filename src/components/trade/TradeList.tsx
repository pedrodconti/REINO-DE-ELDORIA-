import { Check, Clock3, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ITEM_RARITY_LABELS, ITEM_RARITY_STYLES } from '@/data/items';
import type { TradeRecord, UserItemRecord } from '@/types/systems';

interface TradeListProps {
  trades: TradeRecord[];
  currentUserId: string;
  tradableItems: UserItemRecord[];
  selectedCounterItems: Record<string, Record<string, number>>;
  loading: boolean;
  processingTradeId: string | null;
  onCounterItemChange: (tradeId: string, userItemId: string, quantity: number) => void;
  onAccept: (tradeId: string) => void;
  onReject: (tradeId: string) => void;
  onCancel: (tradeId: string) => void;
}

function statusLabel(status: TradeRecord['status']): string {
  switch (status) {
    case 'accepted':
      return 'Aceita';
    case 'rejected':
      return 'Recusada';
    case 'cancelled':
      return 'Cancelada';
    default:
      return 'Pendente';
  }
}

function statusClass(status: TradeRecord['status']): string {
  switch (status) {
    case 'accepted':
      return 'border-emerald-500/45 bg-emerald-500/12 text-emerald-200';
    case 'rejected':
      return 'border-destructive/45 bg-destructive/12 text-destructive';
    case 'cancelled':
      return 'border-slate-500/45 bg-slate-500/12 text-slate-200';
    default:
      return 'border-primary/45 bg-primary/12 text-primary';
  }
}

export function TradeList({
  trades,
  currentUserId,
  tradableItems,
  selectedCounterItems,
  loading,
  processingTradeId,
  onCounterItemChange,
  onAccept,
  onReject,
  onCancel,
}: TradeListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Painel de trocas</CardTitle>
        <CardDescription>Propostas recebidas, enviadas e historico recente.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? <p className="text-sm text-muted-foreground">Carregando trocas...</p> : null}

        {!loading && trades.length === 0 ? (
          <p className="rounded-xl border border-border/70 bg-muted/35 p-3 text-sm text-muted-foreground">
            Nenhuma troca registrada ainda.
          </p>
        ) : null}

        {trades.map((trade) => {
          const incoming = trade.receiverUserId === currentUserId;
          const pending = trade.status === 'pending';
          const tradeCounter = selectedCounterItems[trade.id] ?? {};
          const isProcessing = processingTradeId === trade.id;

          return (
            <div key={trade.id} className="rounded-xl border border-border/70 bg-muted/35 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">
                    {incoming ? `${trade.proposerUsername} -> voce` : `voce -> ${trade.receiverUsername}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(trade.createdAt).toLocaleString('pt-BR')}</p>
                </div>

                <Badge className={statusClass(trade.status)}>{statusLabel(trade.status)}</Badge>
              </div>

              {trade.note ? (
                <p className="mt-2 rounded-lg border border-border/70 bg-background/40 p-2 text-xs text-muted-foreground">{trade.note}</p>
              ) : null}

              <div className="mt-2 space-y-2">
                {trade.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-2 py-1.5">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.itemName}</p>
                      <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                    </div>

                    <Badge className={ITEM_RARITY_STYLES[item.itemRarity]}>{ITEM_RARITY_LABELS[item.itemRarity]}</Badge>
                  </div>
                ))}
              </div>

              {incoming && pending ? (
                <div className="mt-3 rounded-xl border border-border/70 bg-background/35 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Sua contrapartida (opcional)</p>

                  {!tradableItems.length ? (
                    <p className="mt-2 text-xs text-muted-foreground">Sem itens negociaveis para oferecer agora.</p>
                  ) : (
                    <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1">
                      {tradableItems.map((item) => (
                        <div key={`${trade.id}-${item.id}`} className="rounded-lg border border-border/60 bg-muted/35 p-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm text-foreground">{item.definition.name}</p>
                            <Badge className={ITEM_RARITY_STYLES[item.definition.rarity]}>
                              {ITEM_RARITY_LABELS[item.definition.rarity]}
                            </Badge>
                          </div>

                          <div className="mt-1 flex items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              max={item.quantity}
                              value={tradeCounter[item.id] ?? 0}
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                onCounterItemChange(trade.id, item.id, Number.isFinite(value) ? value : 0);
                              }}
                            />
                            <span className="text-xs text-muted-foreground">de {item.quantity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {pending ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {incoming ? (
                    <>
                      <Button size="sm" onClick={() => onAccept(trade.id)} disabled={isProcessing}>
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                        Aceitar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onReject(trade.id)} disabled={isProcessing}>
                        <X className="mr-1.5 h-3.5 w-3.5" />
                        Recusar
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => onCancel(trade.id)} disabled={isProcessing}>
                      <Clock3 className="mr-1.5 h-3.5 w-3.5" />
                      Cancelar proposta
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
