-- =========================================================
-- Reino de Eldoria - Schema SQL para Supabase
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

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, null)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------
-- Tabela: profiles
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

-- ---------------------------------------------------------
-- Tabela: game_saves
-- ---------------------------------------------------------
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

create index if not exists idx_game_saves_user_id on public.game_saves (user_id);
create index if not exists idx_game_saves_last_save_at on public.game_saves (last_save_at desc);
create index if not exists idx_game_saves_total_resource on public.game_saves (total_resource_earned desc);

create trigger game_saves_set_updated_at
before update on public.game_saves
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------
-- Tabela: rebirth_upgrades
-- ---------------------------------------------------------
create table if not exists public.rebirth_upgrades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  upgrade_key text not null,
  level integer not null default 0 check (level >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, upgrade_key)
);

create index if not exists idx_rebirth_upgrades_user_id on public.rebirth_upgrades (user_id);
create index if not exists idx_rebirth_upgrades_upgrade_key on public.rebirth_upgrades (upgrade_key);

create trigger rebirth_upgrades_set_updated_at
before update on public.rebirth_upgrades
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------
-- Tabela opcional: optional_leaderboard
-- ---------------------------------------------------------
create table if not exists public.optional_leaderboard (
  user_id uuid primary key references auth.users(id) on delete cascade,
  best_total_resource numeric not null default 0,
  rebirth_count integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_optional_leaderboard_score
  on public.optional_leaderboard (best_total_resource desc, rebirth_count desc);

create trigger optional_leaderboard_set_updated_at
before update on public.optional_leaderboard
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------
-- RLS
-- ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.game_saves enable row level security;
alter table public.rebirth_upgrades enable row level security;
alter table public.optional_leaderboard enable row level security;

-- profiles
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

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

-- ---------------------------------------------------------
-- Garantia de profile para usuarios existentes (idempotente)
-- ---------------------------------------------------------
insert into public.profiles (id, username)
select u.id, null
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
