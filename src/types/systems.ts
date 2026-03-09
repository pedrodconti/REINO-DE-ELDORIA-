export type BoxRarity = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario' | 'mitico';

export type LootBoxKey =
  | 'caixa_comum'
  | 'caixa_mercador'
  | 'caixa_guilda'
  | 'caixa_arcana'
  | 'caixa_real'
  | 'caixa_lendaria'
  | 'caixa_celestial'
  | 'caixa_amaldicoada'
  | 'caixa_evento'
  | 'caixa_mistica';

export type ItemCategory =
  | 'amuletos'
  | 'aneis'
  | 'reliquias'
  | 'grimorios'
  | 'artefatos'
  | 'brasoes'
  | 'fragmentos'
  | 'mascotes'
  | 'talismas'
  | 'coroas'
  | 'runas';

export type ItemRarity = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario' | 'mitico';

export type ItemPassiveType =
  | 'click_flat'
  | 'passive_flat'
  | 'global_multiplier'
  | 'click_crit_chance'
  | 'building_discount'
  | 'rebirth_bonus'
  | 'item_drop_bonus'
  | 'offline_bonus'
  | 'rare_box_spawn_bonus'
  | 'box_cooldown_reduction';

export interface LootBox {
  id: string;
  boxKey: LootBoxKey | string;
  name: string;
  description: string;
  rarity: BoxRarity;
  price: number;
  spawnWeight: number;
  durationMinutes: number;
  visual: Record<string, unknown>;
}

export interface ActiveLootBoxRotation {
  rotationId: string;
  box: LootBox;
  startsAt: string;
  endsAt: string;
  hasOpened: boolean;
}

export interface LootBoxShopState {
  activeRotations: ActiveLootBoxRotation[];
  nextSpawnAt: string | null;
  serverNow: string;
}

export interface ItemDefinitionRecord {
  id: string;
  itemKey: string;
  name: string;
  description: string;
  rarity: ItemRarity;
  category: ItemCategory;
  passiveType: ItemPassiveType;
  passiveValue: number;
  stackable: boolean;
  tradable: boolean;
  baseValue: number;
  metadata: Record<string, unknown>;
}

export interface UserItemRecord {
  id: string;
  userId: string;
  itemDefinitionId: string;
  quantity: number;
  isEquipped: boolean;
  equippedSlot: string | null;
  isLockedInTrade: boolean;
  isMarkedTradable: boolean;
  acquiredAt: string;
  metadata: Record<string, unknown>;
  definition: ItemDefinitionRecord;
}

export interface BoxOpenResult {
  lootBoxKey: string;
  rotationId: string | null;
  item: ItemDefinitionRecord;
  quantity: number;
  pricePaidDiamonds: number;
  pricePaidSeals: number;
  remainingRebirthCurrency: number;
  remainingDiamonds: number;
}

export interface SealConversionResult {
  convertedDiamonds: number;
  spentSeals: number;
  rebirthCurrency: number;
  crownDiamonds: number;
}

export type LeaderboardMetric =
  | 'total_resource'
  | 'passive_income'
  | 'rebirth_count'
  | 'boxes_opened'
  | 'inventory_value'
  | 'rarest_item';

export interface LeaderboardEntry {
  userId: string;
  username: string;
  totalResource: number;
  passiveIncome: number;
  rebirthCount: number;
  boxesOpened: number;
  inventoryValue: number;
  highestItemRarity: ItemRarity | null;
  position: number;
}

export type TradeStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface TradeItemSnapshot {
  id: string;
  tradeId: string;
  ownerUserId: string;
  userItemId: string;
  quantity: number;
  itemDefinitionId: string;
  itemName: string;
  itemRarity: ItemRarity;
  itemCategory: ItemCategory;
}

export interface TradeRecord {
  id: string;
  proposerUserId: string;
  receiverUserId: string;
  proposerUsername: string;
  receiverUsername: string;
  status: TradeStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
  items: TradeItemSnapshot[];
}

export interface TradeOfferItemInput {
  userItemId: string;
  quantity: number;
}

export interface TradeSearchPlayer {
  id: string;
  username: string;
}
