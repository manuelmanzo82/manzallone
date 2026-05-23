-- Dashboard RPCs. All SECURITY DEFINER + granted to authenticated.
-- Bucketing happens in Europe/Rome so an entry at 23:30 local stays "today".

-- ============================================================
-- get_weight_history(user_id, start_date, end_date)
-- One row per day in range, weight = last weight for that day (NULL if none),
-- delta_from_previous = current day weight - previous available day weight.
-- ============================================================
create or replace function public.get_weight_history(
    p_user_id    uuid,
    p_start_date date,
    p_end_date   date
)
returns table (
    "date"               date,
    weight_kg            numeric,
    delta_from_previous  numeric
)
language sql
security definer
set search_path = public
stable
as $$
    with days as (
        select generate_series(p_start_date, p_end_date, interval '1 day')::date as d
    ),
    per_day as (
        select (recorded_at at time zone 'Europe/Rome')::date as d,
               (array_agg(weight_kg order by recorded_at desc))[1] as weight_kg
        from public.weights
        where user_id = p_user_id
          and (recorded_at at time zone 'Europe/Rome')::date between p_start_date and p_end_date
        group by 1
    ),
    joined as (
        select d.d as "date", pd.weight_kg
        from days d
        left join per_day pd on pd.d = d.d
        order by d.d
    ),
    with_prev as (
        select "date",
               weight_kg,
               (
                 select w2.weight_kg
                 from joined w2
                 where w2."date" < joined."date"
                   and w2.weight_kg is not null
                 order by w2."date" desc
                 limit 1
               ) as prev_weight
        from joined
    )
    select "date",
           weight_kg,
           case when weight_kg is null or prev_weight is null then null
                else round(weight_kg - prev_weight, 2)
           end as delta_from_previous
    from with_prev
    order by "date";
$$;

grant execute on function public.get_weight_history(uuid, date, date) to authenticated;

-- ============================================================
-- get_meals_summary_by_day
-- One row per day with totals + meal_count + meal_types[].
-- Days without meals omitted (client fills gaps).
-- ============================================================
create or replace function public.get_meals_summary_by_day(
    p_user_id    uuid,
    p_start_date date,
    p_end_date   date
)
returns table (
    "date"          date,
    total_kcal      numeric,
    total_protein   numeric,
    total_carbs     numeric,
    total_fat       numeric,
    total_fiber     numeric,
    meal_count      int,
    meal_types      text[]
)
language sql
security definer
set search_path = public
stable
as $$
    select (recorded_at at time zone 'Europe/Rome')::date as "date",
           round(coalesce(sum(total_kcal),    0), 1) as total_kcal,
           round(coalesce(sum(total_protein), 0), 1) as total_protein,
           round(coalesce(sum(total_carbs),   0), 1) as total_carbs,
           round(coalesce(sum(total_fat),     0), 1) as total_fat,
           round(coalesce(sum(total_fiber),   0), 1) as total_fiber,
           count(*)::int                            as meal_count,
           array_agg(distinct meal_type)            as meal_types
    from public.meals
    where user_id = p_user_id
      and (recorded_at at time zone 'Europe/Rome')::date between p_start_date and p_end_date
    group by 1
    order by 1;
$$;

grant execute on function public.get_meals_summary_by_day(uuid, date, date) to authenticated;

-- ============================================================
-- get_workouts_summary
-- ============================================================
create or replace function public.get_workouts_summary(
    p_user_id    uuid,
    p_start_date date,
    p_end_date   date
)
returns table (
    "date"      date,
    count       int,
    total_min   int,
    total_km    numeric,
    total_kcal  int
)
language sql
security definer
set search_path = public
stable
as $$
    select (recorded_at at time zone 'Europe/Rome')::date as "date",
           count(*)::int                                  as count,
           coalesce(sum(duration_min), 0)::int            as total_min,
           round(coalesce(sum(distance_km), 0), 2)         as total_km,
           coalesce(sum(calories_burned), 0)::int          as total_kcal
    from public.workouts
    where user_id = p_user_id
      and (recorded_at at time zone 'Europe/Rome')::date between p_start_date and p_end_date
    group by 1
    order by 1;
$$;

grant execute on function public.get_workouts_summary(uuid, date, date) to authenticated;

