-- =========================================================
-- Reino de Eldoria - Balanceamento de drop da caixa celestial
-- Data: 2026-03-10
--
-- Interpretacao aplicada:
-- - licenca_machado_draconico: 3.0%
-- - licenca_picareta_draconica: 3.0%
-- - licenca_machado_cosmico: 0.5%
-- - licenca_picareta_cosmica: 0.5%
-- => Total ferramentas especiais: 7.0%
-- =========================================================

with
target_rates as (
  select *
  from (values
    ('licenca_machado_draconico'::text, 0.03::numeric),
    ('licenca_picareta_draconica'::text, 0.03::numeric),
    ('licenca_machado_cosmico'::text, 0.005::numeric),
    ('licenca_picareta_cosmica'::text, 0.005::numeric)
  ) as t(item_key, chance_fraction)
),
celestial_box as (
  select lb.id
  from public.loot_boxes lb
  where lb.box_key = 'caixa_celestial'
  limit 1
),
other_weight as (
  select
    coalesce(sum(pool.weight), 0)::numeric as weight_sum
  from public.loot_box_item_pool pool
  join celestial_box cb on cb.id = pool.loot_box_id
  join public.item_definitions idf on idf.id = pool.item_definition_id
  where pool.enabled = true
    and idf.item_key not in (select tr.item_key from target_rates tr)
),
base_denominator as (
  select
    case
      when ow.weight_sum > 0
        then ow.weight_sum / (1 - 0.07::numeric)
      else 100::numeric
    end as denom
  from other_weight ow
),
resolved_targets as (
  select
    cb.id as loot_box_id,
    idf.id as item_definition_id,
    tr.item_key,
    tr.chance_fraction,
    tr.chance_fraction * bd.denom as target_weight
  from celestial_box cb
  join target_rates tr on true
  join public.item_definitions idf on idf.item_key = tr.item_key
  cross join base_denominator bd
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
  rt.loot_box_id,
  rt.item_definition_id,
  rt.target_weight,
  1,
  1,
  true
from resolved_targets rt
on conflict (loot_box_id, item_definition_id) do update
set
  weight = excluded.weight,
  min_quantity = 1,
  max_quantity = 1,
  enabled = true;

-- Relatorio de conferencia
with celestial_pool as (
  select
    idf.item_key,
    pool.weight,
    sum(pool.weight) over() as total_weight
  from public.loot_box_item_pool pool
  join public.loot_boxes lb on lb.id = pool.loot_box_id
  join public.item_definitions idf on idf.id = pool.item_definition_id
  where lb.box_key = 'caixa_celestial'
    and pool.enabled = true
),
special as (
  select *
  from celestial_pool
  where item_key in (
    'licenca_machado_draconico',
    'licenca_picareta_draconica',
    'licenca_machado_cosmico',
    'licenca_picareta_cosmica'
  )
)
select
  s.item_key,
  s.weight,
  round((s.weight / nullif(s.total_weight, 0)) * 100, 4) as chance_percent
from special s
order by chance_percent desc;
