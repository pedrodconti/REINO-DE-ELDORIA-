-- =========================================================
-- Reino de Eldoria - Patch de gameplay (caixas/diamantes/perfil/equip)
-- Data: 2026-03-08
-- Execute este arquivo no SQL Editor do Supabase
-- =========================================================

-- ---------------------------------------------------------
-- Caixa: limitar abertura por rotacao por usuario
-- ---------------------------------------------------------
create table if not exists public.user_box_rotation_opens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rotation_id uuid not null references public.loot_box_rotations(id) on delete cascade,
  loot_box_id uuid not null references public.loot_boxes(id) on delete cascade,
  opened_at timestamptz not null default timezone('utc', now()),
  unique (user_id, rotation_id)
);

create index if not exists idx_user_box_rotation_opens_user
  on public.user_box_rotation_opens (user_id, opened_at desc);

create index if not exists idx_user_box_rotation_opens_rotation
  on public.user_box_rotation_opens (rotation_id);

alter table public.user_box_rotation_opens enable row level security;

drop policy if exists "user_box_rotation_opens_select_own" on public.user_box_rotation_opens;
drop policy if exists "user_box_rotation_opens_insert_own" on public.user_box_rotation_opens;

create policy "user_box_rotation_opens_select_own"
on public.user_box_rotation_opens
for select
to authenticated
using (auth.uid() = user_id);

create policy "user_box_rotation_opens_insert_own"
on public.user_box_rotation_opens
for insert
to authenticated
with check (auth.uid() = user_id);

-- ---------------------------------------------------------
-- Economia de caixas em diamantes (1 diamante = 1000 selos)
-- ---------------------------------------------------------
update public.loot_boxes
set
  price = case box_key
    when 'caixa_comum' then 1
    when 'caixa_mercador' then 3
    when 'caixa_guilda' then 7
    when 'caixa_arcana' then 12
    when 'caixa_evento' then 18
    when 'caixa_real' then 25
    when 'caixa_mistica' then 45
    when 'caixa_amaldicoada' then 35
    when 'caixa_lendaria' then 70
    when 'caixa_celestial' then 140
    else price
  end,
  spawn_weight = case box_key
    when 'caixa_comum' then 80
    when 'caixa_mercador' then 54
    when 'caixa_guilda' then 34
    when 'caixa_arcana' then 25
    when 'caixa_evento' then 20
    when 'caixa_real' then 12
    when 'caixa_mistica' then 9
    when 'caixa_amaldicoada' then 8
    when 'caixa_lendaria' then 4
    when 'caixa_celestial' then 2
    else spawn_weight
  end,
  duration_minutes = case box_key
    when 'caixa_comum' then 135
    when 'caixa_mercador' then 125
    when 'caixa_guilda' then 110
    when 'caixa_arcana' then 95
    when 'caixa_evento' then 90
    when 'caixa_real' then 80
    when 'caixa_mistica' then 70
    when 'caixa_amaldicoada' then 65
    when 'caixa_lendaria' then 50
    when 'caixa_celestial' then 35
    else duration_minutes
  end,
  active = true,
  updated_at = timezone('utc', now());

-- itens mais escassos (sem empilhar quantidades altas em drop)
update public.loot_box_item_pool
set
  max_quantity = greatest(1, min_quantity),
  min_quantity = 1;

-- ---------------------------------------------------------
-- RPC: refresh da loja com ate 2 caixas ativas e rotacao de 3h
-- ---------------------------------------------------------
create or replace function public.refresh_loot_box_shop()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := timezone('utc', now());
  v_state public.loot_box_runtime_state%rowtype;
  v_next_spawn timestamptz;
  v_spawn_count integer := 1;
  v_primary_rotation_id uuid;
  v_rotations jsonb := '[]'::jsonb;
