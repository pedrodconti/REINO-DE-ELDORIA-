import { supabase } from '@/lib/supabase';
import type { LeaderboardCacheRow } from '@/types/supabase';
import type { LeaderboardEntry, LeaderboardMetric } from '@/types/systems';

const metricColumnMap: Record<LeaderboardMetric, keyof LeaderboardCacheRow> = {
  total_resource: 'total_resource',
  passive_income: 'passive_income',
  rebirth_count: 'rebirth_count',
  boxes_opened: 'boxes_opened',
  inventory_value: 'inventory_value',
  rarest_item: 'highest_item_tier',
};

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapEntry(row: LeaderboardCacheRow, position: number): LeaderboardEntry {
  return {
    userId: row.user_id,
    username: row.username,
    totalResource: toNumber(row.total_resource),
    passiveIncome: toNumber(row.passive_income),
    rebirthCount: row.rebirth_count ?? 0,
    boxesOpened: row.boxes_opened ?? 0,
    inventoryValue: toNumber(row.inventory_value),
    highestItemRarity: row.highest_item_rarity,
    position,
  };
}

export async function getLeaderboard(
  metric: LeaderboardMetric,
  currentUserId: string,
  limit = 25,
  offset = 0,
): Promise<{ entries: LeaderboardEntry[]; myEntry: LeaderboardEntry | null }> {
  const orderColumn = metricColumnMap[metric];

  let query = supabase
    .from('leaderboard_cache')
    .select('*')
    .order(orderColumn, { ascending: false })
    .range(offset, offset + limit - 1);

  if (metric === 'rarest_item') {
    query = query.order('inventory_value', { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rankedRows = (data ?? []) as LeaderboardCacheRow[];
  const entries = rankedRows.map((row, index) => mapEntry(row, offset + index + 1));

  const { data: meRaw, error: meError } = await supabase
    .from('leaderboard_cache')
    .select('*')
    .eq('user_id', currentUserId)
    .maybeSingle();

  if (meError) {
    throw meError;
  }

  if (!meRaw) {
    return {
      entries,
      myEntry: null,
    };
  }

  const me = meRaw as LeaderboardCacheRow;
  const myMetricValue = toNumber(me[orderColumn] as number | string);

  const { count, error: countError } = await supabase
    .from('leaderboard_cache')
    .select('*', { count: 'exact', head: true })
    .gt(orderColumn, myMetricValue);

  if (countError) {
    throw countError;
  }

  return {
    entries,
    myEntry: mapEntry(me, (count ?? 0) + 1),
  };
}
