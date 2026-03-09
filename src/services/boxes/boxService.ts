import { supabase } from '@/lib/supabase';
import type {
  ActiveLootBoxRotation,
  BoxOpenResult,
  LootBoxShopState,
  SealConversionResult,
} from '@/types/systems';

export interface BoxHistoryEntry {
  id: string;
  openedAt: string;
  pricePaid: number;
  boxName: string;
  boxRarity: string;
  itemName: string;
  itemRarity: string;
}

function isRpcSignatureError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? String(error.code ?? '') : '';
  const message = 'message' in error ? String(error.message ?? '').toLowerCase() : '';

  return code === 'PGRST202'
    || message.includes('function') && message.includes('not found')
    || message.includes('could not find');
}

function normalizeRotation(input: unknown): ActiveLootBoxRotation | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const raw = input as Partial<ActiveLootBoxRotation>;
  if (!raw.rotationId || !raw.box) {
    return null;
  }

  return {
    rotationId: String(raw.rotationId),
    startsAt: String(raw.startsAt ?? new Date().toISOString()),
    endsAt: String(raw.endsAt ?? new Date().toISOString()),
    hasOpened: Boolean(raw.hasOpened),
    box: {
      ...raw.box,
      id: String(raw.box.id ?? ''),
      boxKey: String(raw.box.boxKey ?? ''),
      name: String(raw.box.name ?? 'Caixa misteriosa'),
      description: String(raw.box.description ?? 'Sem descricao'),
      rarity: (raw.box.rarity ?? 'comum') as ActiveLootBoxRotation['box']['rarity'],
      price: Number(raw.box.price ?? 0),
      spawnWeight: Number(raw.box.spawnWeight ?? 0),
      durationMinutes: Number(raw.box.durationMinutes ?? 0),
      visual: raw.box.visual ?? {},
    },
  };
}

function normalizeShopState(payload: unknown): LootBoxShopState {
  const defaultState: LootBoxShopState = {
    activeRotations: [],
    nextSpawnAt: null,
    serverNow: new Date().toISOString(),
  };

  if (!payload || typeof payload !== 'object') {
    return defaultState;
  }

  const parsed = payload as Partial<LootBoxShopState> & {
    activeRotation?: unknown;
  };

  const rotations: ActiveLootBoxRotation[] = [];

  if (Array.isArray(parsed.activeRotations)) {
    parsed.activeRotations.forEach((entry) => {
      const normalized = normalizeRotation(entry);
      if (normalized) {
        rotations.push(normalized);
      }
    });
  }

  // Compatibilidade com payload antigo (activeRotation singular)
  if (rotations.length === 0 && parsed.activeRotation) {
    const legacy = normalizeRotation(parsed.activeRotation);
    if (legacy) {
      rotations.push(legacy);
    }
  }

  return {
    activeRotations: rotations,
    nextSpawnAt: parsed.nextSpawnAt ?? null,
    serverNow: parsed.serverNow ?? defaultState.serverNow,
  };
}

async function fallbackShopStateFromTables(): Promise<LootBoxShopState> {
  const nowIso = new Date().toISOString();

  const [runtimeResult, rotationsResult] = await Promise.all([
    supabase
      .from('loot_box_runtime_state')
      .select('next_spawn_at')
      .eq('singleton_id', true)
      .maybeSingle(),
    supabase
      .from('loot_box_rotations')
      .select('id, starts_at, ends_at, loot_boxes(id, box_key, name, description, rarity, price, spawn_weight, duration_minutes, visual)')
      .eq('is_active', true)
      .gt('ends_at', nowIso)
      .order('ends_at', { ascending: true })
      .limit(2),
  ]);

  if (runtimeResult.error) {
    throw runtimeResult.error;
  }

  if (rotationsResult.error) {
    throw rotationsResult.error;
  }

  type RotationRow = {
    id: string;
    starts_at: string;
    ends_at: string;
    loot_boxes:
      | {
          id: string;
          box_key: string;
          name: string;
          description: string;
          rarity: string;
          price: number | string;
          spawn_weight: number;
          duration_minutes: number;
          visual: Record<string, unknown>;
        }
      | Array<{
          id: string;
          box_key: string;
          name: string;
          description: string;
          rarity: string;
          price: number | string;
          spawn_weight: number;
          duration_minutes: number;
          visual: Record<string, unknown>;
        }>
      | null;
  };

  const activeRotations = ((rotationsResult.data ?? []) as RotationRow[])
    .map((row) => {
      const box = Array.isArray(row.loot_boxes) ? row.loot_boxes[0] : row.loot_boxes;
      if (!box) {
        return null;
      }

      const normalized: ActiveLootBoxRotation = {
        rotationId: row.id,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        hasOpened: false,
        box: {
          id: box.id,
          boxKey: box.box_key,
          name: box.name,
          description: box.description,
          rarity: box.rarity as ActiveLootBoxRotation['box']['rarity'],
          price: Number(box.price ?? 0),
          spawnWeight: Number(box.spawn_weight ?? 0),
          durationMinutes: Number(box.duration_minutes ?? 0),
          visual: box.visual ?? {},
        },
      };

      return normalized;
    })
    .filter((item): item is ActiveLootBoxRotation => item !== null);

  return {
    activeRotations,
    nextSpawnAt: runtimeResult.data?.next_spawn_at ?? null,
    serverNow: nowIso,
  };
}

