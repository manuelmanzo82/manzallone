-- M6-M11: Tracking tables (weights, meals, water, workouts, sleep, supplements).

-- M6: weights
create table public.weights (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references public.profiles(id) on delete cascade,
    weight_kg    numeric(5,2) not null,
    body_fat     numeric(4,2),
    muscle_mass  numeric(5,2),
    recorded_at  timestamptz not null default now(),
    notes        text,
    source       text default 'manual'
);
create index idx_weights_user_time on public.weights(user_id, recorded_at desc);

-- M7: meals
create table public.meals (
    id                   uuid primary key default gen_random_uuid(),
    user_id              uuid not null references public.profiles(id) on delete cascade,
    meal_type            text check (meal_type in ('breakfast','morning_snack','lunch','afternoon_snack','dinner','evening_snack')),
    recorded_at          timestamptz not null default now(),
    items                jsonb default '[]'::jsonb,
    total_kcal           numeric(7,2),
    total_protein        numeric(6,2),
    total_carbs          numeric(6,2),
    total_fat            numeric(6,2),
    total_fiber          numeric(6,2),
    location             text check (location in ('home','restaurant','work','outdoors','other')),
    notes                text,
    photo_url            text,
    source               text default 'manual' check (source in ('manual','claude','screenshot','voice','suggested')),
    shared_meal_id       uuid,
    was_suggested        boolean default false,
    suggestion_followed  boolean
);
create index idx_meals_user_time on public.meals(user_id, recorded_at desc);
create index idx_meals_shared on public.meals(shared_meal_id) where shared_meal_id is not null;

-- M8: water
create table public.water (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references public.profiles(id) on delete cascade,
    ml           int not null check (ml > 0),
    recorded_at  timestamptz not null default now()
);
create index idx_water_user_time on public.water(user_id, recorded_at desc);

-- M9: workouts
create table public.workouts (
    id                  uuid primary key default gen_random_uuid(),
    user_id             uuid not null references public.profiles(id) on delete cascade,
    type                text,
    duration_min        int,
    distance_km         numeric(6,2),
    calories_burned     int,
    pace                text,
    hr_avg              int,
    hr_max              int,
    details             jsonb default '{}'::jsonb,
    recorded_at         timestamptz not null default now(),
    notes               text,
    screenshot_url      text,
    source              text default 'manual',
    shared_workout_id   uuid
);
create index idx_workouts_user_time on public.workouts(user_id, recorded_at desc);
create index idx_workouts_shared on public.workouts(shared_workout_id) where shared_workout_id is not null;

-- M10: sleep
create table public.sleep (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references public.profiles(id) on delete cascade,
    hours        numeric(4,2),
    quality      int check (quality between 1 and 5),
    recorded_at  timestamptz not null default now(),
    notes        text
);
create index idx_sleep_user_time on public.sleep(user_id, recorded_at desc);

-- M11: supplements
create table public.supplements (
    id        uuid primary key default gen_random_uuid(),
    user_id   uuid not null references public.profiles(id) on delete cascade,
    name      text,
    dose      text,
    taken_at  timestamptz not null default now()
);
create index idx_supplements_user_time on public.supplements(user_id, taken_at desc);
