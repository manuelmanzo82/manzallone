-- M22: Auto-create profile row when a new auth.user is created.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, created_at, updated_at)
    values (new.id, now(), now())
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- updated_at touch trigger (reusable)
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger trg_profiles_updated_at
    before update on public.profiles
    for each row execute procedure public.touch_updated_at();

create trigger trg_pref_updated_at
    before update on public.profile_food_preferences
    for each row execute procedure public.touch_updated_at();
