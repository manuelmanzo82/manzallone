-- M2-M5: Core schema (households, profiles, food_catalog, profile_food_preferences).

-- M2: households
create table public.households (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    invite_code text unique,
    created_by  uuid,
    created_at  timestamptz not null default now()
);

-- M3: profiles (one per auth user)
create table public.profiles (
    id                       uuid primary key references auth.users(id) on delete cascade,
    household_id             uuid references public.households(id) on delete set null,
    name                     text,
    age                      int,
    height_cm                int,
    sex                      text check (sex in ('male','female','other')),
    current_weight           numeric(5,2),
    target_weight            numeric(5,2),
    target_date              date,
    activity_level           text check (activity_level in ('sedentary','light','moderate','active','very_active')),
    goal                     text check (goal in ('lose','maintain','gain','health','performance')),
    daily_calorie_target     int,
    daily_protein_target_g   numeric(6,2),
    daily_carbs_target_g     numeric(6,2),
    daily_fat_target_g       numeric(6,2),
    daily_water_ml_target    int  default 2500,
    macro_split              jsonb default jsonb_build_object('protein',30,'carbs',40,'fat',30),
    food_loves               jsonb default '[]'::jsonb,
    food_hates               jsonb default '[]'::jsonb,
    allergies                jsonb default '[]'::jsonb,
    notification_prefs       jsonb default '{}'::jsonb,
    privacy_prefs            jsonb default jsonb_build_object('share_weight',true,'share_meals',true,'share_workouts',true,'share_stats',true),
    coach_tone               text  default 'direct',
    coach_strictness         text  default 'strict' check (coach_strictness in ('strict','flexible','mixed')),
    onboarding_completed     boolean default false,
    onboarding_step          text,
    onboarding_data          jsonb default '{}'::jsonb,
    created_at               timestamptz not null default now(),
    updated_at               timestamptz not null default now()
);
create index idx_profiles_household on public.profiles(household_id);

-- households.created_by points at profiles (we add FK after profiles exists to keep DDL linear)
alter table public.households
    add constraint households_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

-- M4: food_catalog (shared shopping list of nutritional data)
create table public.food_catalog (
    id                     uuid primary key default gen_random_uuid(),
    name                   text not null unique,
    display_name           text,
    category               text,
    subcategory            text,
    avg_kcal_100g          numeric(6,2),
    avg_protein_100g       numeric(6,2),
    avg_carbs_100g         numeric(6,2),
    avg_fat_100g           numeric(6,2),
    avg_fiber_100g         numeric(6,2),
    glycemic_index         int,
    default_portion_g      numeric(7,2),
    default_portion_unit   text default 'g',
    aliases                text[] default '{}',
    is_system              boolean default false,
    added_by_user_id       uuid references public.profiles(id) on delete set null,
    added_by_household_id  uuid references public.households(id) on delete set null,
    validation_count       int default 1,
    created_at             timestamptz not null default now()
);
create index idx_food_catalog_category on public.food_catalog(category);
create index idx_food_catalog_name_trgm on public.food_catalog using gin (name gin_trgm_ops);

-- M5: profile_food_preferences
create table public.profile_food_preferences (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references public.profiles(id) on delete cascade,
    food_id     uuid not null references public.food_catalog(id) on delete cascade,
    preference  text not null check (preference in ('love','like','neutral','dislike','hate','avoid','allergy')),
    source      text default 'onboarding',
    confidence  numeric(3,2) default 1.0,
    notes       text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    unique (user_id, food_id)
);
create index idx_pref_user on public.profile_food_preferences(user_id);