begin
  insert into public.loot_box_runtime_state (singleton_id, active_rotation_id, next_spawn_at)
  values (true, null, null)
  on conflict (singleton_id) do nothing;

  select *
    into v_state
  from public.loot_box_runtime_state
  where singleton_id = true
  for update;

  update public.loot_box_rotations
  set is_active = false
  where is_active = true
    and ends_at <= v_now;

  if v_state.next_spawn_at is null then
    v_state.next_spawn_at := v_now;
    update public.loot_box_runtime_state
    set
      next_spawn_at = v_state.next_spawn_at,
      updated_at = v_now
    where singleton_id = true;
  end if;

  if v_state.next_spawn_at <= v_now then
    v_spawn_count := case when random() < 0.28 then 2 else 1 end;

    with picked as (
      select lb.id, lb.duration_minutes
      from public.loot_boxes lb
      where lb.active = true
      order by -ln(greatest(random(), 0.000001)) / greatest(lb.spawn_weight, 0.000001)
      limit v_spawn_count
    ),
    inserted as (
      insert into public.loot_box_rotations (loot_box_id, starts_at, ends_at, is_active)
      select
        p.id,
        v_now,
        v_now + make_interval(mins => p.duration_minutes),
        true
      from picked p
      returning id
    )
    select min(i.id)
      into v_primary_rotation_id
    from inserted i;

    v_next_spawn := v_now + interval '3 hours';

    update public.loot_box_runtime_state
    set
      active_rotation_id = v_primary_rotation_id,
      next_spawn_at = v_next_spawn,
      updated_at = v_now
    where singleton_id = true;
  end if;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'rotationId', q.rotation_id,
          'startsAt', q.starts_at,
          'endsAt', q.ends_at,
          'hasOpened', q.has_opened,
          'box', jsonb_build_object(
            'id', q.box_id,
            'boxKey', q.box_key,
            'name', q.name,
            'description', q.description,
            'rarity', q.rarity,
            'price', q.price,
            'spawnWeight', q.spawn_weight,
            'durationMinutes', q.duration_minutes,
            'visual', q.visual
          )
        )
        order by q.ends_at asc
      ),
      '[]'::jsonb
    )
  into v_rotations
  from (
    select
      lr.id as rotation_id,
      lr.starts_at,
      lr.ends_at,
      lb.id as box_id,
      lb.box_key,
      lb.name,
      lb.description,
      lb.rarity,
      lb.price,
      lb.spawn_weight,
      lb.duration_minutes,
      lb.visual,
      case
        when v_uid is null then false
        else exists (
          select 1
          from public.user_box_rotation_opens uro
          where uro.user_id = v_uid
            and uro.rotation_id = lr.id
        )
      end as has_opened
    from public.loot_box_rotations lr
    join public.loot_boxes lb on lb.id = lr.loot_box_id
    where lr.is_active = true
      and lr.ends_at > v_now
    order by lr.ends_at asc
    limit 2
  ) as q;

  return jsonb_build_object(
    'serverNow', v_now,
    'nextSpawnAt', (select next_spawn_at from public.loot_box_runtime_state where singleton_id = true),
    'activeRotations', v_rotations
  );
end;
$$;

-- ---------------------------------------------------------
-- RPC: abrir caixa por rotacao (uma vez por usuario por rotacao)
-- ---------------------------------------------------------
drop function if exists public.open_active_loot_box(text);

create or replace function public.open_active_loot_box(p_rotation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := timezone('utc', now());
  v_rotation public.loot_box_rotations%rowtype;
  v_box public.loot_boxes%rowtype;
  v_save public.game_saves%rowtype;
  v_pool record;
  v_item public.item_definitions%rowtype;
  v_quantity integer;
  v_item_drop_bonus numeric := 0;
  v_target_stack_id uuid;
  v_open_lock_id uuid;
  v_price_diamonds numeric;
  v_price_seals numeric;
begin
  if v_uid is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if p_rotation_id is null then
    raise exception 'Rotacao de caixa invalida.';
  end if;

  perform public.refresh_loot_box_shop();

  select *
    into v_rotation
  from public.loot_box_rotations
  where id = p_rotation_id
    and is_active = true
  for update;

  if not found then
    raise exception 'A caixa solicitada nao esta ativa.';
  end if;

  if v_rotation.ends_at <= v_now then
    update public.loot_box_rotations
    set is_active = false
    where id = v_rotation.id;

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

  insert into public.user_box_rotation_opens (user_id, rotation_id, loot_box_id, opened_at)
  values (v_uid, v_rotation.id, v_box.id, v_now)
  on conflict (user_id, rotation_id) do nothing
  returning id into v_open_lock_id;

  if v_open_lock_id is null then
    raise exception 'Voce ja abriu esta caixa nesta rotacao.';
  end if;

  insert into public.game_saves (user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  select *
    into v_save
  from public.game_saves
  where user_id = v_uid
  for update;

  v_price_diamonds := greatest(1::numeric, coalesce(v_box.price, 1));
  v_price_seals := ceil(v_price_diamonds * 1000);

  if coalesce(v_save.rebirth_currency, 0) < v_price_seals then
    raise exception 'Saldo insuficiente de Selos da Aurora para abrir esta caixa.';
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
    rebirth_currency = gs.rebirth_currency - v_price_seals,
    stats = jsonb_set(
      coalesce(gs.stats, '{}'::jsonb),
      '{boxesOpened}',
      to_jsonb(coalesce((gs.stats ->> 'boxesOpened')::integer, 0) + 1),
      true
    ),
    last_save_at = v_now
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
      updated_at = v_now
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
  values (v_uid, v_box.id, v_item.id, v_now, v_price_diamonds);

  perform public.refresh_leaderboard_cache_for_user(v_uid);

  return jsonb_build_object(
    'lootBoxKey', v_box.box_key,
    'rotationId', v_rotation.id,
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
    'pricePaidDiamonds', v_price_diamonds,
    'pricePaidSeals', v_price_seals,
    'remainingRebirthCurrency', (select gs.rebirth_currency from public.game_saves gs where gs.user_id = v_uid),
    'remainingDiamonds', floor((select gs.rebirth_currency from public.game_saves gs where gs.user_id = v_uid) / 1000)
  );
end;
$$;

-- ---------------------------------------------------------
-- Equip: 1 item por categoria/slot (ignora slot enviado pelo cliente)
-- ---------------------------------------------------------
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

    -- regra de slot segura no backend: 1 por categoria do item
    v_slot := v_definition.category;

    update public.user_items
    set
      is_equipped = false,
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

grant execute on function public.refresh_loot_box_shop() to authenticated;
grant execute on function public.open_active_loot_box(uuid) to authenticated;
grant execute on function public.set_item_equipped(uuid, boolean, text) to authenticated;
