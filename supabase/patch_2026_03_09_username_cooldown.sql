-- =========================================================
-- Reino de Eldoria - Username cooldown (30 dias)
-- Data: 2026-03-09
-- =========================================================

-- 1) Nova coluna de controle
alter table public.profiles
  add column if not exists username_changed_at timestamptz null;

create index if not exists idx_profiles_username_changed_at
  on public.profiles (username_changed_at);

-- 2) Trigger para reforcar regra no update direto da tabela
create or replace function public.enforce_username_change_policy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := timezone('utc', now());
  v_cooldown_until timestamptz;
begin
  if new.username is distinct from old.username then
    new.username := lower(regexp_replace(trim(coalesce(new.username, '')), '[^a-zA-Z0-9_]+', '', 'g'));

    if new.username !~ '^[a-z0-9_]{3,20}$' then
      raise exception 'Username invalido. Use 3 a 20 caracteres (a-z, 0-9, _).';
    end if;

    -- Se vier de sessao autenticada, exige dono + cooldown.
    -- Em contexto admin/sql (auth.uid() is null), permite override.
    if v_uid is not null then
      if old.id <> v_uid then
        raise exception 'Voce so pode alterar seu proprio username.';
      end if;

      if old.username_changed_at is not null then
        v_cooldown_until := old.username_changed_at + interval '30 days';

        if v_now < v_cooldown_until then
          raise exception 'Voce so pode trocar de username novamente em %.',
            to_char(v_cooldown_until at time zone 'utc', 'YYYY-MM-DD HH24:MI UTC');
        end if;
      end if;
    end if;

    new.username_changed_at := v_now;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_username_policy on public.profiles;

create trigger profiles_username_policy
before update of username on public.profiles
for each row
execute function public.enforce_username_change_policy();

-- 3) RPC oficial de alteracao de username com cooldown
create or replace function public.set_profile_username(p_username text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := timezone('utc', now());
  v_username text;
  v_profile public.profiles%rowtype;
  v_cooldown_until timestamptz;
begin
  if v_uid is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  v_username := lower(regexp_replace(trim(coalesce(p_username, '')), '[^a-zA-Z0-9_]+', '', 'g'));

  if v_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'Username invalido. Use 3 a 20 caracteres (a-z, 0-9, _).';
  end if;

  select *
    into v_profile
  from public.profiles
  where id = v_uid
  for update;

  if not found then
    insert into public.profiles (id, username, username_changed_at)
    values (v_uid, v_username, v_now)
    returning * into v_profile;

    perform public.refresh_leaderboard_cache_for_user(v_uid);
    return v_profile;
  end if;

  if lower(coalesce(v_profile.username, '')) = v_username then
    return v_profile;
  end if;

  if v_profile.username_changed_at is not null then
    v_cooldown_until := v_profile.username_changed_at + interval '30 days';

    if v_now < v_cooldown_until then
      raise exception 'Voce so pode trocar de username novamente em %.',
        to_char(v_cooldown_until at time zone 'utc', 'YYYY-MM-DD HH24:MI UTC');
    end if;
  end if;

  update public.profiles
  set
    username = v_username,
    username_changed_at = v_now,
    updated_at = v_now
  where id = v_uid
  returning * into v_profile;

  perform public.refresh_leaderboard_cache_for_user(v_uid);

  return v_profile;
exception
  when unique_violation then
    raise exception 'Username ja em uso.';
end;
$$;

grant execute on function public.set_profile_username(text) to authenticated;

-- 4) Reforco de unicidade case-insensitive
create unique index if not exists idx_profiles_username_unique
  on public.profiles (lower(username));

