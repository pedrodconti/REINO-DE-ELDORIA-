import { supabase } from '@/lib/supabase';
import type {
  BuildingDefinitionRecord,
  GatherDropResult,
  MaterialDefinitionRecord,
  MerchantBuffRecord,
  ToolDefinitionRecord,
  ToolUpgradeRecord,
  ToolWithState,
  UserBuildingRecord,
  UserMaterialRecord,
  UserToolRecord,
} from '@/types/gathering';
import type {
  BuildingDefinitionRow,
  MaterialDefinitionRow,
  MerchantTransactionRow,
  NumericValue,
  ToolDefinitionRow,
  ToolUpgradeRow,
  UserBuildingRow,
  UserCollectionBuffRow,
  UserMaterialRow,
  UserToolRow,
} from '@/types/supabase';

function toNumber(value: NumericValue | null | undefined, fallback = 0): number {
  if (value === null || value === undefined) {
    return fallback;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapMaterialDefinition(row: MaterialDefinitionRow): MaterialDefinitionRecord {
  return {
    id: row.id,
    materialKey: row.material_key,
    name: row.name,
    description: row.description,
    rarity: row.rarity,
    areaKey: row.area_key,
    isBuildingMaterial: row.is_building_material,
    baseSellValue: toNumber(row.base_sell_value),
  };
}

function mapUserMaterial(row: UserMaterialRow): UserMaterialRecord {
  return {
    userId: row.user_id,
    materialDefinitionId: row.material_definition_id,
    quantity: toNumber(row.quantity),
  };
}

function mapToolDefinition(row: ToolDefinitionRow): ToolDefinitionRecord {
  return {
    id: row.id,
    toolKey: row.tool_key,
    name: row.name,
    toolType: row.tool_type,
    tier: row.tier,
    rarity: row.rarity,
    buyCostGold: toNumber(row.buy_cost_gold),
    isBoxOnly: row.is_box_only,
    baseSpeed: toNumber(row.base_speed),
    baseYield: toNumber(row.base_yield),
    baseLuck: toNumber(row.base_luck),
    baseDuplicateChance: toNumber(row.base_duplicate_chance),
    baseRareDropChance: toNumber(row.base_rare_drop_chance),
  };
}

function mapUserTool(row: UserToolRow): UserToolRecord {
  return {
    id: row.id,
    userId: row.user_id,
    toolDefinitionId: row.tool_definition_id,
    isOwned: row.is_owned,
    isEquipped: row.is_equipped,
  };
}

function mapToolUpgrade(row: ToolUpgradeRow): ToolUpgradeRecord {
  return {
    userId: row.user_id,
    toolDefinitionId: row.tool_definition_id,
    speedLevel: row.speed_level,
    yieldLevel: row.yield_level,
    luckLevel: row.luck_level,
    duplicateLevel: row.duplicate_level,
    rareDropLevel: row.rare_drop_level,
  };
}

function mapBuildingDefinition(row: BuildingDefinitionRow): BuildingDefinitionRecord {
  return {
    id: row.id,
    buildingKey: row.building_key,
    name: row.name,
    description: row.description,
    baseGoldCost: toNumber(row.base_gold_cost),
    baseWoodCost: toNumber(row.base_wood_cost),
    baseStoneCost: toNumber(row.base_stone_cost),
    goldGrowth: toNumber(row.gold_growth, 1.15),
    woodGrowth: toNumber(row.wood_growth, 1.12),
    stoneGrowth: toNumber(row.stone_growth, 1.12),
    goldPerSecond: toNumber(row.gold_per_second),
    unlockRebirthRequired: row.unlock_rebirth_required,
  };
}

function mapUserBuilding(row: UserBuildingRow): UserBuildingRecord {
  return {
    userId: row.user_id,
    buildingDefinitionId: row.building_definition_id,
    ownedCount: row.owned_count,
  };
}

function mapMerchantBuff(row: UserCollectionBuffRow): MerchantBuffRecord {
  return {
    id: row.id,
    userId: row.user_id,
    buffType: row.buff_type,
    buffValue: toNumber(row.buff_value),
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

export async function loadMaterialDefinitions(): Promise<MaterialDefinitionRecord[]> {
  const { data, error } = await supabase
    .from('material_definitions')
    .select('*')
    .order('is_building_material', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as MaterialDefinitionRow[]).map(mapMaterialDefinition);
}

export async function loadToolDefinitions(): Promise<ToolDefinitionRecord[]> {
  const { data, error } = await supabase
    .from('tool_definitions')
    .select('*')
    .order('tool_type', { ascending: true })
    .order('tier', { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as ToolDefinitionRow[]).map(mapToolDefinition);
}

export async function loadBuildingDefinitions(): Promise<BuildingDefinitionRecord[]> {
  const { data, error } = await supabase
    .from('building_definitions')
    .select('*')
    .order('unlock_rebirth_required', { ascending: true })
    .order('base_gold_cost', { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as BuildingDefinitionRow[]).map(mapBuildingDefinition);
}

export async function loadUserMaterials(userId: string): Promise<UserMaterialRecord[]> {
  const { data, error } = await supabase
    .from('user_materials')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return ((data ?? []) as UserMaterialRow[]).map(mapUserMaterial);
}

export async function loadUserTools(userId: string): Promise<UserToolRecord[]> {
  const { data, error } = await supabase
    .from('user_tools')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return ((data ?? []) as UserToolRow[]).map(mapUserTool);
}

export async function loadToolUpgrades(userId: string): Promise<ToolUpgradeRecord[]> {
  const { data, error } = await supabase
    .from('tool_upgrades')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return ((data ?? []) as ToolUpgradeRow[]).map(mapToolUpgrade);
}

export async function loadUserBuildings(userId: string): Promise<UserBuildingRecord[]> {
  const { data, error } = await supabase
    .from('user_buildings')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return ((data ?? []) as UserBuildingRow[]).map(mapUserBuilding);
}

export async function loadActiveMerchantBuff(userId: string): Promise<MerchantBuffRecord | null> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('user_collection_buffs')
    .select('*')
    .eq('user_id', userId)
    .gt('expires_at', nowIso)
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapMerchantBuff(data as UserCollectionBuffRow);
}

export async function ensureStarterTools(params: {
  userId: string;
  toolDefinitions: ToolDefinitionRecord[];
  currentTools: UserToolRecord[];
}): Promise<void> {
  if (params.currentTools.length > 0) {
    return;
  }

  const starter = params.toolDefinitions.filter((tool) => tool.tier === 1 && !tool.isBoxOnly);
  if (starter.length === 0) {
    return;
  }

  const payload = starter.map((tool) => ({
    user_id: params.userId,
    tool_definition_id: tool.id,
    is_owned: true,
    is_equipped: true,
  }));

  const { error } = await supabase
    .from('user_tools')
    .upsert(payload, { onConflict: 'user_id,tool_definition_id' });

  if (error) {
    throw error;
  }
}

export async function upsertUserMaterial(userId: string, materialDefinitionId: string, quantity: number): Promise<void> {
  const { error } = await supabase
    .from('user_materials')
    .upsert(
      {
        user_id: userId,
        material_definition_id: materialDefinitionId,
        quantity: Math.max(0, quantity),
      },
      { onConflict: 'user_id,material_definition_id' },
    );

  if (error) {
    throw error;
  }
}

export async function updateToolOwnership(params: {
  userId: string;
  toolDefinitionId: string;
  owned: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from('user_tools')
    .upsert(
      {
        user_id: params.userId,
        tool_definition_id: params.toolDefinitionId,
        is_owned: params.owned,
        is_equipped: false,
      },
      { onConflict: 'user_id,tool_definition_id' },
    );

  if (error) {
    throw error;
  }
}

export async function equipToolByType(params: {
  userId: string;
  toolType: string;
  toolDefinitionId: string;
  toolDefinitionMap: Map<string, ToolDefinitionRecord>;
}): Promise<void> {
  const { data, error } = await supabase
    .from('user_tools')
    .select('*')
    .eq('user_id', params.userId);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as UserToolRow[];

  const updates = rows
    .filter((row) => {
      const def = params.toolDefinitionMap.get(row.tool_definition_id);
      return def?.toolType === params.toolType;
    })
    .map((row) => ({
      id: row.id,
      is_equipped: row.tool_definition_id === params.toolDefinitionId,
    }));

  if (updates.length === 0) {
    return;
  }

  const { error: updateError } = await supabase.from('user_tools').upsert(updates, { onConflict: 'id' });
  if (updateError) {
    throw updateError;
  }
}

export async function upsertToolUpgrade(params: {
  userId: string;
  toolDefinitionId: string;
  next: ToolUpgradeRecord;
}): Promise<void> {
  const payload = {
    user_id: params.userId,
    tool_definition_id: params.toolDefinitionId,
    speed_level: params.next.speedLevel,
    yield_level: params.next.yieldLevel,
    luck_level: params.next.luckLevel,
    duplicate_level: params.next.duplicateLevel,
    rare_drop_level: params.next.rareDropLevel,
  };

  const { error } = await supabase
    .from('tool_upgrades')
    .upsert(payload, { onConflict: 'user_id,tool_definition_id' });

  if (error) {
    throw error;
  }
}

export async function upsertUserBuilding(params: {
  userId: string;
  buildingDefinitionId: string;
  ownedCount: number;
}): Promise<void> {
  const { error } = await supabase
    .from('user_buildings')
    .upsert(
      {
        user_id: params.userId,
        building_definition_id: params.buildingDefinitionId,
        owned_count: Math.max(0, params.ownedCount),
      },
      { onConflict: 'user_id,building_definition_id' },
    );

  if (error) {
    throw error;
  }
}

export async function createMerchantTransaction(params: {
  userId: string;
  materialDefinitionId: string;
  quantity: number;
  goldEarned: number;
  bonusType: MerchantTransactionRow['bonus_type'];
  bonusValue: number;
}): Promise<void> {
  const { error } = await supabase
    .from('merchant_transactions')
    .insert({
      user_id: params.userId,
      material_definition_id: params.materialDefinitionId,
      quantity: params.quantity,
      gold_earned: params.goldEarned,
      bonus_type: params.bonusType,
      bonus_value: params.bonusValue,
    });

  if (error) {
    throw error;
  }
}

export async function replaceActiveMerchantBuff(params: {
  userId: string;
  buffType: MerchantBuffRecord['buffType'];
  buffValue: number;
  expiresAt: string;
}): Promise<void> {
  const { error: deleteError } = await supabase
    .from('user_collection_buffs')
    .delete()
    .eq('user_id', params.userId)
    .gt('expires_at', new Date().toISOString());

  if (deleteError) {
    throw deleteError;
  }

  const { error } = await supabase
    .from('user_collection_buffs')
    .insert({
      user_id: params.userId,
      buff_type: params.buffType,
      buff_value: params.buffValue,
      expires_at: params.expiresAt,
    });

  if (error) {
    throw error;
  }
}

export function composeToolState(params: {
  definitions: ToolDefinitionRecord[];
  userTools: UserToolRecord[];
  upgrades: ToolUpgradeRecord[];
}): ToolWithState[] {
  const userToolMap = new Map(params.userTools.map((row) => [row.toolDefinitionId, row]));
  const upgradeMap = new Map(params.upgrades.map((row) => [row.toolDefinitionId, row]));

  return params.definitions.map((definition) => ({
    definition,
    state: userToolMap.get(definition.id) ?? {
      id: '',
      userId: '',
      toolDefinitionId: definition.id,
      isOwned: false,
      isEquipped: false,
    },
    upgrades: upgradeMap.get(definition.id) ?? {
      userId: '',
      toolDefinitionId: definition.id,
      speedLevel: 0,
      yieldLevel: 0,
      luckLevel: 0,
      duplicateLevel: 0,
      rareDropLevel: 0,
    },
  }));
}

export function materialMapByKey(definitions: MaterialDefinitionRecord[]) {
  return new Map(definitions.map((definition) => [definition.materialKey, definition]));
}

export function buildingMapByKey(definitions: BuildingDefinitionRecord[]) {
  return new Map(definitions.map((definition) => [definition.buildingKey, definition]));
}

export function toolMapByKey(tools: ToolWithState[]) {
  return new Map(tools.map((tool) => [tool.definition.toolKey, tool]));
}

export function materialNameMap(definitions: MaterialDefinitionRecord[]) {
  return new Map(definitions.map((definition) => [definition.materialKey, definition.name]));
}

export function applyDropsToMaterialState(
  materialQuantities: Record<string, number>,
  drops: GatherDropResult[],
): Record<string, number> {
  const next = { ...materialQuantities };

  drops.forEach((drop) => {
    next[drop.materialKey] = Math.max(0, (next[drop.materialKey] ?? 0) + drop.amount);
  });

  return next;
}

