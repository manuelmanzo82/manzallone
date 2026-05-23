-- M17-M20: Notifications, schedules, target history, suggestion log.

-- M17: push_subscriptions
create table public.push_subscriptions (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references public.profiles(id) on delete cascade,
    endpoint    text not null,
    keys        jsonb not null,
    user_agent  text,
    created_at  timestamptz not null default now(),
    unique (user_id, endpoint)
);

-- M18: notification_schedule
create table public.notification_schedule (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references public.profiles(id) on delete cascade,
    type            text,
    time_hhmm       text,
    days_of_week    int[] default '{0,1,2,3,4,5,6}',
    enabled         boolean default true,
    last_sent_at    timestamptz,
    created_at      timestamptz not null default now()
);

-- M19: daily_targets_history (snapshot every recalc)
create table public.daily_targets_history (
    id                      uuid primary key default gen_random_uuid(),
    user_id                 uuid not null references public.profiles(id) on delete cascade,
    valid_from              date not null default current_date,
    daily_calorie_target    int,
    daily_protein_target_g  numeric(6,2),
    daily_carbs_target_g    numeric(6,2),
    daily_fat_target_g      numeric(6,2),
    weight_at_calculation   numeric(5,2),
    reason                  text,
    created_at              timestamptz not null default now()
);
create index idx_targets_history on public.daily_targets_history(user_id, valid_from desc);

-- M20: meal_suggestions_log
create table public.meal_suggestions_log (
    id                       uuid primary key default gen_random_uuid(),
    user_id                  uuid not null references public.profiles(id) on delete cascade,
    suggested_at             timestamptz not null default now(),
    meal_type                text,
    suggested_items          jsonb,
    reasoning                text,
    daily_status_snapshot    jsonb,
    followed                 boolean,
    actual_meal_id           uuid references public.meals(id) on delete set null,
    feedback                 text
);
create index idx_suggestions_user on public.meal_suggestions_log(user_id, suggested_at desc);