function normalizeOpenResult(payload: unknown): BoxOpenResult {
  const parsed = (payload ?? {}) as Partial<BoxOpenResult> & {
    pricePaid?: number;
    remainingResource?: number;
  };

  return {
    lootBoxKey: String(parsed.lootBoxKey ?? ''),
    rotationId: parsed.rotationId ? String(parsed.rotationId) : null,
    item: parsed.item as BoxOpenResult['item'],
    quantity: Number(parsed.quantity ?? 1),
    pricePaidDiamonds: Number(parsed.pricePaidDiamonds ?? parsed.pricePaid ?? 0),
    pricePaidSeals: Number(parsed.pricePaidSeals ?? 0),
    remainingRebirthCurrency: Number(parsed.remainingRebirthCurrency ?? 0),
    remainingDiamonds: Number(parsed.remainingDiamonds ?? 0),
  };
}

export async function getLootBoxShopState(): Promise<LootBoxShopState> {
  const { data, error } = await supabase.rpc('refresh_loot_box_shop');

  if (!error) {
    return normalizeShopState(data);
  }

  if (isRpcSignatureError(error)) {
    return fallbackShopStateFromTables();
  }

  throw error;
}

export async function openLootBox(params: {
  rotationId?: string | null;
  boxKey?: string | null;
}): Promise<BoxOpenResult> {
  if (params.rotationId) {
    const { data, error } = await supabase.rpc('open_active_loot_box', {
      p_rotation_id: params.rotationId,
    });

    if (!error) {
      return normalizeOpenResult(data);
    }

    if (!isRpcSignatureError(error)) {
      throw error;
    }
  }

  if (!params.boxKey) {
    throw new Error('Nao foi possivel identificar a caixa ativa para abrir.');
  }

  const { data, error } = await supabase.rpc('open_active_loot_box', {
    p_box_key: params.boxKey,
  });

  if (error) {
    throw error;
  }

  return normalizeOpenResult(data);
}

export async function convertSealsToDiamonds(diamonds: number): Promise<SealConversionResult> {
  const requested = Math.floor(diamonds);
  if (!Number.isFinite(requested) || requested <= 0) {
    throw new Error('Informe um valor valido de diamantes para converter.');
  }

  const { data, error } = await supabase.rpc('convert_seals_to_diamonds', {
    p_diamonds: requested,
  });

  if (error) {
    throw error;
  }

  const parsed = (data ?? {}) as Partial<SealConversionResult>;
  return {
    convertedDiamonds: Number(parsed.convertedDiamonds ?? requested),
    spentSeals: Number(parsed.spentSeals ?? requested * 1000),
    rebirthCurrency: Number(parsed.rebirthCurrency ?? 0),
    crownDiamonds: Number(parsed.crownDiamonds ?? 0),
  };
}

export async function getRecentBoxOpens(userId: string, limit = 12): Promise<BoxHistoryEntry[]> {
  const { data, error } = await supabase
    .from('box_open_history')
    .select(
      'id, opened_at, price_paid, loot_boxes(name, rarity), item_definitions(name, rarity)',
    )
    .eq('user_id', userId)
    .order('opened_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  type HistoryRow = {
    id: string;
    opened_at: string;
    price_paid: number | string;
    loot_boxes: { name: string; rarity: string } | Array<{ name: string; rarity: string }> | null;
    item_definitions: { name: string; rarity: string } | Array<{ name: string; rarity: string }> | null;
  };

  return ((data ?? []) as HistoryRow[]).map((row) => {
    const boxRow = Array.isArray(row.loot_boxes) ? row.loot_boxes[0] : row.loot_boxes;
    const itemRow = Array.isArray(row.item_definitions) ? row.item_definitions[0] : row.item_definitions;

    return {
      id: row.id,
      openedAt: row.opened_at,
      pricePaid: Number(row.price_paid ?? 0),
      boxName: boxRow?.name ?? 'Caixa desconhecida',
      boxRarity: boxRow?.rarity ?? 'comum',
      itemName: itemRow?.name ?? 'Item desconhecido',
      itemRarity: itemRow?.rarity ?? 'comum',
    };
  });
}
