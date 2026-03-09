import { useEffect, useMemo, useState } from 'react';
import { Boxes, Filter, RefreshCcw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { InventoryItemGrid } from '@/components/inventory/InventoryItemGrid';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ITEM_CATEGORY_LABELS, ITEM_RARITY_LABELS, ITEM_RARITY_ORDER, ITEM_RARITY_STYLES } from '@/data/items';
import { useAuthStore } from '@/store/useAuthStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import type { ItemCategory, ItemRarity, UserItemRecord } from '@/types/systems';
import { formatLargeNumber } from '@/utils/format';
import { formatPassiveEffect } from '@/utils/itemPassives';

const rarityRank: Record<ItemRarity, number> = {
  comum: 0,
  incomum: 1,
  raro: 2,
  epico: 3,
  lendario: 4,
  mitico: 5,
};

const sortOptions = [
  { value: 'rarity_desc', label: 'Raridade (maior primeiro)' },
  { value: 'value_desc', label: 'Valor (maior primeiro)' },
  { value: 'quantity_desc', label: 'Quantidade (maior primeiro)' },
  { value: 'recent_desc', label: 'Mais recentes' },
] as const;

type SortMode = (typeof sortOptions)[number]['value'];

export function InventoryPage() {
  const user = useAuthStore((state) => state.user);
  const items = useInventoryStore((state) => state.items);
  const isLoading = useInventoryStore((state) => state.isLoading);
  const loadInventory = useInventoryStore((state) => state.loadInventory);
  const toggleEquip = useInventoryStore((state) => state.toggleEquip);
  const equipBest = useInventoryStore((state) => state.equipBest);
  const setTradable = useInventoryStore((state) => state.setTradable);

  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [isEquippingBest, setIsEquippingBest] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'all'>('all');
  const [rarityFilter, setRarityFilter] = useState<ItemRarity | 'all'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('rarity_desc');

  useEffect(() => {
    if (!user) {
      return;
    }

    void loadInventory(user.id, true);
  }, [loadInventory, user]);

  const equippedItems = useMemo(
    () =>
      items
        .filter((item) => item.isEquipped)
        .sort((a, b) => rarityRank[b.definition.rarity] - rarityRank[a.definition.rarity]),
    [items],
  );

  const filteredItems = useMemo(() => {
    let next = items.filter((item) => !item.isEquipped);

    if (categoryFilter !== 'all') {
      next = next.filter((item) => item.definition.category === categoryFilter);
    }

    if (rarityFilter !== 'all') {
      next = next.filter((item) => item.definition.rarity === rarityFilter);
    }

    next.sort((a, b) => {
      switch (sortMode) {
        case 'value_desc':
          return b.definition.baseValue - a.definition.baseValue;
        case 'quantity_desc':
          return b.quantity - a.quantity;
        case 'recent_desc':
          return new Date(b.acquiredAt).getTime() - new Date(a.acquiredAt).getTime();
        case 'rarity_desc':
        default:
          return rarityRank[b.definition.rarity] - rarityRank[a.definition.rarity];
      }
    });

    return next;
  }, [categoryFilter, items, rarityFilter, sortMode]);

  const inventoryValue = useMemo(
    () => items.reduce((acc, item) => acc + item.definition.baseValue * item.quantity, 0),
    [items],
  );

  const equippedCount = equippedItems.length;
  const tradableCount = useMemo(() => items.filter((item) => item.isMarkedTradable).length, [items]);

  const handleEquipToggle = async (item: UserItemRecord) => {
    if (!user) {
      return;
    }

    setBusyItemId(item.id);
    const result = await toggleEquip(user.id, item.id, !item.isEquipped, item.definition.category);

    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error('Falha ao atualizar equipamento', { description: result.message });
    }

    setBusyItemId(null);
  };

  const handleEquipBest = async () => {
    if (!user) {
      return;
    }

    setIsEquippingBest(true);
    const result = await equipBest(user.id);

    if (result.ok) {
      toast.success('Equipar melhores concluido', { description: result.message });
    } else {
      toast.error('Nao foi possivel equipar melhores', { description: result.message });
    }

    setIsEquippingBest(false);
  };

  const handleTradableToggle = async (item: UserItemRecord) => {
    if (!user) {
      return;
    }

    setBusyItemId(item.id);
    const result = await setTradable(user.id, item.id, !item.isMarkedTradable);

    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error('Falha ao marcar item', { description: result.message });
    }

    setBusyItemId(null);
  };

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Itens totais" value={formatLargeNumber(items.length)} detail="registros no inventario" icon={Boxes} />
        <StatCard title="Equipados" value={formatLargeNumber(equippedCount)} detail="slots ativos" icon={Boxes} />
        <StatCard title="Negociaveis" value={formatLargeNumber(tradableCount)} detail="prontos para trade" icon={Boxes} />
        <StatCard
          title="Valor total"
          value={formatLargeNumber(inventoryValue)}
          detail="estimativa de mercado"
          icon={Boxes}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Itens Equipados</CardTitle>
          <CardDescription>Somente 1 item por categoria fica ativo ao mesmo tempo.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleEquipBest} disabled={isEquippingBest || isLoading}>
              <Sparkles className="mr-2 h-4 w-4" />
              {isEquippingBest ? 'Equipando...' : 'Equipar melhores'}
            </Button>
            <Button variant="outline" onClick={() => user && void loadInventory(user.id, true)}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Atualizar inventario
            </Button>
          </div>

          {!equippedItems.length ? (
            <p className="rounded-xl border border-border/70 bg-muted/35 p-3 text-sm text-muted-foreground">
              Nenhum item equipado ainda.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {equippedItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/70 bg-muted/35 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{item.definition.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ITEM_CATEGORY_LABELS[item.definition.category]}
                      </p>
                    </div>
                    <Badge className={ITEM_RARITY_STYLES[item.definition.rarity]}>
                      {ITEM_RARITY_LABELS[item.definition.rarity]}
                    </Badge>
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground">{formatPassiveEffect(item.definition)}</p>

                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full"
                    disabled={busyItemId === item.id}
                    onClick={() => handleEquipToggle(item)}
                  >
                    Desequipar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-primary" />
            Filtros do inventario
          </CardTitle>
          <CardDescription>Refine os itens nao equipados por raridade, categoria e ordenacao.</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-3 md:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Categoria</span>
            <select
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value as ItemCategory | 'all')}
            >
              <option value="all">Todas</option>
              {Object.entries(ITEM_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Raridade</span>
            <select
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
              value={rarityFilter}
              onChange={(event) => setRarityFilter(event.target.value as ItemRarity | 'all')}
            >
              <option value="all">Todas</option>
              {ITEM_RARITY_ORDER.map((rarity) => (
                <option key={rarity} value={rarity}>
                  {rarity}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-muted-foreground">Ordenar por</span>
            <div className="flex items-center gap-2">
              <select
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <Button variant="outline" size="icon" onClick={() => user && void loadInventory(user.id, true)}>
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </label>
        </CardContent>
      </Card>

      <InventoryItemGrid
        items={filteredItems}
        loading={isLoading}
        busyItemId={busyItemId}
        onToggleEquip={handleEquipToggle}
        onToggleTradable={handleTradableToggle}
      />
    </div>
  );
}
