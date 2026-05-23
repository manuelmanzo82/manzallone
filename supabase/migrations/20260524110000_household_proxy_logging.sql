-- Household multi-member logging: lets the actor log meals (and query daily
-- status) for other members of the same household, with privacy_prefs guard.
-- All SECURITY DEFINER + grant authenticated.

-- ============================================================
-- get_household_members(p_user_id)
-- Returns OTHER members (not the actor) of the same household + the privacy
-- flags the actor needs to decide if cross-member logging is allowed.
-- ============================================================
create or replace function public.get_household_members(p_user_id uuid)
returns table (
    id            uuid,
    name          text,
    household_id  uuid,
    share_meals   boolean,
    share_weight  boolean,
    share_stats   boolean
)
language sql
security definer
set search_path = public
stable
as $$
    with me as (
        select household_id from public.profiles where id = p_user_id
    )
    select p.id,
           p.name,
           p.household_id,
           coalesce((p.privacy_prefs->>'share_meals')::boolean,   true) as share_meals,
           coalesce((p.privacy_prefs->>'share_weight')::boolean,  true) as share_weight,
           coalesce((p.privacy_prefs->>'share_stats')::boolean,   true) as share_stats
      from public.profiles p, me
     where me.household_id is not null
       and p.household_id = me.household_id
       and p.id <> p_user_id;
$$;

grant execute on function public.get_household_members(uuid) to authenticated;

-- ============================================================
-- resolve_household_member_by_name(actor, name)
-- Best-effort fuzzy match. Tries first-name (lowercased), then full name,
-- then a small set of relationship aliases ("partner", "compagna", ...).
-- Returns NULL if no unambiguous match.
-- ============================================================
create or replace function public.resolve_household_member_by_name(
    p_actor_user_id uuid,
    p_name          text
)
returns uuid
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    target_id uuid;
    lname text := lower(trim(coalesce(p_name, '')));
    relation_aliases text[] := array[
        'partner','compagna','compagno','coniuge','moglie','marito',
        'fidanzata','fidanzato'
    ];
begin
    if lname = '' then
        return null;
    end if;

    -- exact match on first name OR full name (case insensitive)
    select id into target_id
      from public.get_household_members(p_actor_user_id) hm
     where lower(split_part(coalesce(hm.name, ''), ' ', 1)) = lname
        or lower(coalesce(hm.name, ''))                    = lname
     limit 1;

    if target_id is not null then
        return target_id;
    end if;

    -- ilike fallback (contains)
    select id into target_id
      from public.get_household_members(p_actor_user_id) hm
     where coalesce(hm.name, '') ilike '%' || p_name || '%'
     limit 1;

    if target_id is not null then
        return target_id;
    end if;

    -- relationship alias: only resolves if the household has exactly one other member
    if lname = any(relation_aliases) then
        select id into target_id
          from public.get_household_members(p_actor_user_id) hm
         limit 2;
        -- if more than one member, leave ambiguous
        if (select count(*) from public.get_household_members(p_actor_user_id)) = 1 then
            return target_id;
        end if;
    end if;

    return null;
end;
$$;

grant execute on function public.resolve_household_member_by_name(uuid, text) to authenticated;

-- ============================================================
-- record_meal_for_members(actor, member_ids[], meal_type, items, ...)
-- Inserts one meal row per target user. If >1 target, generates a common
-- shared_meal_id and links every row to it.
-- Each target must:
--   - belong to the actor's household, OR be the actor itself
--   - have privacy_prefs.share_meals != false (unless target = actor)
-- Returns the created rows as (member_user_id, inserted_meal_id, shared_meal_id).
-- ============================================================
create or replace function public.record_meal_for_members(
    p_actor_user_id    uuid,
    p_member_user_ids  uuid[],
    p_meal_type        text,
    p_items            jsonb,
    p_location         text default null,
    p_notes            text default null,
    p_source           text default 'claude'
)
returns table (
    member_user_id    uuid,
    inserted_meal_id  uuid,
    shared_meal_id    uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
    actor_household uuid;
    new_shared_id   uuid;
    target_id       uuid;
    new_meal_id     uuid;
    target_count    int := coalesce(array_length(p_member_user_ids, 1), 0);
    ok              boolean;
begin
    if target_count = 0 then
        raise exception 'no members specified';
    end if;

    select household_id into actor_household
      from public.profiles where id = p_actor_user_id;

    -- Validate every target up-front so we don't insert a partial batch.
    foreach target_id in array p_member_user_ids loop
        if target_id = p_actor_user_id then
            continue; -- self always allowed
        end if;
        if actor_household is null then
            raise exception 'actor has no household, cannot log for others';
        end if;
        select exists (
            select 1 from public.profiles
             where id = target_id
               and household_id = actor_household
               and coalesce((privacy_prefs->>'share_meals')::boolean, true) = true
        ) into ok;
        if not ok then
            raise exception 'target % not in household or denies proxy logging', target_id;
        end if;
    end loop;

    if target_count > 1 then
        new_shared_id := gen_random_uuid();
    end if;

    foreach target_id in array p_member_user_ids loop
        new_meal_id := public.record_meal_with_totals(
            target_id, p_meal_type, p_items, p_location, p_notes, p_source
        );
        if new_shared_id is not null then
            update public.meals
               set shared_meal_id = new_shared_id
             where id = new_meal_id;
        end if;
        member_user_id   := target_id;
        inserted_meal_id := new_meal_id;
        shared_meal_id   := new_shared_id;
        return next;
    end loop;

    return;
end;
$$;

grant execute on function public.record_meal_for_members(uuid, uuid[], text, jsonb, text, text, text)
    to authenticated;

-- ============================================================
-- get_member_daily_status(actor, target, date)
-- Wraps get_daily_status with privacy check.
-- ============================================================
create or replace function public.get_member_daily_status(
    p_actor_user_id  uuid,
    p_target_user_id uuid,
    p_date           date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    ok boolean;
begin
    if p_actor_user_id = p_target_user_id then
        return public.get_daily_status(p_target_user_id, p_date);
    end if;

    select exists (
        select 1
          from public.profiles a
          join public.profiles b on a.household_id = b.household_id
         where a.id = p_actor_user_id
           and b.id = p_target_user_id
           and a.household_id is not null
           and coalesce((b.privacy_prefs->>'share_stats')::boolean, true) = true
    ) into ok;

    if not ok then
        return jsonb_build_object(
            'error', 'not_authorized',
            'detail', 'utente non condivide le statistiche o non e'' del tuo household'
        );
    end if;

    return public.get_daily_status(p_target_user_id, p_date);
end;
$$;

grant execute on function public.get_member_daily_status(uuid, uuid, date) to authenticated;
