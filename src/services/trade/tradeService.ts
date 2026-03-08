import { supabase } from '@/lib/supabase';
import type { TradeRecord, TradeSearchPlayer, TradeStatus, TradeOfferItemInput } from '@/types/systems';
import type { TradeItemRow, TradeRow } from '@/types/supabase';

export async function searchPlayersByUsername(query: string, currentUserId: string): Promise<TradeSearchPlayer[]> {
  const normalized = query.trim();
  if (!normalized) {
    return [];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username')
    .ilike('username', `%${normalized}%`)
    .neq('id', currentUserId)
    .not('username', 'is', null)
    .limit(12);

  if (error) {
    throw error;
  }

  type ProfileLookup = {
    id: string;
    username: string | null;
  };

  return ((data ?? []) as ProfileLookup[]).map((row) => ({
    id: row.id,
    username: row.username ?? 'SemNome',
  }));
}

export async function createTradeOffer(
  receiverUsername: string,
  offeredItems: TradeOfferItemInput[],
  note: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('create_trade_offer', {
    p_receiver_username: receiverUsername,
    p_offered_items: offeredItems,
    p_note: note || null,
  });

  if (error) {
    throw error;
  }

  return String(data);
}

export async function respondTrade(
  tradeId: string,
  action: TradeStatus,
  receiverItems: TradeOfferItemInput[] = [],
): Promise<void> {
  const { error } = await supabase.rpc('respond_trade', {
    p_trade_id: tradeId,
    p_action: action,
    p_receiver_items: receiverItems,
  });

  if (error) {
    throw error;
  }
}

export async function getMyTrades(userId: string): Promise<TradeRecord[]> {
  const { data: tradesRaw, error: tradesError } = await supabase
    .from('trades')
    .select('*')
    .or(`proposer_user_id.eq.${userId},receiver_user_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(80);

  if (tradesError) {
    throw tradesError;
  }

  const trades = (tradesRaw ?? []) as TradeRow[];
  if (trades.length === 0) {
    return [];
  }

  const userIds = Array.from(
    new Set(trades.flatMap((trade) => [trade.proposer_user_id, trade.receiver_user_id])),
  );

  const tradeIds = trades.map((trade) => trade.id);

  const [profilesResult, itemsResult] = await Promise.all([
    supabase.from('profiles').select('id, username').in('id', userIds),
    supabase.from('trade_items').select('*').in('trade_id', tradeIds),
  ]);

  if (profilesResult.error) {
    throw profilesResult.error;
  }

  if (itemsResult.error) {
    throw itemsResult.error;
  }

  const profileMap = new Map<string, string>();
  type ProfileLookup = {
    id: string;
    username: string | null;
  };

  ((profilesResult.data ?? []) as ProfileLookup[]).forEach((profile) => {
    profileMap.set(profile.id, profile.username ?? 'Sem nome');
  });

  const groupedItems = new Map<string, TradeItemRow[]>();
  ((itemsResult.data ?? []) as TradeItemRow[]).forEach((item) => {
    const list = groupedItems.get(item.trade_id) ?? [];
    list.push(item);
    groupedItems.set(item.trade_id, list);
  });

  return trades.map((trade) => ({
    id: trade.id,
    proposerUserId: trade.proposer_user_id,
    receiverUserId: trade.receiver_user_id,
    proposerUsername: profileMap.get(trade.proposer_user_id) ?? 'Desconhecido',
    receiverUsername: profileMap.get(trade.receiver_user_id) ?? 'Desconhecido',
    status: trade.status,
    note: trade.note,
    createdAt: trade.created_at,
    updatedAt: trade.updated_at,
    respondedAt: trade.responded_at,
    items: (groupedItems.get(trade.id) ?? []).map((item) => ({
      id: item.id,
      tradeId: item.trade_id,
      ownerUserId: item.owner_user_id,
      userItemId: item.user_item_id,
      quantity: item.quantity,
      itemDefinitionId: item.item_definition_id,
      itemName: item.item_name,
      itemRarity: item.item_rarity,
      itemCategory: item.item_category,
    })),
  }));
}
