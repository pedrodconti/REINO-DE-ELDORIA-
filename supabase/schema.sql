-- =========================================================
-- Reino de Eldoria - Schema completo (base + caixas + inventario + ranking + trade)
-- Executar no SQL Editor do Supabase (idempotente)
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- Funcoes utilitarias
-- ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.rarity_tier(p_rarity text)
returns integer
language sql
immutable
as $$
  select case lower(coalesce(p_rarity, 'comum'))
    when 'mitico' then 6
    when 'lendario' then 5
    when 'epico' then 4
    when 'raro' then 3
    when 'incomum' then 2
    else 1
  end;
$$;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base_username text;
  v_final_username text;
begin
  v_base_username := nullif(regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '[^a-zA-Z0-9_]+', '', 'g'), '');

  if v_base_username is null then
    v_base_username := 'aventureiro_' || substring(new.id::text from 1 for 8);
  end if;

  v_final_username := lower(v_base_username);

  if exists (select 1 from public.profiles p where lower(p.username) = v_final_username) then
    v_final_username := v_final_username || '_' || substring(new.id::text from 1 for 4);
  end if;

  insert into public.profiles (id, username)
  values (new.id, v_final_username)
  on conflict (id) do update
  set username = coalesce(public.profiles.username, excluded.username);

  return new;
end;
$$;

-- ---------------------------------------------------------
-- Tabelas base (perfil + save + rebirth)
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.game_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  resource_amount numeric not null default 0 check (resource_amount >= 0),
  total_resource_earned numeric not null default 0 check (total_resource_earned >= 0),
  click_power numeric not null default 1 check (click_power >= 0),
  passive_income numeric not null default 0 check (passive_income >= 0),
  global_multiplier numeric not null default 1 check (global_multiplier >= 0),
  rebirth_count integer not null default 0 check (rebirth_count >= 0),
  rebirth_currency numeric not null default 0 check (rebirth_currency >= 0),
  buildings jsonb not null default '{}'::jsonb,
  upgrades jsonb not null default '[]'::jsonb,
  achievements jsonb not null default '[]'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  last_save_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.rebirth_upgrades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  upgrade_key text not null,
  level integer not null default 0 check (level >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, upgrade_key)
);

