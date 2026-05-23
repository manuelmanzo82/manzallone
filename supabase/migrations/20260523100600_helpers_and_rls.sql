-- M21: Enable RLS on all tables + policies.
-- Helper SECURITY DEFINER functions avoid recursion on profiles policies.

-- --- HELPER ---
create or replace function public.current_user_household_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
    select household_id from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_user_household_id() from public;
grant execute on function public.current_user_household_id() to authenticated;

-- --- ENABLE RLS ---
alter table public.households                enable row level security;
alter table public.profiles                  enable row level security;
alter table public.food_catalog              enable row level security;
alter table public.profile_food_preferences  enable row level security;
alter table public.weights                   enable row level security;
alter table public.meals                     enable row level security;
alter table public.water                     enable row level security;
alter table public.workouts                  enable row level security;
alter table public.sleep                     enable row level security;
alter table public.supplements               enable row level security;
alter table public.conversations             enable row level security;
alter table public.messages                  enable row level security;
alter table public.frequent_foods            enable row level security;
alter table public.user_insights             enable row level security;
alter table public.user_story                enable row level security;
alter table public.push_subscriptions        enable row level security;
alter table public.notification_schedule     enable row level security;
alter table public.daily_targets_history     enable row level security;
alter table public.meal_suggestions_log      enable row level security;

-- --- PROFILES ---
create policy profiles_select_self_or_household on public.profiles
    for select using (
        auth.uid() = id
        or (household_id is not null and household_id = public.current_user_household_id())
    );

create policy profiles_update_self on public.profiles
    for update using (auth.uid() = id) with check (auth.uid() = id);

create policy profiles_insert_self on public.profiles
    for insert with check (auth.uid() = id);

-- --- HOUSEHOLDS ---
create policy households_select_member on public.households
    for select using (id = public.current_user_household_id());

create policy households_update_member on public.households
    for update using (id = public.current_user_household_id())
              with check (id = public.current_user_household_id());

create policy households_insert_authenticated on public.households
    for insert to authenticated with check (true);

-- --- FOOD CATALOG (shared library) ---
create policy food_catalog_select_authenticated on public.food_catalog
    for select to authenticated using (true);

create policy food_catalog_insert_authenticated on public.food_catalog
    for insert to authenticated with check (true);

create policy food_catalog_update_authenticated on public.food_catalog
    for update to authenticated using (true) with check (true);

-- --- PROFILE FOOD PREFERENCES ---
create policy pref_all_self on public.profile_food_preferences
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- --- WEIGHTS / SLEEP / SUPPLEMENTS / WATER (private) ---
create policy weights_all_self on public.weights
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy sleep_all_self on public.sleep
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy supplements_all_self on public.supplements
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy water_all_self on public.water
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- --- MEALS (shareable read) ---
create policy meals_select_self_or_shared on public.meals
    for select using (
        auth.uid() = user_id
        or (shared_meal_id is not null
            and user_id in (
                select id from public.profiles
                where household_id = public.current_user_household_id()
                  and household_id is not null
            )
        )
    );

create policy meals_insert_self on public.meals
    for insert with check (auth.uid() = user_id);

create policy meals_update_self on public.meals
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy meals_delete_self on public.meals
    for delete using (auth.uid() = user_id);

-- --- WORKOUTS (shareable read) ---
create policy workouts_select_self_or_shared on public.workouts
    for select using (
        auth.uid() = user_id
        or (shared_workout_id is not null
            and user_id in (
                select id from public.profiles
                where household_id = public.current_user_household_id()
                  and household_id is not null
            )
        )
    );

create policy workouts_insert_self on public.workouts
    for insert with check (auth.uid() = user_id);

create policy workouts_update_self on public.workouts
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy workouts_delete_self on public.workouts
    for delete using (auth.uid() = user_id);

-- --- CONVERSATIONS / MESSAGES ---
create policy conv_all_self on public.conversations
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy messages_all_via_conv on public.messages
    for all using (
        exists (
            select 1 from public.conversations c
            where c.id = messages.conversation_id and c.user_id = auth.uid()
        )
    ) with check (
        exists (
            select 1 from public.conversations c
            where c.id = messages.conversation_id and c.user_id = auth.uid()
        )
    );

-- --- INTELLIGENCE / HISTORY ---
create policy freq_all_self on public.frequent_foods
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy insights_all_self on public.user_insights
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy story_all_self on public.user_story
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy targets_history_all_self on public.daily_targets_history
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy suggestions_all_self on public.meal_suggestions_log
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- --- NOTIFICATIONS ---
create policy push_subs_all_self on public.push_subscriptions
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy notif_schedule_all_self on public.notification_schedule
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