-- ============================================================
-- get_water_by_day
-- ============================================================
create or replace function public.get_water_by_day(
    p_user_id    uuid,
    p_start_date date,
    p_end_date   date
)
returns table (
    "date"     date,
    total_ml   int
)
language sql
security definer
set search_path = public
stable
as $$
    select (recorded_at at time zone 'Europe/Rome')::date as "date",
           coalesce(sum(ml), 0)::int as total_ml
    from public.water
    where user_id = p_user_id
      and (recorded_at at time zone 'Europe/Rome')::date between p_start_date and p_end_date
    group by 1
    order by 1;
$$;

grant execute on function public.get_water_by_day(uuid, date, date) to authenticated;

-- ============================================================
-- get_streak(user_id)
-- Consecutive days (back from today in Europe/Rome) with ANY tracking event:
-- weight OR meal OR water OR workout.
-- Today is counted only if there is an event today; if not, streak walks back
-- from yesterday so the user doesn't lose their streak before midnight.
-- ============================================================
create or replace function public.get_streak(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    today_rome date := (now() at time zone 'Europe/Rome')::date;
    has_today  boolean;
    cursor_d   date;
    streak     int := 0;
    day_has    boolean;
begin
    -- Check if today has any event
    select exists (
        select 1 from public.weights
          where user_id = p_user_id and (recorded_at at time zone 'Europe/Rome')::date = today_rome
        union all
        select 1 from public.meals
          where user_id = p_user_id and (recorded_at at time zone 'Europe/Rome')::date = today_rome
        union all
        select 1 from public.water
          where user_id = p_user_id and (recorded_at at time zone 'Europe/Rome')::date = today_rome
        union all
        select 1 from public.workouts
          where user_id = p_user_id and (recorded_at at time zone 'Europe/Rome')::date = today_rome
    ) into has_today;

    cursor_d := case when has_today then today_rome else today_rome - interval '1 day' end;

    loop
        select exists (
            select 1 from public.weights
              where user_id = p_user_id and (recorded_at at time zone 'Europe/Rome')::date = cursor_d
            union all
            select 1 from public.meals
              where user_id = p_user_id and (recorded_at at time zone 'Europe/Rome')::date = cursor_d
            union all
            select 1 from public.water
              where user_id = p_user_id and (recorded_at at time zone 'Europe/Rome')::date = cursor_d
            union all
            select 1 from public.workouts
              where user_id = p_user_id and (recorded_at at time zone 'Europe/Rome')::date = cursor_d
        ) into day_has;

        if not day_has then
            exit;
        end if;

        streak := streak + 1;
        cursor_d := cursor_d - interval '1 day';

        -- safety cap
        if streak > 3650 then
            exit;
        end if;
    end loop;

    return streak;
end;
$$;

grant execute on function public.get_streak(uuid) to authenticated;

-- ============================================================
-- get_week_comparison(user_id, week_start)
-- Compares current week (week_start .. +6d) vs previous week (week_start-7 .. -1).
-- Returns jsonb with avg_weight, avg_kcal, workouts count, calorie target adherence.
-- "hit" = day where consumed kcal between 70% and 110% of target.
-- ============================================================
create or replace function public.get_week_comparison(
    p_user_id    uuid,
    p_week_start date
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    prev_start date := p_week_start - interval '7 days';
    prev_end   date := p_week_start - interval '1 day';
    cur_end    date := p_week_start + interval '6 days';
    p          public.profiles%rowtype;
    target     numeric;

    cur_avg_weight  numeric;
    prev_avg_weight numeric;
    cur_avg_kcal    numeric;
    prev_avg_kcal   numeric;
    cur_workouts    int;
    prev_workouts   int;
    cur_hit         int;
    prev_hit        int;
    cur_days        int;
    prev_days       int;
begin
    select * into p from public.profiles where id = p_user_id;
    target := coalesce(p.daily_calorie_target, 0);

    -- avg weight (mean of daily lasts)
    with d as (
        select (recorded_at at time zone 'Europe/Rome')::date as d,
               (array_agg(weight_kg order by recorded_at desc))[1] as w
        from public.weights
        where user_id = p_user_id
          and (recorded_at at time zone 'Europe/Rome')::date between p_week_start and cur_end
        group by 1
    )
    select round(avg(w), 2) into cur_avg_weight from d;

    with d as (
        select (recorded_at at time zone 'Europe/Rome')::date as d,
               (array_agg(weight_kg order by recorded_at desc))[1] as w
        from public.weights
        where user_id = p_user_id
          and (recorded_at at time zone 'Europe/Rome')::date between prev_start and prev_end
        group by 1
    )
    select round(avg(w), 2) into prev_avg_weight from d;

    -- avg kcal/day (only over days with at least one meal)
    with d as (
        select (recorded_at at time zone 'Europe/Rome')::date as d,
               sum(total_kcal) as k
        from public.meals
        where user_id = p_user_id
          and (recorded_at at time zone 'Europe/Rome')::date between p_week_start and cur_end
        group by 1
    )
    select round(avg(k), 0), count(*)::int into cur_avg_kcal, cur_days from d;

    with d as (
        select (recorded_at at time zone 'Europe/Rome')::date as d,
               sum(total_kcal) as k
        from public.meals
        where user_id = p_user_id
          and (recorded_at at time zone 'Europe/Rome')::date between prev_start and prev_end
        group by 1
    )
    select round(avg(k), 0), count(*)::int into prev_avg_kcal, prev_days from d;

    -- workout counts
    select count(*)::int into cur_workouts
    from public.workouts
    where user_id = p_user_id
      and (recorded_at at time zone 'Europe/Rome')::date between p_week_start and cur_end;

    select count(*)::int into prev_workouts
    from public.workouts
    where user_id = p_user_id
      and (recorded_at at time zone 'Europe/Rome')::date between prev_start and prev_end;

    -- adherence hit count
    if target > 0 then
        with d as (
            select (recorded_at at time zone 'Europe/Rome')::date as d,
                   sum(total_kcal) as k
            from public.meals
            where user_id = p_user_id
              and (recorded_at at time zone 'Europe/Rome')::date between p_week_start and cur_end
            group by 1
        )
        select count(*)::int into cur_hit
        from d where k between target * 0.7 and target * 1.1;

        with d as (
            select (recorded_at at time zone 'Europe/Rome')::date as d,
                   sum(total_kcal) as k
            from public.meals
            where user_id = p_user_id
              and (recorded_at at time zone 'Europe/Rome')::date between prev_start and prev_end
            group by 1
        )
        select count(*)::int into prev_hit
        from d where k between target * 0.7 and target * 1.1;
    else
        cur_hit := 0;
        prev_hit := 0;
    end if;

    return jsonb_build_object(
        'current_week_start', p_week_start,
        'previous_week_start', prev_start,
        'avg_weight', jsonb_build_object(
            'current', cur_avg_weight,
            'previous', prev_avg_weight,
            'delta', case when cur_avg_weight is not null and prev_avg_weight is not null
                          then round(cur_avg_weight - prev_avg_weight, 2)
                          else null end
        ),
        'avg_kcal_per_day', jsonb_build_object(
            'current', cur_avg_kcal,
            'previous', prev_avg_kcal,
            'delta', case when cur_avg_kcal is not null and prev_avg_kcal is not null
                          then round(cur_avg_kcal - prev_avg_kcal, 0)
                          else null end
        ),
        'workouts', jsonb_build_object(
            'current', cur_workouts,
            'previous', prev_workouts,
            'delta', cur_workouts - prev_workouts
        ),
        'calorie_target_adherence', jsonb_build_object(
            'current_hit', cur_hit,
            'current_total', cur_days,
            'previous_hit', prev_hit,
            'previous_total', prev_days,
            'target_kcal', target
        )
    );
end;
$$;

grant execute on function public.get_week_comparison(uuid, date) to authenticated;

-- ============================================================
-- get_meals_for_week(user_id, week_start)
-- Returns full meal rows for the week (needed by MealsSection).
-- Limited helper to keep client query simple; client could also hit meals table
-- directly via PostgREST. Kept as RPC for symmetry and so a single dashboard
-- fetch can call all RPCs in parallel.
-- ============================================================
create or replace function public.get_meals_for_week(
    p_user_id    uuid,
    p_week_start date
)
returns setof public.meals
language sql
security definer
set search_path = public
stable
as $$
    select *
    from public.meals
    where user_id = p_user_id
      and (recorded_at at time zone 'Europe/Rome')::date
          between p_week_start and (p_week_start + interval '6 days')::date
    order by recorded_at desc;
$$;

grant execute on function public.get_meals_for_week(uuid, date) to authenticated;

-- ============================================================
-- get_workouts_for_week(user_id, week_start)
-- ============================================================
create or replace function public.get_workouts_for_week(
    p_user_id    uuid,
    p_week_start date
)
returns setof public.workouts
language sql
security definer
set search_path = public
stable
as $$
    select *
    from public.workouts
    where user_id = p_user_id
      and (recorded_at at time zone 'Europe/Rome')::date
          between p_week_start and (p_week_start + interval '6 days')::date
    order by recorded_at desc;
$$;

grant execute on function public.get_workouts_for_week(uuid, date) to authenticated;
