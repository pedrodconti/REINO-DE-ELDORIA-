-- =========================================================
-- Reino de Eldoria - Gathering MVP (coleta, ferramentas, construcoes, comerciante)
-- Data: 2026-03-10
-- Idempotente: pode rodar mais de uma vez
-- =========================================================

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------
-- Tabelas de materiais
-- ---------------------------------------------------------
create table if not exists public.material_definitions (
  id uuid primary key default gen_random_uuid(),
  material_key text not null unique,
  name text not null,
  description text not null,
  rarity text not null check (rarity in ('comum', 'raro')),
  area_key text not null check (area_key in ('floresta', 'ravina')),
  is_building_material boolean not null default false,
  base_sell_value numeric not null default 0 check (base_sell_value >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_materials (
  user_id uuid not null references auth.users(id) on delete cascade,
  material_definition_id uuid not null references public.material_definitions(id) on delete cascade,
  quantity numeric not null default 0 check (quantity >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, material_definition_id)
);

-- ---------------------------------------------------------
-- Tabelas de ferramentas
-- ---------------------------------------------------------
create table if not exists public.tool_definitions (
  id uuid primary key default gen_random_uuid(),
  tool_key text not null unique,
  name text not null,
  tool_type text not null check (tool_type in ('machado', 'picareta')),
  tier integer not null check (tier >= 1),
  rarity text not null check (rarity in ('comum', 'incomum', 'raro', 'epico', 'lendario', 'mitico')),
  buy_cost_gold numeric not null default 0 check (buy_cost_gold >= 0),
  is_box_only boolean not null default false,
  base_speed numeric not null default 0 check (base_speed >= 0),
  base_yield numeric not null default 0 check (base_yield >= 0),
  base_luck numeric not null default 0 check (base_luck >= 0),
  base_duplicate_chance numeric not null default 0 check (base_duplicate_chance >= 0 and base_duplicate_chance <= 1),
  base_rare_drop_chance numeric not null default 0 check (base_rare_drop_chance >= 0 and base_rare_drop_chance <= 1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_tools (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_definition_id uuid not null references public.tool_definitions(id) on delete cascade,
  is_owned boolean not null default false,
  is_equipped boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, tool_definition_id)
);

create table if not exists public.tool_upgrades (
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_definition_id uuid not null references public.tool_definitions(id) on delete cascade,
  speed_level integer not null default 0 check (speed_level >= 0),
  yield_level integer not null default 0 check (yield_level >= 0),
  luck_level integer not null default 0 check (luck_level >= 0),
  duplicate_level integer not null default 0 check (duplicate_level >= 0),
  rare_drop_level integer not null default 0 check (rare_drop_level >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, tool_definition_id)
);

-- ---------------------------------------------------------
-- Tabelas de construcoes
-- ---------------------------------------------------------
create table if not exists public.building_definitions (
  id uuid primary key default gen_random_uuid(),
  building_key text not null unique,
  name text not null,
  description text not null,
  base_gold_cost numeric not null check (base_gold_cost >= 0),
  base_wood_cost numeric not null check (base_wood_cost >= 0),
  base_stone_cost numeric not null check (base_stone_cost >= 0),
  gold_growth numeric not null default 1.15 check (gold_growth > 1),
  wood_growth numeric not null default 1.12 check (wood_growth > 1),
  stone_growth numeric not null default 1.12 check (stone_growth > 1),
  gold_per_second numeric not null default 0 check (gold_per_second >= 0),
  unlock_rebirth_required integer not null default 0 check (unlock_rebirth_required >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_buildings (
  user_id uuid not null references auth.users(id) on delete cascade,
  building_definition_id uuid not null references public.building_definitions(id) on delete cascade,
  owned_count integer not null default 0 check (owned_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, building_definition_id)
);

-- ---------------------------------------------------------
-- Comerciante e buffs de coleta
-- ---------------------------------------------------------
create table if not exists public.merchant_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  material_definition_id uuid not null references public.material_definitions(id) on delete restrict,
  quantity numeric not null check (quantity > 0),
  gold_earned numeric not null check (gold_earned >= 0),
  bonus_type text null check (bonus_type is null or bonus_type in ('collection_luck', 'collection_yield', 'gold_bonus')),
  bonus_value numeric not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_collection_buffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  buff_type text not null check (buff_type in ('collection_luck', 'collection_yield', 'gold_bonus')),
  buff_value numeric not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------
-- Indices
-- ---------------------------------------------------------
create index if not exists idx_material_definitions_area on public.material_definitions (area_key, rarity);
create index if not exists idx_user_materials_user on public.user_materials (user_id);
create index if not exists idx_user_materials_definition on public.user_materials (material_definition_id);

create index if not exists idx_tool_definitions_type_tier on public.tool_definitions (tool_type, tier);
create index if not exists idx_user_tools_user on public.user_tools (user_id, is_owned, is_equipped);
create index if not exists idx_tool_upgrades_user on public.tool_upgrades (user_id);

create index if not exists idx_building_definitions_unlock on public.building_definitions (unlock_rebirth_required, base_gold_cost);
create index if not exists idx_user_buildings_user on public.user_buildings (user_id);

create index if not exists idx_merchant_transactions_user_created on public.merchant_transactions (user_id, created_at desc);
create index if not exists idx_user_collection_buffs_user_expires on public.user_collection_buffs (user_id, expires_at desc);

-- ---------------------------------------------------------
-- Triggers de updated_at
-- ---------------------------------------------------------
drop trigger if exists material_definitions_set_updated_at on public.material_definitions;
create trigger material_definitions_set_updated_at
before update on public.material_definitions
for each row execute function public.set_updated_at();

drop trigger if exists user_materials_set_updated_at on public.user_materials;
create trigger user_materials_set_updated_at
before update on public.user_materials
for each row execute function public.set_updated_at();

drop trigger if exists tool_definitions_set_updated_at on public.tool_definitions;
create trigger tool_definitions_set_updated_at
before update on public.tool_definitions
for each row execute function public.set_updated_at();

drop trigger if exists user_tools_set_updated_at on public.user_tools;
create trigger user_tools_set_updated_at
before update on public.user_tools
for each row execute function public.set_updated_at();

drop trigger if exists tool_upgrades_set_updated_at on public.tool_upgrades;
create trigger tool_upgrades_set_updated_at
before update on public.tool_upgrades
for each row execute function public.set_updated_at();

drop trigger if exists building_definitions_set_updated_at on public.building_definitions;
create trigger building_definitions_set_updated_at
before update on public.building_definitions
for each row execute function public.set_updated_at();

drop trigger if exists user_buildings_set_updated_at on public.user_buildings;
create trigger user_buildings_set_updated_at
before update on public.user_buildings
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- Regra: apenas 1 ferramenta equipada por tipo (machado/picareta)
-- ---------------------------------------------------------
create or replace function public.ensure_single_equipped_tool_per_type()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tool_type text;
begin
  if not new.is_owned then
    new.is_equipped := false;
    return new;
  end if;

  if not new.is_equipped then
    return new;
  end if;

  select td.tool_type
    into v_tool_type
  from public.tool_definitions td
  where td.id = new.tool_definition_id;

  if v_tool_type is null then
    raise exception 'Ferramenta invalida para equipamento.';
  end if;

  update public.user_tools ut
  set
    is_equipped = false,
    updated_at = timezone('utc', now())
  from public.tool_definitions td
  where ut.user_id = new.user_id
    and (new.id is null or ut.id <> new.id)
    and ut.tool_definition_id = td.id
    and td.tool_type = v_tool_type
    and ut.is_equipped = true;

  return new;
end;
$$;

drop trigger if exists user_tools_single_equipped_by_type on public.user_tools;
create trigger user_tools_single_equipped_by_type
before insert or update of is_equipped, is_owned, tool_definition_id, user_id
on public.user_tools
for each row
execute function public.ensure_single_equipped_tool_per_type();

-- ---------------------------------------------------------
-- RLS
-- ---------------------------------------------------------
alter table public.material_definitions enable row level security;
alter table public.user_materials enable row level security;
alter table public.tool_definitions enable row level security;
alter table public.user_tools enable row level security;
alter table public.tool_upgrades enable row level security;
alter table public.building_definitions enable row level security;
alter table public.user_buildings enable row level security;
alter table public.merchant_transactions enable row level security;
alter table public.user_collection_buffs enable row level security;

drop policy if exists "material_definitions_select_auth" on public.material_definitions;
create policy "material_definitions_select_auth"
on public.material_definitions
for select
to authenticated
using (true);

drop policy if exists "tool_definitions_select_auth" on public.tool_definitions;
create policy "tool_definitions_select_auth"
on public.tool_definitions
for select
to authenticated
using (true);

drop policy if exists "building_definitions_select_auth" on public.building_definitions;
create policy "building_definitions_select_auth"
on public.building_definitions
for select
to authenticated
using (true);

drop policy if exists "user_materials_select_own" on public.user_materials;
drop policy if exists "user_materials_insert_own" on public.user_materials;
drop policy if exists "user_materials_update_own" on public.user_materials;
drop policy if exists "user_materials_delete_own" on public.user_materials;
create policy "user_materials_select_own" on public.user_materials for select to authenticated using (auth.uid() = user_id);
create policy "user_materials_insert_own" on public.user_materials for insert to authenticated with check (auth.uid() = user_id);
create policy "user_materials_update_own" on public.user_materials for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_materials_delete_own" on public.user_materials for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "user_tools_select_own" on public.user_tools;
drop policy if exists "user_tools_insert_own" on public.user_tools;
drop policy if exists "user_tools_update_own" on public.user_tools;
drop policy if exists "user_tools_delete_own" on public.user_tools;
create policy "user_tools_select_own" on public.user_tools for select to authenticated using (auth.uid() = user_id);
create policy "user_tools_insert_own" on public.user_tools for insert to authenticated with check (auth.uid() = user_id);
create policy "user_tools_update_own" on public.user_tools for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_tools_delete_own" on public.user_tools for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "tool_upgrades_select_own" on public.tool_upgrades;
drop policy if exists "tool_upgrades_insert_own" on public.tool_upgrades;
drop policy if exists "tool_upgrades_update_own" on public.tool_upgrades;
drop policy if exists "tool_upgrades_delete_own" on public.tool_upgrades;
create policy "tool_upgrades_select_own" on public.tool_upgrades for select to authenticated using (auth.uid() = user_id);
create policy "tool_upgrades_insert_own" on public.tool_upgrades for insert to authenticated with check (auth.uid() = user_id);
create policy "tool_upgrades_update_own" on public.tool_upgrades for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tool_upgrades_delete_own" on public.tool_upgrades for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "user_buildings_select_own" on public.user_buildings;
drop policy if exists "user_buildings_insert_own" on public.user_buildings;
drop policy if exists "user_buildings_update_own" on public.user_buildings;
drop policy if exists "user_buildings_delete_own" on public.user_buildings;
create policy "user_buildings_select_own" on public.user_buildings for select to authenticated using (auth.uid() = user_id);
create policy "user_buildings_insert_own" on public.user_buildings for insert to authenticated with check (auth.uid() = user_id);
create policy "user_buildings_update_own" on public.user_buildings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_buildings_delete_own" on public.user_buildings for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "merchant_transactions_select_own" on public.merchant_transactions;
drop policy if exists "merchant_transactions_insert_own" on public.merchant_transactions;
create policy "merchant_transactions_select_own" on public.merchant_transactions for select to authenticated using (auth.uid() = user_id);
create policy "merchant_transactions_insert_own" on public.merchant_transactions for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "user_collection_buffs_select_own" on public.user_collection_buffs;
drop policy if exists "user_collection_buffs_insert_own" on public.user_collection_buffs;
drop policy if exists "user_collection_buffs_update_own" on public.user_collection_buffs;
drop policy if exists "user_collection_buffs_delete_own" on public.user_collection_buffs;
create policy "user_collection_buffs_select_own" on public.user_collection_buffs for select to authenticated using (auth.uid() = user_id);
create policy "user_collection_buffs_insert_own" on public.user_collection_buffs for insert to authenticated with check (auth.uid() = user_id);
create policy "user_collection_buffs_update_own" on public.user_collection_buffs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_collection_buffs_delete_own" on public.user_collection_buffs for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- Seeds - materiais
-- ---------------------------------------------------------
insert into public.material_definitions (
  material_key, name, description, rarity, area_key, is_building_material, base_sell_value
)
values
  ('madeira', 'Madeira', 'Troncos comuns da Floresta de Avel.', 'comum', 'floresta', true, 0),
  ('pedra', 'Pedra', 'Rochas comuns da Ravina de Ferro-Bruma.', 'comum', 'ravina', true, 0),
  ('madeira_antiga', 'Madeira Antiga', 'Madeira densa de arvores milenares.', 'raro', 'floresta', false, 80),
  ('madeira_encantada', 'Madeira Encantada', 'Lenho raro energizado por magia antiga.', 'raro', 'floresta', false, 260),
  ('madeira_mistica', 'Madeira Mistica', 'Nucleo vegetal de valor extraordinario.', 'raro', 'floresta', false, 920),
  ('ferro_bruto', 'Ferro Bruto', 'Minerio inicial extraido da ravina.', 'raro', 'ravina', false, 95),
  ('cristal', 'Cristal', 'Cristal puro usado por arcanistas.', 'raro', 'ravina', false, 280),
  ('obsidiana', 'Obsidiana', 'Rocha vulcanica rara de alta resistencia.', 'raro', 'ravina', false, 980),
  ('minerio_arcano', 'Minerio Arcano', 'Veio magico extremamente escasso.', 'raro', 'ravina', false, 4200)
on conflict (material_key) do update
set
  name = excluded.name,
  description = excluded.description,
  rarity = excluded.rarity,
  area_key = excluded.area_key,
  is_building_material = excluded.is_building_material,
  base_sell_value = excluded.base_sell_value,
  updated_at = timezone('utc', now());

-- ---------------------------------------------------------
-- Seeds - ferramentas
-- ---------------------------------------------------------
insert into public.tool_definitions (
  tool_key, name, tool_type, tier, rarity, buy_cost_gold, is_box_only,
  base_speed, base_yield, base_luck, base_duplicate_chance, base_rare_drop_chance
)
values
  ('machado_madeira', 'Machado de Madeira', 'machado', 1, 'comum', 100, false, 0.05, 0.02, 0.00, 0.01, 0.00),
  ('machado_pedra', 'Machado de Pedra', 'machado', 2, 'incomum', 1200, false, 0.09, 0.05, 0.01, 0.02, 0.01),
  ('machado_ferro', 'Machado de Ferro', 'machado', 3, 'raro', 8500, false, 0.13, 0.08, 0.02, 0.03, 0.02),
  ('machado_ouro', 'Machado de Ouro', 'machado', 4, 'epico', 52000, false, 0.17, 0.12, 0.03, 0.04, 0.03),
  ('machado_diamante', 'Machado de Diamante', 'machado', 5, 'lendario', 280000, false, 0.22, 0.17, 0.05, 0.06, 0.05),
  ('machado_draconico', 'Machado Draconico', 'machado', 6, 'mitico', 0, true, 0.30, 0.24, 0.08, 0.08, 0.07),

  ('picareta_madeira', 'Picareta de Madeira', 'picareta', 1, 'comum', 100, false, 0.05, 0.02, 0.00, 0.01, 0.00),
  ('picareta_pedra', 'Picareta de Pedra', 'picareta', 2, 'incomum', 1200, false, 0.09, 0.05, 0.01, 0.02, 0.01),
  ('picareta_ferro', 'Picareta de Ferro', 'picareta', 3, 'raro', 8500, false, 0.13, 0.08, 0.02, 0.03, 0.02),
  ('picareta_ouro', 'Picareta de Ouro', 'picareta', 4, 'epico', 52000, false, 0.17, 0.12, 0.03, 0.04, 0.03),
  ('picareta_diamante', 'Picareta de Diamante', 'picareta', 5, 'lendario', 280000, false, 0.22, 0.17, 0.05, 0.06, 0.05),
  ('picareta_draconica', 'Picareta Draconica', 'picareta', 6, 'mitico', 0, true, 0.30, 0.24, 0.08, 0.08, 0.07)
on conflict (tool_key) do update
set
  name = excluded.name,
  tool_type = excluded.tool_type,
  tier = excluded.tier,
  rarity = excluded.rarity,
  buy_cost_gold = excluded.buy_cost_gold,
  is_box_only = excluded.is_box_only,
  base_speed = excluded.base_speed,
  base_yield = excluded.base_yield,
  base_luck = excluded.base_luck,
  base_duplicate_chance = excluded.base_duplicate_chance,
  base_rare_drop_chance = excluded.base_rare_drop_chance,
  updated_at = timezone('utc', now());

-- ---------------------------------------------------------
-- Seeds - construcoes (desbloqueio por rebirth em passos de 10)
-- ---------------------------------------------------------
insert into public.building_definitions (
  building_key, name, description, base_gold_cost, base_wood_cost, base_stone_cost,
  gold_growth, wood_growth, stone_growth, gold_per_second, unlock_rebirth_required
)
values
  ('cabana_lenhador', 'Cabana do Lenhador', 'Equipe basica para cortar e processar troncos.', 180, 35, 10, 1.15, 1.12, 1.12, 0.6, 0),
  ('pedreira_ravina', 'Pedreira da Ravina', 'Extração inicial de rochas para o reino.', 260, 20, 40, 1.15, 1.12, 1.12, 0.9, 0),
  ('serraria_da_aurora', 'Serraria da Aurora', 'Processa madeira em escala comercial.', 1400, 260, 180, 1.15, 1.12, 1.12, 4.4, 10),
  ('forja_ferro_bruma', 'Forja Ferro-Bruma', 'Centro metalurgico com alto rendimento.', 9800, 1300, 1200, 1.15, 1.12, 1.12, 28, 20),
  ('fortaleza_arcaica', 'Fortaleza Arcaica', 'Estrutura pesada de producao e defesa.', 68000, 9200, 9600, 1.15, 1.12, 1.12, 165, 30),
  ('bastiao_celeste', 'Bastiao Celeste', 'Marco imperial de coleta e industria.', 420000, 64000, 71000, 1.15, 1.12, 1.12, 980, 40)
on conflict (building_key) do update
set
  name = excluded.name,
  description = excluded.description,
  base_gold_cost = excluded.base_gold_cost,
  base_wood_cost = excluded.base_wood_cost,
  base_stone_cost = excluded.base_stone_cost,
  gold_growth = excluded.gold_growth,
  wood_growth = excluded.wood_growth,
  stone_growth = excluded.stone_growth,
  gold_per_second = excluded.gold_per_second,
  unlock_rebirth_required = excluded.unlock_rebirth_required,
  updated_at = timezone('utc', now());
