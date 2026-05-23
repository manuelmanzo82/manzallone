-- M23-M25: Household invite + join flow.

-- M23: generate unique MANZO-XXXX invite code
create or replace function public.generate_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    candidate text;
    found     boolean;
    attempts  int := 0;
begin
    loop
        candidate := 'MANZO-' ||
            upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));

        select exists(select 1 from public.households where invite_code = candidate) into found;

        if not found then
            return candidate;
        end if;

        attempts := attempts + 1;
        if attempts > 50 then
            raise exception 'generate_invite_code: too many collisions';
        end if;
    end loop;
end;
$$;

revoke all on function public.generate_invite_code() from public;
grant execute on function public.generate_invite_code() to authenticated;

-- M24: create household and attach the calling user's profile
create or replace function public.create_household_with_invite(p_name text)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
    new_household public.households%rowtype;
    uid uuid := auth.uid();
begin
    if uid is null then
        raise exception 'Not authenticated';
    end if;

    insert into public.households (name, invite_code, created_by)
    values (p_name, public.generate_invite_code(), uid)
    returning * into new_household;

    update public.profiles set household_id = new_household.id where id = uid;

    return new_household;
end;
$$;

revoke all on function public.create_household_with_invite(text) from public;
grant execute on function public.create_household_with_invite(text) to authenticated;

-- M25: join an existing household via invite code
create or replace function public.join_household(p_invite_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    target_id uuid;
    uid uuid := auth.uid();
begin
    if uid is null then
        raise exception 'Not authenticated';
    end if;

    select id into target_id from public.households where invite_code = p_invite_code;

    if target_id is null then
        return false;
    end if;

    update public.profiles set household_id = target_id where id = uid;
    return true;
end;
$$;

revoke all on function public.join_household(text) from public;
grant execute on function public.join_household(text) to authenticated;
