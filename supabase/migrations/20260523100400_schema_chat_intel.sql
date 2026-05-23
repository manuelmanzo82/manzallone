-- M12-M16: Conversations + intelligence (frequent_foods, insights, story).

-- M12: conversations
create table public.conversations (
    id               uuid primary key default gen_random_uuid(),
    user_id          uuid not null references public.profiles(id) on delete cascade,
    started_at       timestamptz not null default now(),
    last_message_at  timestamptz not null default now(),
    title            text
);
create index idx_conversations_user on public.conversations(user_id, last_message_at desc);

-- M13: messages
create table public.messages (
    id                uuid primary key default gen_random_uuid(),
    conversation_id   uuid not null references public.conversations(id) on delete cascade,
    role              text not null check (role in ('user','assistant','system')),
    content           text,
    ui_components     jsonb,
    context_snapshot  jsonb,
    actions_taken     jsonb,
    created_at        timestamptz not null default now()
);
create index idx_messages_conv on public.messages(conversation_id, created_at);

-- M14: frequent_foods (user-meal-food affinity)
create table public.frequent_foods (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references public.profiles(id) on delete cascade,
    meal_type       text,
    food_name       text not null,
    frequency       int default 1,
    last_used       timestamptz default now(),
    avg_kcal        numeric(7,2),
    avg_portion_g   numeric(7,2),
    unique (user_id, meal_type, food_name)
);
create index idx_freq_user on public.frequent_foods(user_id, frequency desc);

-- M15: user_insights (weekly aggregates)
create table public.user_insights (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.profiles(id) on delete cascade,
    week_start    date not null,
    trend_weight    numeric(5,2),
    trend_calories  numeric(7,2),
    trend_activity  numeric(7,2),
    top_foods       jsonb,
    patterns        jsonb,
    correlations    jsonb,
    generated_at    timestamptz not null default now(),
    unique (user_id, week_start)
);

-- M16: user_story (monthly narrative)
create table public.user_story (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references public.profiles(id) on delete cascade,
    month         date not null,
    narrative     text,
    generated_at  timestamptz not null default now(),
    unique (user_id, month)
);
