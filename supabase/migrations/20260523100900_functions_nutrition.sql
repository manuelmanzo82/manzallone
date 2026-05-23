-- M26-M31: Nutrition / coaching functions (adaptive strict mode).
-- All SECURITY DEFINER and granted to authenticated.

-- ============================================================
-- M26: get_daily_status
-- Returns kcal/protein/carbs/fat/water consumed/remaining/pct for a date.
-- ============================================================
create or replace function public.get_daily_status(p_user_id uuid, p_date date default current_date)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    p public.profiles%rowtype;
    consumed_kcal    numeric := 0;
    consumed_protein numeric := 0;
    consumed_carbs   numeric := 0;
    consumed_fat     numeric := 0;
    consumed_water   numeric := 0;
begin
    select * into p from public.profiles where id = p_user_id;
    if not found then
        return jsonb_build_object('error','profile_not_found','user_id',p_user_id);
    end if;

    select
        coalesce(sum(total_kcal),    0),
        coalesce(sum(total_protein), 0),
        coalesce(sum(total_carbs),   0),
        coalesce(sum(total_fat),     0)
    into consumed_kcal, consumed_protein, consumed_carbs, consumed_fat
    from public.meals
    where user_id = p_user_id
      and recorded_at::date = p_date;

    select coalesce(sum(ml), 0)
    into consumed_water
    from public.water
    where user_id = p_user_id
      and recorded_at::date = p_date;

    return jsonb_build_object(
        'date', p_date,
        'targets', jsonb_build_object(
            'kcal',    p.daily_calorie_target,
            'protein', p.daily_protein_target_g,
            'carbs',   p.daily_carbs_target_g,
            'fat',     p.daily_fat_target_g,
            'water_ml', p.daily_water_ml_target
        ),
        'consumed', jsonb_build_object(
            'kcal',    consumed_kcal,
            'protein', consumed_protein,
            'carbs',   consumed_carbs,
            'fat',     consumed_fat,
            'water_ml', consumed_water
        ),
        'remaining', jsonb_build_object(
            'kcal',    coalesce(p.daily_calorie_target,0)   - consumed_kcal,
            'protein', coalesce(p.daily_protein_target_g,0) - consumed_protein,
            'carbs',   coalesce(p.daily_carbs_target_g,0)   - consumed_carbs,
            'fat',     coalesce(p.daily_fat_target_g,0)     - consumed_fat,
            'water_ml', coalesce(p.daily_water_ml_target,0) - consumed_water
        ),
        'percentage', jsonb_build_object(
            'kcal',    case when coalesce(p.daily_calorie_target,0)=0   then 0 else round(consumed_kcal    * 100.0 / p.daily_calorie_target,   1) end,
            'protein', case when coalesce(p.daily_protein_target_g,0)=0 then 0 else round(consumed_protein * 100.0 / p.daily_protein_target_g, 1) end,
            'carbs',   case when coalesce(p.daily_carbs_target_g,0)=0   then 0 else round(consumed_carbs   * 100.0 / p.daily_carbs_target_g,   1) end,
            'fat',     case when coalesce(p.daily_fat_target_g,0)=0     then 0 else round(consumed_fat     * 100.0 / p.daily_fat_target_g,     1) end,
            'water_ml',case when coalesce(p.daily_water_ml_target,0)=0  then 0 else round(consumed_water   * 100.0 / p.daily_water_ml_target,  1) end
        )
    );
end;
$$;

grant execute on function public.get_daily_status(uuid, date) to authenticated;

