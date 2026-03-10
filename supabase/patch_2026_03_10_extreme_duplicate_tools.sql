-- =========================================================
-- Reino de Eldoria - Ajustes extremos de duplicacao em ferramentas
-- Data: 2026-03-10
--
-- Regras aplicadas:
-- - Ferramentas draconicas: duplicador base 50x
-- - Ferramentas cosmicas: duplicador base 100x
-- - Picareta cosmica: sem cooldown (regra aplicada no frontend/store)
-- =========================================================

-- 1) Relaxa constraint antiga de base_duplicate_chance (antes limitada <= 1)
do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.tool_definitions'::regclass
      and pg_get_constraintdef(c.oid) ilike '%base_duplicate_chance%'
  loop
    execute format('alter table public.tool_definitions drop constraint if exists %I', v_constraint.conname);
  end loop;
end
$$;

alter table public.tool_definitions
  add constraint tool_definitions_base_duplicate_chance_check
  check (base_duplicate_chance >= 0);

-- 2) Aplica duplicadores base nos tiers especiais
update public.tool_definitions
set
  base_duplicate_chance = case
    when tool_key in ('machado_draconico', 'picareta_draconica') then 50
    when tool_key in ('machado_cosmico', 'picareta_cosmica') then 100
    else base_duplicate_chance
  end,
  updated_at = timezone('utc', now())
where tool_key in (
  'machado_draconico',
  'picareta_draconica',
  'machado_cosmico',
  'picareta_cosmica'
);

-- 3) Relatorio rapido
select
  tool_key,
  name,
  tier,
  base_duplicate_chance
from public.tool_definitions
where tool_key in (
  'machado_draconico',
  'picareta_draconica',
  'machado_cosmico',
  'picareta_cosmica'
)
order by tier, tool_key;