create table if not exists public.optional_leaderboard (
  user_id uuid primary key references auth.users(id) on delete cascade,
  best_total_resource numeric not null default 0,
  rebirth_count integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists idx_profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

create index if not exists idx_game_saves_user_id on public.game_saves (user_id);
create index if not exists idx_game_saves_last_save_at on public.game_saves (last_save_at desc);
create index if not exists idx_game_saves_total_resource on public.game_saves (total_resource_earned desc);
create index if not exists idx_rebirth_upgrades_user_id on public.rebirth_upgrades (user_id);
create index if not exists idx_rebirth_upgrades_upgrade_key on public.rebirth_upgrades (upgrade_key);
create index if not exists idx_optional_leaderboard_score
  on public.optional_leaderboard (best_total_resource desc, rebirth_count desc);

-- ---------------------------------------------------------
-- Novas tabelas: caixas + inventario + ranking + trade
-- ---------------------------------------------------------
create table if not exists public.loot_boxes (
  id uuid primary key default gen_random_uuid(),
  box_key text not null unique,
  name text not null,
  description text not null,
  rarity text not null check (rarity in ('comum', 'incomum', 'raro', 'epico', 'lendario', 'mitico')),
  price numeric not null check (price >= 0),
  spawn_weight numeric not null default 1 check (spawn_weight > 0),
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  min_gap_minutes integer not null default 10 check (min_gap_minutes >= 0),
  max_gap_minutes integer not null default 30 check (max_gap_minutes >= min_gap_minutes),
  active boolean not null default true,
  visual jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.loot_box_rotations (
  id uuid primary key default gen_random_uuid(),
  loot_box_id uuid not null references public.loot_boxes(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  check (ends_at > starts_at)
);

create table if not exists public.loot_box_runtime_state (
  singleton_id boolean primary key default true,
  active_rotation_id uuid null references public.loot_box_rotations(id) on delete set null,
  next_spawn_at timestamptz null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.item_definitions (
  id uuid primary key default gen_random_uuid(),
  item_key text not null unique,
  name text not null,
  description text not null,
  rarity text not null check (rarity in ('comum', 'incomum', 'raro', 'epico', 'lendario', 'mitico')),
  category text not null check (category in ('amuletos', 'aneis', 'reliquias', 'grimorios', 'artefatos', 'brasoes', 'fragmentos', 'mascotes', 'talismas', 'coroas', 'runas')),
  passive_type text not null check (passive_type in ('click_flat', 'passive_flat', 'global_multiplier', 'click_crit_chance', 'building_discount', 'rebirth_bonus', 'item_drop_bonus', 'offline_bonus', 'rare_box_spawn_bonus', 'box_cooldown_reduction')),
  passive_value numeric not null default 0,
  stackable boolean not null default false,
  tradable boolean not null default true,
  base_value numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.loot_box_item_pool (
  id uuid primary key default gen_random_uuid(),
  loot_box_id uuid not null references public.loot_boxes(id) on delete cascade,
  item_definition_id uuid not null references public.item_definitions(id) on delete cascade,
  weight numeric not null check (weight > 0),
  min_quantity integer not null default 1 check (min_quantity > 0),
  max_quantity integer not null default 1 check (max_quantity >= min_quantity),
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (loot_box_id, item_definition_id)
);

create table if not exists public.user_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_definition_id uuid not null references public.item_definitions(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  is_equipped boolean not null default false,
  equipped_slot text null,
  is_locked_in_trade boolean not null default false,
  is_marked_tradable boolean not null default false,
  acquired_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.box_open_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  loot_box_id uuid not null references public.loot_boxes(id) on delete restrict,
  item_definition_id uuid not null references public.item_definitions(id) on delete restrict,
  opened_at timestamptz not null default timezone('utc', now()),
  price_paid numeric not null check (price_paid >= 0)
);

create table if not exists public.leaderboard_cache (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  total_resource numeric not null default 0,
  passive_income numeric not null default 0,
  rebirth_count integer not null default 0,
  boxes_opened integer not null default 0,
  inventory_value numeric not null default 0,
  highest_item_rarity text null check (highest_item_rarity is null or highest_item_rarity in ('comum', 'incomum', 'raro', 'epico', 'lendario', 'mitico')),
  highest_item_tier integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  proposer_user_id uuid not null references auth.users(id) on delete cascade,
  receiver_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  note text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  responded_at timestamptz null,
  check (proposer_user_id <> receiver_user_id)
);

create table if not exists public.trade_items (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  user_item_id uuid not null references public.user_items(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  item_definition_id uuid not null references public.item_definitions(id) on delete restrict,
  item_name text not null,
  item_rarity text not null,
  item_category text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_loot_boxes_active on public.loot_boxes (active, spawn_weight desc);
create index if not exists idx_loot_box_rotations_active on public.loot_box_rotations (is_active, starts_at desc);
create index if not exists idx_loot_box_rotations_time on public.loot_box_rotations (starts_at desc, ends_at desc);
create index if not exists idx_item_definitions_rarity on public.item_definitions (rarity, category);
create index if not exists idx_loot_box_pool_loot_box on public.loot_box_item_pool (loot_box_id);
create index if not exists idx_loot_box_pool_item on public.loot_box_item_pool (item_definition_id);
create index if not exists idx_user_items_user on public.user_items (user_id, is_equipped, is_locked_in_trade);
create index if not exists idx_user_items_item on public.user_items (item_definition_id);
create index if not exists idx_box_open_history_user on public.box_open_history (user_id, opened_at desc);
create index if not exists idx_leaderboard_total on public.leaderboard_cache (total_resource desc);
create index if not exists idx_leaderboard_passive on public.leaderboard_cache (passive_income desc);
create index if not exists idx_leaderboard_rebirth on public.leaderboard_cache (rebirth_count desc);
create index if not exists idx_leaderboard_boxes on public.leaderboard_cache (boxes_opened desc);
create index if not exists idx_leaderboard_inventory on public.leaderboard_cache (inventory_value desc);
create index if not exists idx_leaderboard_rare on public.leaderboard_cache (highest_item_tier desc, inventory_value desc);
create index if not exists idx_trades_participants on public.trades (proposer_user_id, receiver_user_id, status, created_at desc);
create index if not exists idx_trades_receiver_pending on public.trades (receiver_user_id, status, created_at desc);
create index if not exists idx_trade_items_trade on public.trade_items (trade_id);
create index if not exists idx_trade_items_owner on public.trade_items (owner_user_id);

insert into public.loot_box_runtime_state (singleton_id, active_rotation_id, next_spawn_at)
values (true, null, null)
on conflict (singleton_id) do nothing;

-- ---------------------------------------------------------
-- Triggers idempotentes
-- ---------------------------------------------------------
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists game_saves_set_updated_at on public.game_saves;
create trigger game_saves_set_updated_at
before update on public.game_saves
for each row
execute function public.set_updated_at();

drop trigger if exists rebirth_upgrades_set_updated_at on public.rebirth_upgrades;
create trigger rebirth_upgrades_set_updated_at
before update on public.rebirth_upgrades
for each row
execute function public.set_updated_at();

drop trigger if exists optional_leaderboard_set_updated_at on public.optional_leaderboard;
create trigger optional_leaderboard_set_updated_at
before update on public.optional_leaderboard
for each row
execute function public.set_updated_at();

drop trigger if exists loot_boxes_set_updated_at on public.loot_boxes;
create trigger loot_boxes_set_updated_at
before update on public.loot_boxes
for each row
execute function public.set_updated_at();

drop trigger if exists user_items_set_updated_at on public.user_items;
create trigger user_items_set_updated_at
before update on public.user_items
for each row
execute function public.set_updated_at();

drop trigger if exists trades_set_updated_at on public.trades;
create trigger trades_set_updated_at
before update on public.trades
for each row
execute function public.set_updated_at();

drop trigger if exists runtime_state_set_updated_at on public.loot_box_runtime_state;
create trigger runtime_state_set_updated_at
before update on public.loot_box_runtime_state
for each row
execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

-- ---------------------------------------------------------
-- Backfill profiles faltantes
-- ---------------------------------------------------------
insert into public.profiles (id, username)
select
  u.id,
  lower(
    coalesce(
      nullif(regexp_replace(split_part(coalesce(u.email, ''), '@', 1), '[^a-zA-Z0-9_]+', '', 'g'), ''),
      'aventureiro_' || substring(u.id::text from 1 for 8)
    )
  )
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- ---------------------------------------------------------
-- Refresh do cache de ranking
-- ---------------------------------------------------------
create or replace function public.refresh_leaderboard_cache_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_total_resource numeric := 0;
  v_passive_income numeric := 0;
  v_rebirth_count integer := 0;
  v_boxes_opened integer := 0;
  v_inventory_value numeric := 0;
  v_highest_rarity text;
  v_highest_tier integer := 0;
begin
  if p_user_id is null then
    return;
  end if;

  select coalesce(nullif(trim(p.username), ''), 'Aventureiro')
    into v_username
  from public.profiles p
  where p.id = p_user_id;

  if v_username is null then
    v_username := 'Aventureiro';
  end if;

  select
    coalesce(gs.total_resource_earned, 0),
    coalesce(gs.passive_income, 0),
    coalesce(gs.rebirth_count, 0),
    coalesce((gs.stats ->> 'boxesOpened')::integer, 0)
  into
    v_total_resource,
    v_passive_income,
    v_rebirth_count,
    v_boxes_opened
  from public.game_saves gs
  where gs.user_id = p_user_id;

  select
    coalesce(sum(ui.quantity * idf.base_value), 0),
    max(public.rarity_tier(idf.rarity)),
    (
      array_agg(idf.rarity order by public.rarity_tier(idf.rarity) desc, idf.base_value desc)
    )[1]
  into
    v_inventory_value,
    v_highest_tier,
    v_highest_rarity
  from public.user_items ui
  join public.item_definitions idf on idf.id = ui.item_definition_id
  where ui.user_id = p_user_id;

  insert into public.leaderboard_cache (
    user_id,
    username,
    total_resource,
    passive_income,
    rebirth_count,
    boxes_opened,
    inventory_value,
    highest_item_rarity,
    highest_item_tier,
    updated_at
  )
  values (
    p_user_id,
    v_username,
    coalesce(v_total_resource, 0),
    coalesce(v_passive_income, 0),
    coalesce(v_rebirth_count, 0),
    coalesce(v_boxes_opened, 0),
    coalesce(v_inventory_value, 0),
    v_highest_rarity,
    coalesce(v_highest_tier, 0),
    timezone('utc', now())
  )
  on conflict (user_id) do update
  set
    username = excluded.username,
    total_resource = excluded.total_resource,
    passive_income = excluded.passive_income,
    rebirth_count = excluded.rebirth_count,
    boxes_opened = excluded.boxes_opened,
    inventory_value = excluded.inventory_value,
    highest_item_rarity = excluded.highest_item_rarity,
    highest_item_tier = excluded.highest_item_tier,
    updated_at = timezone('utc', now());
end;
$$;

create or replace function public.trg_refresh_leaderboard_from_game_save()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_leaderboard_cache_for_user(new.user_id);
  return new;
end;
$$;

create or replace function public.trg_refresh_leaderboard_from_user_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := coalesce(new.user_id, old.user_id);
  perform public.refresh_leaderboard_cache_for_user(v_user_id);
  return coalesce(new, old);
end;
$$;

create or replace function public.trg_refresh_leaderboard_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_leaderboard_cache_for_user(new.id);
  return new;
end;
$$;

drop trigger if exists trg_leaderboard_from_save on public.game_saves;
create trigger trg_leaderboard_from_save
after insert or update on public.game_saves
for each row
execute function public.trg_refresh_leaderboard_from_game_save();

drop trigger if exists trg_leaderboard_from_items on public.user_items;
create trigger trg_leaderboard_from_items
after insert or update or delete on public.user_items
for each row
execute function public.trg_refresh_leaderboard_from_user_items();

drop trigger if exists trg_leaderboard_from_profile on public.profiles;
create trigger trg_leaderboard_from_profile
after update of username on public.profiles
for each row
execute function public.trg_refresh_leaderboard_from_profile();

-- ---------------------------------------------------------
-- RLS
-- ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.game_saves enable row level security;
alter table public.rebirth_upgrades enable row level security;
alter table public.optional_leaderboard enable row level security;
alter table public.loot_boxes enable row level security;
alter table public.loot_box_rotations enable row level security;
alter table public.loot_box_runtime_state enable row level security;
alter table public.item_definitions enable row level security;
alter table public.loot_box_item_pool enable row level security;
alter table public.user_items enable row level security;
alter table public.box_open_history enable row level security;
alter table public.leaderboard_cache enable row level security;
alter table public.trades enable row level security;
alter table public.trade_items enable row level security;

-- profiles
 drop policy if exists "profiles_select_authenticated" on public.profiles;
 drop policy if exists "profiles_insert_own" on public.profiles;
 drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- game_saves
 drop policy if exists "game_saves_select_own" on public.game_saves;
 drop policy if exists "game_saves_insert_own" on public.game_saves;
 drop policy if exists "game_saves_update_own" on public.game_saves;
 drop policy if exists "game_saves_delete_own" on public.game_saves;

create policy "game_saves_select_own"
on public.game_saves
for select
to authenticated
using (auth.uid() = user_id);

create policy "game_saves_insert_own"
on public.game_saves
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "game_saves_update_own"
on public.game_saves
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "game_saves_delete_own"
on public.game_saves
for delete
to authenticated
using (auth.uid() = user_id);

-- rebirth_upgrades
 drop policy if exists "rebirth_upgrades_select_own" on public.rebirth_upgrades;
 drop policy if exists "rebirth_upgrades_insert_own" on public.rebirth_upgrades;
 drop policy if exists "rebirth_upgrades_update_own" on public.rebirth_upgrades;
 drop policy if exists "rebirth_upgrades_delete_own" on public.rebirth_upgrades;

create policy "rebirth_upgrades_select_own"
on public.rebirth_upgrades
for select
to authenticated
using (auth.uid() = user_id);

create policy "rebirth_upgrades_insert_own"
on public.rebirth_upgrades
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "rebirth_upgrades_update_own"
on public.rebirth_upgrades
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "rebirth_upgrades_delete_own"
on public.rebirth_upgrades
for delete
to authenticated
using (auth.uid() = user_id);

-- optional_leaderboard
 drop policy if exists "optional_leaderboard_read_authenticated" on public.optional_leaderboard;
 drop policy if exists "optional_leaderboard_insert_own" on public.optional_leaderboard;
 drop policy if exists "optional_leaderboard_update_own" on public.optional_leaderboard;

create policy "optional_leaderboard_read_authenticated"
on public.optional_leaderboard
for select
to authenticated
using (true);

create policy "optional_leaderboard_insert_own"
on public.optional_leaderboard
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "optional_leaderboard_update_own"
on public.optional_leaderboard
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- catalogos publicos do jogo
 drop policy if exists "loot_boxes_read_authenticated" on public.loot_boxes;
 drop policy if exists "loot_box_rotations_read_authenticated" on public.loot_box_rotations;
 drop policy if exists "loot_box_runtime_read_authenticated" on public.loot_box_runtime_state;
 drop policy if exists "item_definitions_read_authenticated" on public.item_definitions;
 drop policy if exists "loot_box_item_pool_read_authenticated" on public.loot_box_item_pool;

create policy "loot_boxes_read_authenticated"
on public.loot_boxes
for select
to authenticated
using (true);

create policy "loot_box_rotations_read_authenticated"
on public.loot_box_rotations
for select
to authenticated
using (true);

create policy "loot_box_runtime_read_authenticated"
on public.loot_box_runtime_state
for select
to authenticated
using (true);

create policy "item_definitions_read_authenticated"
on public.item_definitions
for select
to authenticated
using (true);

create policy "loot_box_item_pool_read_authenticated"
on public.loot_box_item_pool
for select
to authenticated
using (true);

-- user_items
 drop policy if exists "user_items_select_own" on public.user_items;
 drop policy if exists "user_items_insert_own" on public.user_items;
 drop policy if exists "user_items_update_own" on public.user_items;
 drop policy if exists "user_items_delete_own" on public.user_items;

create policy "user_items_select_own"
on public.user_items
for select
to authenticated
using (auth.uid() = user_id);

create policy "user_items_insert_own"
on public.user_items
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "user_items_update_own"
on public.user_items
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_items_delete_own"
on public.user_items
for delete
to authenticated
using (auth.uid() = user_id);

-- box_open_history
 drop policy if exists "box_open_history_select_own" on public.box_open_history;

create policy "box_open_history_select_own"
on public.box_open_history
for select
to authenticated
using (auth.uid() = user_id);

-- leaderboard_cache
 drop policy if exists "leaderboard_cache_read_authenticated" on public.leaderboard_cache;

create policy "leaderboard_cache_read_authenticated"
on public.leaderboard_cache
for select
to authenticated
using (true);

-- trades
 drop policy if exists "trades_select_participant" on public.trades;
 drop policy if exists "trades_insert_proposer" on public.trades;
 drop policy if exists "trades_update_participant" on public.trades;

create policy "trades_select_participant"
on public.trades
for select
to authenticated
using (auth.uid() = proposer_user_id or auth.uid() = receiver_user_id);

create policy "trades_insert_proposer"
on public.trades
for insert
to authenticated
with check (auth.uid() = proposer_user_id and proposer_user_id <> receiver_user_id);

create policy "trades_update_participant"
on public.trades
for update
to authenticated
using (auth.uid() = proposer_user_id or auth.uid() = receiver_user_id)
with check (auth.uid() = proposer_user_id or auth.uid() = receiver_user_id);

-- trade_items
 drop policy if exists "trade_items_select_participant" on public.trade_items;

create policy "trade_items_select_participant"
on public.trade_items
for select
to authenticated
using (
  auth.uid() = owner_user_id
  or exists (
    select 1
    from public.trades t
    where t.id = trade_items.trade_id
      and (t.proposer_user_id = auth.uid() or t.receiver_user_id = auth.uid())
  )
);

-- ---------------------------------------------------------
-- Funcoes criticas (RPC)
-- ---------------------------------------------------------
create or replace function public.refresh_loot_box_shop()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_state public.loot_box_runtime_state%rowtype;
  v_active_rotation public.loot_box_rotations%rowtype;
  v_box public.loot_boxes%rowtype;
  v_gap_minutes integer;
begin
  insert into public.loot_box_runtime_state (singleton_id, active_rotation_id, next_spawn_at)
  values (true, null, null)
  on conflict (singleton_id) do nothing;

  select *
    into v_state
  from public.loot_box_runtime_state
  where singleton_id = true
  for update;

  if v_state.active_rotation_id is not null then
    select *
      into v_active_rotation
    from public.loot_box_rotations
    where id = v_state.active_rotation_id;

    if found and v_active_rotation.ends_at <= v_now then
      update public.loot_box_rotations
      set is_active = false
      where id = v_active_rotation.id;

      v_state.active_rotation_id := null;
      update public.loot_box_runtime_state
      set active_rotation_id = null
      where singleton_id = true;
    end if;
  end if;

  if v_state.active_rotation_id is null then
    if v_state.next_spawn_at is null then
      update public.loot_box_runtime_state
      set next_spawn_at = v_now
      where singleton_id = true;
      v_state.next_spawn_at := v_now;
    end if;

    if v_state.next_spawn_at <= v_now then
      select lb.*
        into v_box
      from public.loot_boxes lb
      where lb.active = true
      order by -ln(greatest(random(), 0.000001)) / greatest(lb.spawn_weight, 0.000001)
      limit 1;

      if found then
        insert into public.loot_box_rotations (loot_box_id, starts_at, ends_at, is_active)
        values (
          v_box.id,
          v_now,
          v_now + make_interval(mins => v_box.duration_minutes),
          true
        )
        returning * into v_active_rotation;

        v_gap_minutes := floor(v_box.min_gap_minutes + random() * greatest(v_box.max_gap_minutes - v_box.min_gap_minutes + 1, 1));

        update public.loot_box_runtime_state
        set
          active_rotation_id = v_active_rotation.id,
          next_spawn_at = v_active_rotation.ends_at + make_interval(mins => v_gap_minutes),
          updated_at = timezone('utc', now())
        where singleton_id = true;
      end if;
    end if;
  else
    select *
      into v_active_rotation
    from public.loot_box_rotations
    where id = v_state.active_rotation_id;

    if found then
      select *
        into v_box
      from public.loot_boxes
      where id = v_active_rotation.loot_box_id;
    end if;
  end if;

  return jsonb_build_object(
    'serverNow', v_now,
    'nextSpawnAt', (select next_spawn_at from public.loot_box_runtime_state where singleton_id = true),
    'activeRotation',
    case
      when v_active_rotation.id is null then null
      else jsonb_build_object(
        'rotationId', v_active_rotation.id,
        'startsAt', v_active_rotation.starts_at,
        'endsAt', v_active_rotation.ends_at,
        'nextSpawnAt', (select next_spawn_at from public.loot_box_runtime_state where singleton_id = true),
        'box', jsonb_build_object(
          'id', v_box.id,
          'boxKey', v_box.box_key,
          'name', v_box.name,
          'description', v_box.description,
          'rarity', v_box.rarity,
          'price', v_box.price,
          'spawnWeight', v_box.spawn_weight,
          'durationMinutes', v_box.duration_minutes,
          'visual', v_box.visual
        )
      )
    end
  );
end;
$$;

create or replace function public.open_active_loot_box(p_box_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_shop jsonb;
  v_rotation_id uuid;
  v_rotation public.loot_box_rotations%rowtype;
  v_box public.loot_boxes%rowtype;
  v_save public.game_saves%rowtype;
  v_pool record;
  v_item public.item_definitions%rowtype;
  v_quantity integer;
  v_item_drop_bonus numeric := 0;
  v_target_stack_id uuid;
begin
  if v_uid is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  v_shop := public.refresh_loot_box_shop();

  if v_shop -> 'activeRotation' is null then
    raise exception 'Nenhuma caixa ativa no momento.';
  end if;

  v_rotation_id := (v_shop -> 'activeRotation' ->> 'rotationId')::uuid;

  select *
    into v_rotation
  from public.loot_box_rotations
  where id = v_rotation_id
  for update;

  if not found then
    raise exception 'Rotacao de caixa invalida.';
  end if;

  if timezone('utc', now()) > v_rotation.ends_at then
    raise exception 'Esta caixa acabou de expirar.';
  end if;

  select *
    into v_box
  from public.loot_boxes
  where id = v_rotation.loot_box_id
  for update;

  if not found then
    raise exception 'Caixa da rotacao nao encontrada.';
  end if;

  if v_box.box_key <> p_box_key then
    raise exception 'A caixa solicitada nao esta ativa.';
  end if;

  insert into public.game_saves (user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  select *
    into v_save
  from public.game_saves
  where user_id = v_uid
  for update;

  if v_save.resource_amount < v_box.price then
    raise exception 'Saldo insuficiente para abrir esta caixa.';
  end if;

  select coalesce(sum(idf.passive_value * ui.quantity), 0)
    into v_item_drop_bonus
  from public.user_items ui
  join public.item_definitions idf on idf.id = ui.item_definition_id
  where ui.user_id = v_uid
    and ui.is_equipped = true
    and idf.passive_type = 'item_drop_bonus';

  select
    pool.item_definition_id,
    pool.min_quantity,
    pool.max_quantity
  into v_pool
  from public.loot_box_item_pool pool
  join public.item_definitions idf on idf.id = pool.item_definition_id
  where pool.loot_box_id = v_box.id
    and pool.enabled = true
  order by -ln(greatest(random(), 0.000001)) / greatest(
    pool.weight * (1 + public.rarity_tier(idf.rarity) * least(v_item_drop_bonus, 3) * 0.12),
    0.000001
  )
  limit 1;

  if v_pool.item_definition_id is null then
    raise exception 'Pool de itens desta caixa esta vazio.';
  end if;

  select *
    into v_item
  from public.item_definitions
  where id = v_pool.item_definition_id;

  v_quantity := floor(v_pool.min_quantity + random() * greatest(v_pool.max_quantity - v_pool.min_quantity + 1, 1));
  v_quantity := greatest(v_quantity, 1);

  update public.game_saves gs
  set
    resource_amount = gs.resource_amount - v_box.price,
    stats = jsonb_set(
      coalesce(gs.stats, '{}'::jsonb),
      '{boxesOpened}',
      to_jsonb(coalesce((gs.stats ->> 'boxesOpened')::integer, 0) + 1),
      true
    ),
    last_save_at = timezone('utc', now())
  where gs.user_id = v_uid;

  if v_item.stackable then
    with target as (
      select ui.id
      from public.user_items ui
      where ui.user_id = v_uid
        and ui.item_definition_id = v_item.id
        and ui.is_equipped = false
        and ui.is_locked_in_trade = false
        and ui.is_marked_tradable = false
      order by ui.acquired_at asc
      limit 1
    )
    update public.user_items ui
    set
      quantity = ui.quantity + v_quantity,
      updated_at = timezone('utc', now())
    from target
    where ui.id = target.id
    returning ui.id into v_target_stack_id;
  end if;

  if v_target_stack_id is null then
    insert into public.user_items (
      user_id,
      item_definition_id,
      quantity,
      is_equipped,
      equipped_slot,
      is_locked_in_trade,
      is_marked_tradable,
      metadata
    )
    values (
      v_uid,
      v_item.id,
      v_quantity,
      false,
      null,
      false,
      false,
      '{}'::jsonb
    )
    returning id into v_target_stack_id;
  end if;

  insert into public.box_open_history (user_id, loot_box_id, item_definition_id, opened_at, price_paid)
  values (v_uid, v_box.id, v_item.id, timezone('utc', now()), v_box.price);

  perform public.refresh_leaderboard_cache_for_user(v_uid);

  return jsonb_build_object(
    'lootBoxKey', v_box.box_key,
    'item', jsonb_build_object(
      'id', v_item.id,
      'itemKey', v_item.item_key,
      'name', v_item.name,
      'description', v_item.description,
      'rarity', v_item.rarity,
      'category', v_item.category,
      'passiveType', v_item.passive_type,
      'passiveValue', v_item.passive_value,
      'stackable', v_item.stackable,
      'tradable', v_item.tradable,
      'baseValue', v_item.base_value,
      'metadata', v_item.metadata
    ),
    'quantity', v_quantity,
    'pricePaid', v_box.price,
    'remainingResource', (select gs.resource_amount from public.game_saves gs where gs.user_id = v_uid)
  );
end;
$$;

create or replace function public.set_item_equipped(p_user_item_id uuid, p_equip boolean, p_slot text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_item public.user_items%rowtype;
  v_definition public.item_definitions%rowtype;
  v_slot text;
begin
  if v_uid is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  select *
    into v_item
  from public.user_items
  where id = p_user_item_id
    and user_id = v_uid
  for update;

  if not found then
    raise exception 'Item nao encontrado no inventario.';
  end if;

  select * into v_definition from public.item_definitions where id = v_item.item_definition_id;

  if p_equip then
    if v_item.is_locked_in_trade then
      raise exception 'Item bloqueado em trade e nao pode equipar.';
    end if;

    if v_definition.stackable and v_item.quantity > 1 then
      raise exception 'Item stackavel com quantidade > 1 precisa ser separado antes de equipar.';
    end if;

    v_slot := coalesce(nullif(trim(p_slot), ''), v_definition.category);

    update public.user_items
    set is_equipped = false,
        equipped_slot = null,
        updated_at = timezone('utc', now())
    where user_id = v_uid
      and is_equipped = true
      and equipped_slot = v_slot;

    update public.user_items
    set
      is_equipped = true,
      equipped_slot = v_slot,
      is_marked_tradable = false,
      updated_at = timezone('utc', now())
    where id = v_item.id;
  else
    update public.user_items
    set
      is_equipped = false,
      equipped_slot = null,
      updated_at = timezone('utc', now())
    where id = v_item.id;
  end if;
end;
$$;

create or replace function public.create_trade_offer(
  p_receiver_username text,
  p_offered_items jsonb,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_receiver_id uuid;
  v_trade_id uuid;
  v_item jsonb;
  v_user_item_id uuid;
  v_quantity integer;
  v_seen_ids uuid[] := array[]::uuid[];
  v_user_item record;
begin
  if v_uid is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if p_offered_items is null or jsonb_typeof(p_offered_items) <> 'array' or jsonb_array_length(p_offered_items) = 0 then
    raise exception 'A trade precisa ter ao menos um item ofertado.';
  end if;

  select p.id
    into v_receiver_id
  from public.profiles p
  where lower(p.username) = lower(trim(p_receiver_username))
  limit 1;

  if v_receiver_id is null then
    raise exception 'Jogador destino nao encontrado.';
  end if;

  if v_receiver_id = v_uid then
    raise exception 'Nao e possivel enviar trade para voce mesmo.';
  end if;

  insert into public.trades (proposer_user_id, receiver_user_id, status, note)
  values (v_uid, v_receiver_id, 'pending', nullif(trim(p_note), ''))
  returning id into v_trade_id;

  for v_item in
    select * from jsonb_array_elements(p_offered_items)
  loop
    v_user_item_id := (v_item ->> 'userItemId')::uuid;
    v_quantity := greatest(coalesce((v_item ->> 'quantity')::integer, 1), 1);

    if v_user_item_id is null then
      raise exception 'Item invalido na proposta.';
    end if;

    if v_user_item_id = any(v_seen_ids) then
      raise exception 'Item duplicado na proposta.';
    end if;

    v_seen_ids := array_append(v_seen_ids, v_user_item_id);

    select
      ui.*,
      idf.name as def_name,
      idf.rarity as def_rarity,
      idf.category as def_category,
      idf.tradable as def_tradable
    into v_user_item
    from public.user_items ui
    join public.item_definitions idf on idf.id = ui.item_definition_id
    where ui.id = v_user_item_id
      and ui.user_id = v_uid
    for update;

    if not found then
      raise exception 'Um item da proposta nao pertence ao jogador.';
    end if;

    if v_user_item.is_equipped then
      raise exception 'Itens equipados nao podem ser negociados.';
    end if;

    if v_user_item.is_locked_in_trade then
      raise exception 'Um item da proposta ja esta travado em outra trade.';
    end if;

    if not v_user_item.is_marked_tradable or not v_user_item.def_tradable then
      raise exception 'Um item da proposta nao esta marcado como negociavel.';
    end if;

    if v_user_item.quantity < v_quantity then
      raise exception 'Quantidade invalida para um item da proposta.';
    end if;

    update public.user_items
    set is_locked_in_trade = true,
        updated_at = timezone('utc', now())
    where id = v_user_item_id;

    insert into public.trade_items (
      trade_id,
      owner_user_id,
      user_item_id,
      quantity,
      item_definition_id,
      item_name,
      item_rarity,
      item_category
    )
    values (
      v_trade_id,
      v_uid,
      v_user_item_id,
      v_quantity,
      v_user_item.item_definition_id,
      v_user_item.def_name,
      v_user_item.def_rarity,
      v_user_item.def_category
    );
  end loop;

  return v_trade_id;
end;
$$;

create or replace function public.respond_trade(
  p_trade_id uuid,
  p_action text,
  p_receiver_items jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_trade public.trades%rowtype;
  v_item jsonb;
  v_user_item_id uuid;
  v_quantity integer;
  v_seen_ids uuid[] := array[]::uuid[];
  v_user_item record;
  v_transfer record;
  v_source_item public.user_items%rowtype;
  v_target_user uuid;
  v_stackable boolean;
  v_target_stack_id uuid;
begin
  if v_uid is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if p_action not in ('accepted', 'rejected', 'cancelled') then
    raise exception 'Acao de trade invalida.';
  end if;

  select *
    into v_trade
  from public.trades
  where id = p_trade_id
  for update;

  if not found then
    raise exception 'Trade nao encontrada.';
  end if;

  if v_trade.status <> 'pending' then
    raise exception 'Trade nao esta mais pendente.';
  end if;

  if p_action = 'cancelled' and v_uid <> v_trade.proposer_user_id then
    raise exception 'Somente quem propôs pode cancelar.';
  end if;

  if p_action in ('accepted', 'rejected') and v_uid <> v_trade.receiver_user_id then
    raise exception 'Somente o destinatario pode responder.';
  end if;

  if p_action = 'rejected' then
    update public.trades
    set status = 'rejected', responded_at = timezone('utc', now()), updated_at = timezone('utc', now())
    where id = p_trade_id;

    update public.user_items
    set is_locked_in_trade = false,
        updated_at = timezone('utc', now())
    where id in (select ti.user_item_id from public.trade_items ti where ti.trade_id = p_trade_id);

    return;
  end if;

  if p_action = 'cancelled' then
    update public.trades
    set status = 'cancelled', responded_at = timezone('utc', now()), updated_at = timezone('utc', now())
    where id = p_trade_id;

    update public.user_items
    set is_locked_in_trade = false,
        updated_at = timezone('utc', now())
    where id in (select ti.user_item_id from public.trade_items ti where ti.trade_id = p_trade_id);

    return;
  end if;

  if p_receiver_items is null then
    p_receiver_items := '[]'::jsonb;
  end if;

  if jsonb_typeof(p_receiver_items) <> 'array' then
    raise exception 'Contrapartida invalida.';
  end if;

  for v_item in
    select * from jsonb_array_elements(p_receiver_items)
  loop
    v_user_item_id := (v_item ->> 'userItemId')::uuid;
    v_quantity := greatest(coalesce((v_item ->> 'quantity')::integer, 1), 1);

    if v_user_item_id is null then
      raise exception 'Item invalido na contrapartida.';
    end if;

    if v_user_item_id = any(v_seen_ids) then
      raise exception 'Item duplicado na contrapartida.';
    end if;

    v_seen_ids := array_append(v_seen_ids, v_user_item_id);

    select
      ui.*,
      idf.name as def_name,
      idf.rarity as def_rarity,
      idf.category as def_category,
      idf.tradable as def_tradable
    into v_user_item
    from public.user_items ui
    join public.item_definitions idf on idf.id = ui.item_definition_id
    where ui.id = v_user_item_id
      and ui.user_id = v_uid
    for update;

    if not found then
      raise exception 'Item de contrapartida nao pertence ao destinatario.';
    end if;

    if v_user_item.is_equipped then
      raise exception 'Itens equipados nao podem entrar na contrapartida.';
    end if;

    if v_user_item.is_locked_in_trade then
      raise exception 'Um item de contrapartida ja esta travado.';
    end if;

    if not v_user_item.is_marked_tradable or not v_user_item.def_tradable then
      raise exception 'Um item de contrapartida nao esta liberado para trade.';
    end if;

    if v_user_item.quantity < v_quantity then
      raise exception 'Quantidade invalida na contrapartida.';
    end if;

    update public.user_items
    set is_locked_in_trade = true,
        updated_at = timezone('utc', now())
    where id = v_user_item_id;

    insert into public.trade_items (
      trade_id,
      owner_user_id,
      user_item_id,
      quantity,
      item_definition_id,
      item_name,
      item_rarity,
      item_category
    )
    values (
      p_trade_id,
      v_uid,
      v_user_item_id,
      v_quantity,
      v_user_item.item_definition_id,
      v_user_item.def_name,
      v_user_item.def_rarity,
      v_user_item.def_category
    );
  end loop;

  for v_transfer in
    select ti.*
    from public.trade_items ti
    where ti.trade_id = p_trade_id
  loop
    select *
      into v_source_item
    from public.user_items
    where id = v_transfer.user_item_id
    for update;

    if not found then
      raise exception 'Um item da trade nao existe mais.';
    end if;

    if v_source_item.quantity < v_transfer.quantity then
      raise exception 'Quantidade invalida durante processamento da trade.';
    end if;

    if v_transfer.owner_user_id = v_trade.proposer_user_id then
      v_target_user := v_trade.receiver_user_id;
    else
      v_target_user := v_trade.proposer_user_id;
    end if;

    select idf.stackable
      into v_stackable
    from public.item_definitions idf
    where idf.id = v_source_item.item_definition_id;

    if v_source_item.quantity = v_transfer.quantity then
      delete from public.user_items
      where id = v_source_item.id;
    else
      update public.user_items
      set
        quantity = quantity - v_transfer.quantity,
        is_locked_in_trade = false,
        updated_at = timezone('utc', now())
      where id = v_source_item.id;
    end if;

    v_target_stack_id := null;

    if v_stackable then
      with target as (
        select ui.id
        from public.user_items ui
        where ui.user_id = v_target_user
          and ui.item_definition_id = v_source_item.item_definition_id
          and ui.is_equipped = false
          and ui.is_locked_in_trade = false
          and ui.is_marked_tradable = false
        order by ui.acquired_at asc
        limit 1
      )
      update public.user_items ui
      set
        quantity = ui.quantity + v_transfer.quantity,
        updated_at = timezone('utc', now())
      from target
      where ui.id = target.id
      returning ui.id into v_target_stack_id;
    end if;

    if v_target_stack_id is null then
      insert into public.user_items (
        user_id,
        item_definition_id,
        quantity,
        is_equipped,
        equipped_slot,
        is_locked_in_trade,
        is_marked_tradable,
        metadata
      )
      values (
        v_target_user,
        v_source_item.item_definition_id,
        v_transfer.quantity,
        false,
        null,
        false,
        false,
        '{}'::jsonb
      );
    end if;
  end loop;

  update public.user_items
  set is_locked_in_trade = false,
      updated_at = timezone('utc', now())
  where id in (select ti.user_item_id from public.trade_items ti where ti.trade_id = p_trade_id);

  update public.trades
  set status = 'accepted', responded_at = timezone('utc', now()), updated_at = timezone('utc', now())
  where id = p_trade_id;

  update public.game_saves gs
  set
    stats = jsonb_set(
      coalesce(gs.stats, '{}'::jsonb),
      '{tradesCompleted}',
      to_jsonb(coalesce((gs.stats ->> 'tradesCompleted')::integer, 0) + 1),
      true
    ),
    last_save_at = timezone('utc', now())
  where gs.user_id in (v_trade.proposer_user_id, v_trade.receiver_user_id);

  perform public.refresh_leaderboard_cache_for_user(v_trade.proposer_user_id);
  perform public.refresh_leaderboard_cache_for_user(v_trade.receiver_user_id);
end;
$$;

grant execute on function public.refresh_loot_box_shop() to authenticated;
grant execute on function public.open_active_loot_box(text) to authenticated;
grant execute on function public.set_item_equipped(uuid, boolean, text) to authenticated;
grant execute on function public.create_trade_offer(text, jsonb, text) to authenticated;
grant execute on function public.respond_trade(uuid, text, jsonb) to authenticated;

-- ---------------------------------------------------------
-- Seeds: caixas
-- ---------------------------------------------------------
insert into public.loot_boxes (
  box_key, name, description, rarity, price, spawn_weight, duration_minutes, min_gap_minutes, max_gap_minutes, active, visual
)
values
  ('caixa_comum', 'Caixa Comum da Feira', 'Caixa simples de suprimentos do vilarejo.', 'comum', 100, 60, 180, 5, 20, true, '{"tone":"comum","icon":"package"}'::jsonb),
  ('caixa_mercador', 'Caixa do Mercador Itinerante', 'Mercadorias de artesaos e caravanas.', 'incomum', 750, 40, 120, 10, 30, true, '{"tone":"mercador","icon":"coins"}'::jsonb),
  ('caixa_guilda', 'Caixa da Guilda de Oficios', 'Ferramentas e contratos da guilda.', 'raro', 2500, 25, 90, 15, 45, true, '{"tone":"guilda","icon":"hammer"}'::jsonb),
  ('caixa_arcana', 'Cofre Arcano', 'Tomo e focos de magia menor.', 'raro', 8000, 15, 75, 20, 60, true, '{"tone":"arcana","icon":"sparkles"}'::jsonb),
  ('caixa_real', 'Arca da Casa Real', 'Recompensas da corte e brasoes nobres.', 'epico', 25000, 8, 60, 35, 90, true, '{"tone":"real","icon":"crown"}'::jsonb),
  ('caixa_lendaria', 'Baul Lendario de Eldoria', 'Artefatos de herois antigos.', 'lendario', 70000, 4, 45, 50, 140, true, '{"tone":"lendaria","icon":"flame"}'::jsonb),
  ('caixa_celestial', 'Reliquiario Celestial', 'Fragmentos raros tocados pela aurora.', 'mitico', 180000, 2, 30, 80, 200, true, '{"tone":"celestial","icon":"star"}'::jsonb),
  ('caixa_amaldicoada', 'Urna Amaldicoada', 'Poder bruto com risco calculado.', 'epico', 42000, 5, 50, 45, 120, true, '{"tone":"amaldiocoada","icon":"skull"}'::jsonb),
  ('caixa_evento', 'Caixa de Evento de Guilda', 'Lote especial por tempo limitado.', 'raro', 12000, 10, 70, 25, 80, true, '{"tone":"evento","icon":"calendar"}'::jsonb),
  ('caixa_mistica', 'Cofre Mistico da Neblina', 'Colecao rara de runas e talismas.', 'epico', 32000, 6, 55, 40, 110, true, '{"tone":"mistica","icon":"moon"}'::jsonb)
on conflict (box_key) do update
set
  name = excluded.name,
  description = excluded.description,
  rarity = excluded.rarity,
  price = excluded.price,
  spawn_weight = excluded.spawn_weight,
  duration_minutes = excluded.duration_minutes,
  min_gap_minutes = excluded.min_gap_minutes,
  max_gap_minutes = excluded.max_gap_minutes,
  active = excluded.active,
  visual = excluded.visual,
  updated_at = timezone('utc', now());

-- ---------------------------------------------------------
-- Seeds: definicoes de itens
-- ---------------------------------------------------------
insert into public.item_definitions (
  item_key, name, description, rarity, category, passive_type, passive_value, stackable, tradable, base_value, metadata
)
values
  ('amuleto_campones', 'Amuleto do Campones', 'Pequeno amuleto que fortalece o trabalho manual.', 'comum', 'amuletos', 'click_flat', 1, false, true, 45, '{"slot":"amuletos"}'::jsonb),
  ('anel_fornalha', 'Anel da Fornalha', 'Aquece as fornalhas da vila, elevando a producao.', 'incomum', 'aneis', 'passive_flat', 0.8, false, true, 120, '{"slot":"aneis"}'::jsonb),
  ('runa_colheita', 'Runa da Colheita', 'Marca runica para colheitas mais abundantes.', 'comum', 'runas', 'passive_flat', 0.35, true, true, 38, '{}'::jsonb),
  ('fragmento_luar', 'Fragmento de Luar', 'Cristal suave que melhora ganhos offline.', 'incomum', 'fragmentos', 'offline_bonus', 0.04, true, true, 95, '{}'::jsonb),
  ('grimorio_brasa', 'Grimorio da Brasa', 'Tomo curto que aumenta o clique critico.', 'raro', 'grimorios', 'click_crit_chance', 0.02, false, true, 430, '{"slot":"grimorios"}'::jsonb),
  ('reliquia_mercante', 'Reliquia do Mercante', 'Selo comercial que reduz custos de obras.', 'raro', 'reliquias', 'building_discount', 0.025, false, true, 520, '{"slot":"reliquias"}'::jsonb),
  ('brasao_oficios', 'Brasao dos Oficios', 'Insignia da guilda que amplia renda passiva.', 'raro', 'brasoes', 'global_multiplier', 0.03, false, true, 780, '{"slot":"brasoes"}'::jsonb),
  ('talisma_chuva', 'Talisma da Chuva Mansa', 'Atrai energia para estruturas produtivas.', 'incomum', 'talismas', 'passive_flat', 1.4, false, true, 210, '{"slot":"talismas"}'::jsonb),
  ('mascote_raposa', 'Mascote Raposa Arcana', 'Companheira agil que melhora sorte de drops.', 'epico', 'mascotes', 'item_drop_bonus', 0.2, false, true, 2400, '{"slot":"mascotes"}'::jsonb),
  ('coroa_aurora', 'Coroa da Aurora', 'Simbolo real que reforca multiplicador global.', 'lendario', 'coroas', 'global_multiplier', 0.08, false, true, 6100, '{"slot":"coroas"}'::jsonb),
  ('artefato_cobalto', 'Artefato de Cobalto', 'Nucleo alquimico para acelerar producao.', 'epico', 'artefatos', 'passive_flat', 6, false, true, 3600, '{"slot":"artefatos"}'::jsonb),
  ('runa_vigor', 'Runa do Vigor', 'Inscricao antiga para clique bruto.', 'incomum', 'runas', 'click_flat', 3, true, true, 190, '{}'::jsonb),
  ('fragmento_abissal', 'Fragmento Abissal', 'Fragmento denso que aumenta recompensa de rebirth.', 'raro', 'fragmentos', 'rebirth_bonus', 0.06, true, true, 740, '{}'::jsonb),
  ('anel_celeste', 'Anel Celeste', 'Anel precioso para chance critica elevada.', 'epico', 'aneis', 'click_crit_chance', 0.045, false, true, 3300, '{"slot":"aneis"}'::jsonb),
  ('grimorio_trovao', 'Grimorio do Trovao', 'Compendio eletrico que aumenta clique.', 'epico', 'grimorios', 'click_flat', 12, false, true, 4100, '{"slot":"grimorios"}'::jsonb),
  ('reliquia_trono', 'Reliquia do Trono Antigo', 'Pedra de comando para bonus global.', 'lendario', 'reliquias', 'global_multiplier', 0.12, false, true, 9500, '{"slot":"reliquias"}'::jsonb),
  ('brasao_ferreo', 'Brasao Ferreo', 'Marca militar reduzindo custo de construcoes.', 'epico', 'brasoes', 'building_discount', 0.05, false, true, 4700, '{"slot":"brasoes"}'::jsonb),
  ('talisma_nevoa', 'Talisma da Nevoa', 'Talismas empilhaveis para bonus offline.', 'raro', 'talismas', 'offline_bonus', 0.07, true, true, 860, '{}'::jsonb),
  ('mascote_dragao', 'Mascote Dragonete', 'Aumenta chance de caixas raras.', 'lendario', 'mascotes', 'rare_box_spawn_bonus', 0.08, false, true, 11200, '{"slot":"mascotes"}'::jsonb),
  ('coroa_astro', 'Coroa dos Astros', 'Regalia suprema para multiplicador global.', 'mitico', 'coroas', 'global_multiplier', 0.2, false, true, 22000, '{"slot":"coroas"}'::jsonb),
  ('artefato_oraculo', 'Artefato do Oraculo', 'Amplifica ganhos de rebirth.', 'lendario', 'artefatos', 'rebirth_bonus', 0.16, false, true, 9800, '{"slot":"artefatos"}'::jsonb),
  ('runa_dourada', 'Runa Dourada', 'Runa rara para renda passiva elevada.', 'epico', 'runas', 'passive_flat', 9, true, true, 4200, '{}'::jsonb),
  ('fragmento_estelar', 'Fragmento Estelar', 'Acelera o retorno das caixas.', 'epico', 'fragmentos', 'box_cooldown_reduction', 0.06, true, true, 3800, '{}'::jsonb),
  ('amuleto_rei', 'Amuleto do Rei Aurora', 'Amuleto supremo para clique poderoso.', 'mitico', 'amuletos', 'click_flat', 35, false, true, 26500, '{"slot":"amuletos"}'::jsonb),
  ('anel_ouro_ancestral', 'Anel de Ouro Ancestral', 'Anel magico para desconto em obras.', 'lendario', 'aneis', 'building_discount', 0.08, false, true, 12400, '{"slot":"aneis"}'::jsonb),
  ('grimorio_eterno', 'Grimorio Eterno', 'Livro raro que melhora drops.', 'mitico', 'grimorios', 'item_drop_bonus', 0.45, false, true, 28000, '{"slot":"grimorios"}'::jsonb),
  ('reliquia_constelacao', 'Reliquia da Constelacao', 'Amplia ganhos offline e globais.', 'mitico', 'reliquias', 'offline_bonus', 0.2, false, true, 30000, '{"slot":"reliquias"}'::jsonb)
on conflict (item_key) do update
set
  name = excluded.name,
  description = excluded.description,
  rarity = excluded.rarity,
  category = excluded.category,
  passive_type = excluded.passive_type,
  passive_value = excluded.passive_value,
  stackable = excluded.stackable,
  tradable = excluded.tradable,
  base_value = excluded.base_value,
  metadata = excluded.metadata;

-- ---------------------------------------------------------
-- Seeds: pool de itens por caixa
-- ---------------------------------------------------------
with pool_data as (
  select *
  from (values
    ('caixa_comum', 'amuleto_campones', 35, 1, 1),
    ('caixa_comum', 'runa_colheita', 35, 1, 2),
    ('caixa_comum', 'fragmento_luar', 20, 1, 2),
    ('caixa_comum', 'runa_vigor', 10, 1, 1),

    ('caixa_mercador', 'anel_fornalha', 25, 1, 1),
    ('caixa_mercador', 'talisma_chuva', 25, 1, 1),
    ('caixa_mercador', 'fragmento_abissal', 20, 1, 2),
    ('caixa_mercador', 'reliquia_mercante', 15, 1, 1),
    ('caixa_mercador', 'runa_vigor', 15, 1, 2),

    ('caixa_guilda', 'brasao_oficios', 20, 1, 1),
    ('caixa_guilda', 'grimorio_brasa', 20, 1, 1),
    ('caixa_guilda', 'reliquia_mercante', 18, 1, 1),
    ('caixa_guilda', 'talisma_nevoa', 22, 1, 2),
    ('caixa_guilda', 'artefato_cobalto', 8, 1, 1),
    ('caixa_guilda', 'runa_dourada', 12, 1, 1),

    ('caixa_arcana', 'grimorio_trovao', 18, 1, 1),
    ('caixa_arcana', 'anel_celeste', 16, 1, 1),
    ('caixa_arcana', 'artefato_cobalto', 15, 1, 1),
    ('caixa_arcana', 'runa_dourada', 16, 1, 2),
    ('caixa_arcana', 'fragmento_estelar', 20, 1, 2),
    ('caixa_arcana', 'mascote_raposa', 15, 1, 1),

    ('caixa_real', 'coroa_aurora', 20, 1, 1),
    ('caixa_real', 'reliquia_trono', 20, 1, 1),
    ('caixa_real', 'brasao_ferreo', 16, 1, 1),
    ('caixa_real', 'anel_ouro_ancestral', 15, 1, 1),
    ('caixa_real', 'mascote_dragao', 10, 1, 1),
    ('caixa_real', 'artefato_oraculo', 19, 1, 1),

    ('caixa_lendaria', 'artefato_oraculo', 24, 1, 1),
    ('caixa_lendaria', 'coroa_aurora', 16, 1, 1),
    ('caixa_lendaria', 'mascote_dragao', 18, 1, 1),
    ('caixa_lendaria', 'anel_ouro_ancestral', 16, 1, 1),
    ('caixa_lendaria', 'reliquia_trono', 12, 1, 1),
    ('caixa_lendaria', 'grimorio_eterno', 14, 1, 1),

    ('caixa_celestial', 'coroa_astro', 18, 1, 1),
    ('caixa_celestial', 'amuleto_rei', 20, 1, 1),
    ('caixa_celestial', 'grimorio_eterno', 16, 1, 1),
    ('caixa_celestial', 'reliquia_constelacao', 16, 1, 1),
    ('caixa_celestial', 'mascote_dragao', 15, 1, 1),
    ('caixa_celestial', 'artefato_oraculo', 15, 1, 1),

    ('caixa_amaldicoada', 'grimorio_trovao', 14, 1, 1),
    ('caixa_amaldicoada', 'artefato_cobalto', 20, 1, 1),
    ('caixa_amaldicoada', 'fragmento_abissal', 22, 1, 3),
    ('caixa_amaldicoada', 'talisma_nevoa', 24, 1, 2),
    ('caixa_amaldicoada', 'mascote_raposa', 12, 1, 1),
    ('caixa_amaldicoada', 'anel_celeste', 8, 1, 1),

    ('caixa_evento', 'runa_dourada', 24, 1, 2),
    ('caixa_evento', 'fragmento_estelar', 25, 1, 3),
    ('caixa_evento', 'talisma_nevoa', 20, 1, 2),
    ('caixa_evento', 'brasao_ferreo', 14, 1, 1),
    ('caixa_evento', 'mascote_raposa', 17, 1, 1),

    ('caixa_mistica', 'artefato_oraculo', 20, 1, 1),
    ('caixa_mistica', 'reliquia_trono', 17, 1, 1),
    ('caixa_mistica', 'coroa_aurora', 16, 1, 1),
    ('caixa_mistica', 'mascote_dragao', 16, 1, 1),
    ('caixa_mistica', 'grimorio_eterno', 14, 1, 1),
    ('caixa_mistica', 'fragmento_estelar', 17, 1, 2)
  ) as t(box_key, item_key, weight, min_quantity, max_quantity)
)
insert into public.loot_box_item_pool (
  loot_box_id,
  item_definition_id,
  weight,
  min_quantity,
  max_quantity,
  enabled
)
select
  lb.id,
  idf.id,
  pd.weight,
  pd.min_quantity,
  pd.max_quantity,
  true
from pool_data pd
join public.loot_boxes lb on lb.box_key = pd.box_key
join public.item_definitions idf on idf.item_key = pd.item_key
on conflict (loot_box_id, item_definition_id) do update
set
  weight = excluded.weight,
  min_quantity = excluded.min_quantity,
  max_quantity = excluded.max_quantity,
  enabled = true;

-- ---------------------------------------------------------
-- Bootstrap inicial do cache de ranking
-- ---------------------------------------------------------
insert into public.leaderboard_cache (
  user_id,
  username,
  total_resource,
  passive_income,
  rebirth_count,
  boxes_opened,
  inventory_value,
  highest_item_rarity,
  highest_item_tier,
  updated_at
)
select
  p.id,
  coalesce(nullif(trim(p.username), ''), 'Aventureiro') as username,
  coalesce(gs.total_resource_earned, 0) as total_resource,
  coalesce(gs.passive_income, 0) as passive_income,
  coalesce(gs.rebirth_count, 0) as rebirth_count,
  coalesce((gs.stats ->> 'boxesOpened')::integer, 0) as boxes_opened,
  coalesce(inv.inventory_value, 0) as inventory_value,
  inv.highest_item_rarity,
  coalesce(inv.highest_item_tier, 0) as highest_item_tier,
  timezone('utc', now())
from public.profiles p
left join public.game_saves gs on gs.user_id = p.id
left join lateral (
  select
    sum(ui.quantity * idf.base_value) as inventory_value,
    (array_agg(idf.rarity order by public.rarity_tier(idf.rarity) desc, idf.base_value desc))[1] as highest_item_rarity,
    max(public.rarity_tier(idf.rarity)) as highest_item_tier
  from public.user_items ui
  join public.item_definitions idf on idf.id = ui.item_definition_id
  where ui.user_id = p.id
) inv on true
on conflict (user_id) do update
set
  username = excluded.username,
  total_resource = excluded.total_resource,
  passive_income = excluded.passive_income,
  rebirth_count = excluded.rebirth_count,
  boxes_opened = excluded.boxes_opened,
  inventory_value = excluded.inventory_value,
  highest_item_rarity = excluded.highest_item_rarity,
  highest_item_tier = excluded.highest_item_tier,
  updated_at = timezone('utc', now());
