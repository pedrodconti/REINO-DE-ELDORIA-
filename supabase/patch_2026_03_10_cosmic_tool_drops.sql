-- =========================================================
-- Reino de Eldoria - Box-only tools e ferramentas cosmicas
-- Data: 2026-03-10
-- Requer patch_2026_03_10_gathering_mvp.sql aplicado antes
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- 1) Ferramentas box-only (inclui novas cosmicas)
-- ---------------------------------------------------------
insert into public.tool_definitions (
  tool_key,
  name,
  tool_type,
  tier,
  rarity,
  buy_cost_gold,
  is_box_only,
  base_speed,
  base_yield,
  base_luck,
  base_duplicate_chance,
  base_rare_drop_chance
)
values
  ('machado_draconico', 'Machado Draconico', 'machado', 6, 'mitico', 0, true, 0.30, 0.24, 0.08, 0.08, 0.07),
  ('picareta_draconica', 'Picareta Draconica', 'picareta', 6, 'mitico', 0, true, 0.30, 0.24, 0.08, 0.08, 0.07),
  ('machado_cosmico', 'Machado Cosmico', 'machado', 7, 'mitico', 0, true, 0.38, 0.33, 0.12, 0.11, 0.10),
  ('picareta_cosmica', 'Picareta Cosmica', 'picareta', 7, 'mitico', 0, true, 0.38, 0.33, 0.12, 0.11, 0.10)
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
-- 2) Itens especiais de caixa que destravam ferramentas
-- ---------------------------------------------------------
insert into public.item_definitions (
  item_key,
  name,
  description,
  rarity,
  category,
  passive_type,
  passive_value,
  stackable,
  tradable,
  base_value,
  metadata
)
values
  (
    'licenca_machado_draconico',
    'Licenca Draconica de Machado',
    'Permite forjar e usar o Machado Draconico.',
    'mitico',
    'artefatos',
    'global_multiplier',
    0,
    false,
    false,
    0,
    '{"grant_tool_key":"machado_draconico","grant_tool_name":"Machado Draconico"}'::jsonb
  ),
  (
    'licenca_picareta_draconica',
    'Licenca Draconica de Picareta',
    'Permite forjar e usar a Picareta Draconica.',
    'mitico',
    'artefatos',
    'global_multiplier',
    0,
    false,
    false,
    0,
    '{"grant_tool_key":"picareta_draconica","grant_tool_name":"Picareta Draconica"}'::jsonb
  ),
  (
    'licenca_machado_cosmico',
    'Licenca Cosmica de Machado',
    'Permite forjar e usar o Machado Cosmico.',
    'mitico',
    'artefatos',
    'global_multiplier',
    0,
    false,
    false,
    0,
    '{"grant_tool_key":"machado_cosmico","grant_tool_name":"Machado Cosmico"}'::jsonb
  ),
  (
    'licenca_picareta_cosmica',
    'Licenca Cosmica de Picareta',
    'Permite forjar e usar a Picareta Cosmica.',
    'mitico',
    'artefatos',
    'global_multiplier',
    0,
    false,
    false,
    0,
    '{"grant_tool_key":"picareta_cosmica","grant_tool_name":"Picareta Cosmica"}'::jsonb
  )
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
-- 3) Esses drops so entram na melhor caixa: caixa_celestial
-- ---------------------------------------------------------
with tool_drop_pool as (
  select *
  from (values
    ('caixa_celestial', 'licenca_machado_draconico', 3::numeric),
    ('caixa_celestial', 'licenca_picareta_draconica', 3::numeric),
    ('caixa_celestial', 'licenca_machado_cosmico', 1.2::numeric),
    ('caixa_celestial', 'licenca_picareta_cosmica', 1.2::numeric)
  ) as t(box_key, item_key, weight)
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
  tdp.weight,
  1,
  1,
  true
from tool_drop_pool tdp
join public.loot_boxes lb on lb.box_key = tdp.box_key
join public.item_definitions idf on idf.item_key = tdp.item_key
on conflict (loot_box_id, item_definition_id) do update
set
  weight = excluded.weight,
  min_quantity = 1,
  max_quantity = 1,
  enabled = true;

delete from public.loot_box_item_pool pool
using public.loot_boxes lb, public.item_definitions idf
where pool.loot_box_id = lb.id
  and pool.item_definition_id = idf.id
  and idf.item_key in (
    'licenca_machado_draconico',
    'licenca_picareta_draconica',
    'licenca_machado_cosmico',
    'licenca_picareta_cosmica'
  )
  and lb.box_key <> 'caixa_celestial';

-- ---------------------------------------------------------
-- 4) Trigger: ao abrir caixa, se item concede ferramenta, desbloqueia
-- ---------------------------------------------------------
create or replace function public.grant_tool_from_box_drop_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tool_key text;
  v_tool_id uuid;
begin
  select nullif(trim(coalesce(idf.metadata ->> 'grant_tool_key', '')), '')
    into v_tool_key
  from public.item_definitions idf
  where idf.id = new.item_definition_id;

  if v_tool_key is null then
    return new;
  end if;

  select td.id
    into v_tool_id
  from public.tool_definitions td
  where td.tool_key = v_tool_key
  limit 1;

  if v_tool_id is null then
    return new;
  end if;

  insert into public.user_tools (
    user_id,
    tool_definition_id,
    is_owned,
    is_equipped
  )
  values (
    new.user_id,
    v_tool_id,
    true,
    false
  )
  on conflict (user_id, tool_definition_id) do update
  set
    is_owned = true,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists trg_grant_tool_from_box_drop_history on public.box_open_history;
create trigger trg_grant_tool_from_box_drop_history
after insert on public.box_open_history
for each row
execute function public.grant_tool_from_box_drop_history();