-- ============================================================
-- M27: get_remaining_macros_for_meal
-- Distribution: breakfast 25%, morning_snack 10%, lunch 35%,
-- afternoon_snack 10%, dinner 20%, evening_snack 0% (clamped to remaining).
-- ============================================================
create or replace function public.get_remaining_macros_for_meal(p_user_id uuid, p_meal_type text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    p public.profiles%rowtype;
    pct numeric;
    target_kcal numeric;
    target_protein numeric;
    target_carbs numeric;
    target_fat numeric;
    consumed_kcal numeric := 0;
    consumed_protein numeric := 0;
    consumed_carbs numeric := 0;
    consumed_fat numeric := 0;
    remaining_kcal numeric;
    remaining_protein numeric;
    remaining_carbs numeric;
    remaining_fat numeric;
begin
    select * into p from public.profiles where id = p_user_id;
    if not found then
        return jsonb_build_object('error','profile_not_found');
    end if;

    pct := case p_meal_type
        when 'breakfast'        then 0.25
        when 'morning_snack'    then 0.10
        when 'lunch'            then 0.35
        when 'afternoon_snack'  then 0.10
        when 'dinner'           then 0.20
        when 'evening_snack'    then 0.05
        else 0.20
    end;

    -- already consumed today (all meals)
    select
        coalesce(sum(total_kcal),    0),
        coalesce(sum(total_protein), 0),
        coalesce(sum(total_carbs),   0),
        coalesce(sum(total_fat),     0)
    into consumed_kcal, consumed_protein, consumed_carbs, consumed_fat
    from public.meals
    where user_id = p_user_id
      and recorded_at::date = current_date;

    remaining_kcal    := coalesce(p.daily_calorie_target,0)   - consumed_kcal;
    remaining_protein := coalesce(p.daily_protein_target_g,0) - consumed_protein;
    remaining_carbs   := coalesce(p.daily_carbs_target_g,0)   - consumed_carbs;
    remaining_fat     := coalesce(p.daily_fat_target_g,0)     - consumed_fat;

    -- ideal slice per typical distribution, clamped to "what's actually left for the rest of the day"
    target_kcal    := least(round(coalesce(p.daily_calorie_target,0)   * pct), greatest(remaining_kcal,    0));
    target_protein := least(round(coalesce(p.daily_protein_target_g,0) * pct,1), greatest(remaining_protein,0));
    target_carbs   := least(round(coalesce(p.daily_carbs_target_g,0)   * pct,1), greatest(remaining_carbs,  0));
    target_fat     := least(round(coalesce(p.daily_fat_target_g,0)     * pct,1), greatest(remaining_fat,    0));

    return jsonb_build_object(
        'meal_type',  p_meal_type,
        'pct_of_day', pct,
        'target',     jsonb_build_object('kcal',target_kcal,'protein',target_protein,'carbs',target_carbs,'fat',target_fat),
        'remaining_day', jsonb_build_object('kcal',remaining_kcal,'protein',remaining_protein,'carbs',remaining_carbs,'fat',remaining_fat)
    );
end;
$$;

grant execute on function public.get_remaining_macros_for_meal(uuid, text) to authenticated;

-- ============================================================
-- M28: recalculate_targets - Mifflin-St Jeor + activity + goal.
-- Persists snapshot in daily_targets_history.
-- ============================================================
create or replace function public.recalculate_targets(p_user_id uuid, p_reason text default 'manual')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    p public.profiles%rowtype;
    bmr numeric;
    tdee numeric;
    adj_kcal numeric;
    activity_mult numeric;
    prot_g numeric;
    fat_g numeric;
    carbs_g numeric;
begin
    select * into p from public.profiles where id = p_user_id;
    if not found then
        raise exception 'Profile not found: %', p_user_id;
    end if;

    if p.current_weight is null or p.height_cm is null or p.age is null or p.sex is null or p.activity_level is null or p.goal is null then
        raise notice 'recalculate_targets: missing inputs for user %', p_user_id;
        return;
    end if;

    -- Mifflin-St Jeor
    if p.sex = 'male' then
        bmr := 10 * p.current_weight + 6.25 * p.height_cm - 5 * p.age + 5;
    else
        bmr := 10 * p.current_weight + 6.25 * p.height_cm - 5 * p.age - 161;
    end if;

    activity_mult := case p.activity_level
        when 'sedentary'   then 1.2
        when 'light'       then 1.375
        when 'moderate'    then 1.55
        when 'active'      then 1.725
        when 'very_active' then 1.9
        else 1.2
    end;

    tdee := bmr * activity_mult;

    adj_kcal := case p.goal
        when 'lose'    then tdee - 500
        when 'gain'    then tdee + 300
        when 'maintain' then tdee
        when 'health'   then tdee
        when 'performance' then tdee + 200
        else tdee
    end;

    -- protein 1.8 g/kg if lose or gain, else 1.4
    prot_g := case when p.goal in ('lose','gain','performance') then 1.8 else 1.4 end * p.current_weight;
    -- fat 0.8 g/kg body weight
    fat_g  := 0.8 * p.current_weight;
    -- carbs = remaining kcal / 4
    carbs_g := greatest((adj_kcal - prot_g * 4 - fat_g * 9) / 4, 0);

    update public.profiles set
        daily_calorie_target   = round(adj_kcal),
        daily_protein_target_g = round(prot_g,  1),
        daily_carbs_target_g   = round(carbs_g, 1),
        daily_fat_target_g     = round(fat_g,   1),
        updated_at             = now()
    where id = p_user_id;

    insert into public.daily_targets_history (
        user_id, valid_from,
        daily_calorie_target, daily_protein_target_g, daily_carbs_target_g, daily_fat_target_g,
        weight_at_calculation, reason
    ) values (
        p_user_id, current_date,
        round(adj_kcal), round(prot_g,1), round(carbs_g,1), round(fat_g,1),
        p.current_weight, p_reason
    );
end;
$$;

grant execute on function public.recalculate_targets(uuid, text) to authenticated;

-- ============================================================
-- M29: log_weight_and_recalculate
-- Logs a weight entry; if delta vs last recalc > 0.5 kg, recalc targets.
-- Also updates profiles.current_weight to keep BMR fresh.
-- ============================================================
create or replace function public.log_weight_and_recalculate(p_user_id uuid, p_weight numeric, p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    last_weight numeric;
    weight_id uuid;
    did_recalc boolean := false;
begin
    insert into public.weights (user_id, weight_kg, notes)
    values (p_user_id, p_weight, p_notes)
    returning id into weight_id;

    select weight_at_calculation
    into last_weight
    from public.daily_targets_history
    where user_id = p_user_id
    order by created_at desc
    limit 1;

    update public.profiles set current_weight = p_weight, updated_at = now() where id = p_user_id;

    if last_weight is null or abs(p_weight - last_weight) > 0.5 then
        perform public.recalculate_targets(p_user_id, 'weight_change');
        did_recalc := true;
    end if;

    return jsonb_build_object('weight_id', weight_id, 'recalculated', did_recalc);
end;
$$;

grant execute on function public.log_weight_and_recalculate(uuid, numeric, text) to authenticated;

-- ============================================================
-- M30: suggest_next_meal
-- Picks the next meal type from current time, returns macro targets,
-- and 3 simple option scaffolds (high_protein, balanced, light)
-- drawn from food_catalog matching user loves and excluding hates.
-- The smart natural-language suggestion is built in the Claude prompt layer;
-- this RPC just gives the math + candidate foods.
-- ============================================================
create or replace function public.suggest_next_meal(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    p public.profiles%rowtype;
    h int;
    next_type text;
    macros jsonb;
    loves jsonb;
    hates jsonb;
    proteins jsonb;
    carbs jsonb;
    veggies jsonb;
begin
    select * into p from public.profiles where id = p_user_id;
    if not found then
        return jsonb_build_object('error','profile_not_found');
    end if;

    h := extract(hour from (now() at time zone 'Europe/Rome'));
    next_type := case
        when h >= 6  and h < 10 then 'breakfast'
        when h >= 10 and h < 12 then 'morning_snack'
        when h >= 12 and h < 15 then 'lunch'
        when h >= 15 and h < 18 then 'afternoon_snack'
        when h >= 18 and h < 22 then 'dinner'
        else 'evening_snack'
    end;

    macros := public.get_remaining_macros_for_meal(p_user_id, next_type);

    loves := coalesce(p.food_loves, '[]'::jsonb);
    hates := coalesce(p.food_hates, '[]'::jsonb) || coalesce(p.allergies, '[]'::jsonb);

    -- Candidate foods per macronutrient class, filtered against hates, sorted by loves first
    select coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
      into proteins
      from (
          select id, name, display_name, avg_kcal_100g, avg_protein_100g, avg_carbs_100g, avg_fat_100g, default_portion_g
          from public.food_catalog
          where category in ('proteine_animali','proteine_vegetali','latticini')
            and not (hates ? name)
          order by case when loves ? name then 0 else 1 end, validation_count desc
          limit 5
      ) f;

    select coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
      into carbs
      from (
          select id, name, display_name, avg_kcal_100g, avg_protein_100g, avg_carbs_100g, avg_fat_100g, default_portion_g
          from public.food_catalog
          where category = 'carboidrati'
            and not (hates ? name)
          order by case when loves ? name then 0 else 1 end, validation_count desc
          limit 5
      ) f;

    select coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
      into veggies
      from (
          select id, name, display_name, avg_kcal_100g, avg_protein_100g, avg_carbs_100g, avg_fat_100g, default_portion_g
          from public.food_catalog
          where category = 'verdure'
            and not (hates ? name)
          order by case when loves ? name then 0 else 1 end, validation_count desc
          limit 5
      ) f;

    return jsonb_build_object(
        'meal_type',        next_type,
        'macros',           macros,
        'candidate_foods',  jsonb_build_object(
            'proteins', proteins,
            'carbs',    carbs,
            'veggies',  veggies
        )
    );
end;
$$;

grant execute on function public.suggest_next_meal(uuid) to authenticated;

-- ============================================================
-- M31: record_meal_with_totals
-- items format: [{"food_id":"uuid","quantity_g":80}, ...]
-- Computes totals from food_catalog and inserts the meal row.
-- Also updates frequent_foods upsert.
-- ============================================================
create or replace function public.record_meal_with_totals(
    p_user_id   uuid,
    p_meal_type text,
    p_items     jsonb,
    p_location  text default null,
    p_notes     text default null,
    p_source    text default 'manual'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    meal_id        uuid;
    item           jsonb;
    food           public.food_catalog%rowtype;
    qty            numeric;
    factor         numeric;
    total_kcal     numeric := 0;
    total_protein  numeric := 0;
    total_carbs    numeric := 0;
    total_fat      numeric := 0;
    total_fiber    numeric := 0;
    enriched_items jsonb := '[]'::jsonb;
    enriched_item  jsonb;
begin
    for item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
    loop
        qty := coalesce((item->>'quantity_g')::numeric, 0);

        if item ? 'food_id' and item->>'food_id' is not null then
            select * into food from public.food_catalog where id = (item->>'food_id')::uuid;
        elsif item ? 'name' then
            select * into food from public.food_catalog where name = item->>'name';
        else
            food := null;
        end if;

        if found and qty > 0 then
            factor := qty / 100.0;
            total_kcal    := total_kcal    + coalesce(food.avg_kcal_100g, 0)    * factor;
            total_protein := total_protein + coalesce(food.avg_protein_100g, 0) * factor;
            total_carbs   := total_carbs   + coalesce(food.avg_carbs_100g, 0)   * factor;
            total_fat     := total_fat     + coalesce(food.avg_fat_100g, 0)     * factor;
            total_fiber   := total_fiber   + coalesce(food.avg_fiber_100g, 0)   * factor;

            enriched_item := jsonb_build_object(
                'food_id',     food.id,
                'name',        food.name,
                'display_name',food.display_name,
                'quantity_g',  qty,
                'kcal',        round(coalesce(food.avg_kcal_100g, 0)    * factor, 1),
                'protein',     round(coalesce(food.avg_protein_100g, 0) * factor, 1),
                'carbs',       round(coalesce(food.avg_carbs_100g, 0)   * factor, 1),
                'fat',         round(coalesce(food.avg_fat_100g, 0)     * factor, 1),
                'fiber',       round(coalesce(food.avg_fiber_100g, 0)   * factor, 1)
            );
        else
            enriched_item := item;
        end if;

        enriched_items := enriched_items || enriched_item;

        -- frequent_foods upsert
        if found then
            insert into public.frequent_foods (user_id, meal_type, food_name, frequency, last_used, avg_kcal, avg_portion_g)
            values (p_user_id, p_meal_type, food.name, 1, now(),
                    coalesce(food.avg_kcal_100g,0) * factor, qty)
            on conflict (user_id, meal_type, food_name) do update
              set frequency     = public.frequent_foods.frequency + 1,
                  last_used     = now(),
                  avg_kcal      = (public.frequent_foods.avg_kcal      * public.frequent_foods.frequency + excluded.avg_kcal)      / (public.frequent_foods.frequency + 1),
                  avg_portion_g = (public.frequent_foods.avg_portion_g * public.frequent_foods.frequency + excluded.avg_portion_g) / (public.frequent_foods.frequency + 1);
        end if;
    end loop;

    insert into public.meals (
        user_id, meal_type, items,
        total_kcal, total_protein, total_carbs, total_fat, total_fiber,
        location, notes, source
    )
    values (
        p_user_id, p_meal_type, enriched_items,
        round(total_kcal, 1), round(total_protein, 1), round(total_carbs, 1), round(total_fat, 1), round(total_fiber, 1),
        p_location, p_notes, p_source
    )
    returning id into meal_id;

    return meal_id;
end;
$$;

grant execute on function public.record_meal_with_totals(uuid, text, jsonb, text, text, text) to authenticated;
