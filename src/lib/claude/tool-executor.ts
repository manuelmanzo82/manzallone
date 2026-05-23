import type { SupabaseClient } from '@supabase/supabase-js'

// Executes a tool_use block from Claude and returns the JSON payload
// that will be sent back as a tool_result.
// Errors are returned as { error: string } so Claude can recover gracefully.

interface MealItem {
  name: string
  quantity_g: number
}

interface MealItemInput {
  name?: unknown
  quantity_g?: unknown
}

const ALLOWED_MEAL_TYPES = new Set([
  'breakfast',
  'morning_snack',
  'lunch',
  'afternoon_snack',
  'dinner',
  'evening_snack',
])

export async function executeTool(
  supabase: SupabaseClient,
  userId: string,
  toolName: string,
  input: Record<string, unknown>
): Promise<{ result: unknown; isError: boolean }> {
  try {
    switch (toolName) {
      case 'log_weight':
        return ok(await runLogWeight(supabase, userId, input))
      case 'record_meal':
        return ok(await runRecordMeal(supabase, userId, input))
      case 'log_water':
        return ok(await runLogWater(supabase, userId, input))
      case 'log_workout':
        return ok(await runLogWorkout(supabase, userId, input))
      case 'suggest_next_meal':
        return ok(await runSuggestNextMeal(supabase, userId))
      case 'query_food':
        return ok(await runQueryFood(supabase, input))
      case 'query_daily_status':
        return ok(await runQueryDailyStatus(supabase, userId))
      case 'query_household_member_status':
        return ok(await runQueryHouseholdMemberStatus(supabase, userId, input))
      default:
        return err(`tool sconosciuto: ${toolName}`)
    }
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e))
  }
}

function ok(result: unknown) {
  return { result, isError: false }
}
function err(message: string) {
  return { result: { error: message }, isError: true }
}

async function runLogWeight(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
) {
  const weight = Number(input.weight_kg)
  if (!Number.isFinite(weight) || weight < 30 || weight > 250) {
    throw new Error('weight_kg fuori range (30–250 kg)')
  }
  const notes = typeof input.notes === 'string' ? input.notes : null
  const { data, error } = await supabase.rpc('log_weight_and_recalculate', {
    p_user_id: userId,
    p_weight: weight,
    p_notes: notes,
  })
  if (error) throw new Error(error.message)

  // pull last weight before this one for delta context
  const { data: prev } = await supabase
    .from('weights')
    .select('weight_kg, recorded_at')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
    .range(1, 1)

  const last = prev?.[0]
  return {
    ...((data as Record<string, unknown>) ?? {}),
    weight_kg: weight,
    previous_weight_kg: last?.weight_kg ?? null,
    delta_kg:
      last?.weight_kg != null ? Number((weight - Number(last.weight_kg)).toFixed(2)) : null,
  }
}

async function runRecordMeal(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
) {
  const mealType = String(input.meal_type ?? '')
  if (!ALLOWED_MEAL_TYPES.has(mealType)) {
    throw new Error(`meal_type non valido: ${mealType}`)
  }
  const rawItems = Array.isArray(input.items) ? input.items : []
  const requested: MealItem[] = rawItems
    .map((it): MealItem | null => {
      const r = it as MealItemInput
      const name = typeof r.name === 'string' ? r.name.trim().toLowerCase() : ''
      const qty = Number(r.quantity_g)
      if (!name || !Number.isFinite(qty) || qty <= 0) return null
      return { name, quantity_g: qty }
    })
    .filter((x): x is MealItem => x !== null)

  if (requested.length === 0) throw new Error('nessun item valido nel pasto')

  // Resolve each free-text name to a real food_catalog entry (the SQL RPC
  // does exact-match only). We use ilike + alias lookup. Items that can't be
  // resolved are passed through untouched and the RPC will skip enrichment.
  const items: Array<MealItem & { food_id?: string }> = []
  const unresolved: string[] = []
  for (const it of requested) {
    const id = await resolveFoodId(supabase, it.name)
    if (id) items.push({ ...it, food_id: id })
    else {
      unresolved.push(it.name)
      items.push(it)
    }
  }

  const location = typeof input.location === 'string' ? input.location : null
  const notes = typeof input.notes === 'string' ? input.notes : null

  // ---- Multi-member resolution (household) ----
  const rawForMembers = Array.isArray(input.for_members) ? input.for_members : []
  const forMemberNames = rawForMembers
    .map((n) => (typeof n === 'string' ? n.trim() : ''))
    .filter((n) => n.length > 0)
  const includeSelf =
    input.include_self === undefined ? true : Boolean(input.include_self)

  const resolvedMembers: { name: string; user_id: string }[] = []
  const unresolvedMembers: string[] = []
  for (const name of forMemberNames) {
    const { data: targetId, error: resolveErr } = await supabase.rpc(
      'resolve_household_member_by_name',
      { p_actor_user_id: userId, p_name: name }
    )
    if (resolveErr) throw new Error(resolveErr.message)
    if (targetId) resolvedMembers.push({ name, user_id: String(targetId) })
    else unresolvedMembers.push(name)
  }

  // If the user asked for someone we can't resolve, abort instead of silently
  // logging only for self — confusion would be worse.
  if (unresolvedMembers.length > 0) {
    throw new Error(
      `membri household non trovati: ${unresolvedMembers.join(', ')}. Verifica che facciano parte del tuo household.`
    )
  }

  const hasOthers = resolvedMembers.length > 0

  if (!hasOthers) {
    // Solo per l'utente attuale: percorso classico.
    const { data, error } = await supabase.rpc('record_meal_with_totals', {
      p_user_id: userId,
      p_meal_type: mealType,
      p_items: items,
      p_location: location,
      p_notes: notes,
      p_source: 'claude',
    })
    if (error) throw new Error(error.message)
    const mealId = String(data ?? '')
    const { data: meal } = await supabase
      .from('meals')
      .select('id, meal_type, items, total_kcal, total_protein, total_carbs, total_fat, total_fiber')
      .eq('id', mealId)
      .single()
    const { data: daily } = await supabase.rpc('get_daily_status', { p_user_id: userId })
    return {
      meal,
      daily_status: daily,
      unresolved_items: unresolved,
      logged_for: [{ user_id: userId, is_self: true }],
    }
  }

  // Multi-member: include self if requested.
  const targetIds: string[] = []
  if (includeSelf) targetIds.push(userId)
  for (const m of resolvedMembers) targetIds.push(m.user_id)

  const { data: rows, error: rpcErr } = await supabase.rpc(
    'record_meal_for_members',
    {
      p_actor_user_id: userId,
      p_member_user_ids: targetIds,
      p_meal_type: mealType,
      p_items: items,
      p_location: location,
      p_notes: notes,
      p_source: 'claude',
    }
  )
  if (rpcErr) throw new Error(rpcErr.message)

  const inserted = (rows ?? []) as Array<{
    member_user_id: string
    inserted_meal_id: string
    shared_meal_id: string | null
  }>

  // Fetch the actor's own meal (if any) for totals + daily status.
  const selfRow = inserted.find((r) => r.member_user_id === userId)
  let meal: unknown = null
  let daily: unknown = null
  if (selfRow) {
    const { data: m } = await supabase
      .from('meals')
      .select('id, meal_type, items, total_kcal, total_protein, total_carbs, total_fat, total_fiber, shared_meal_id')
      .eq('id', selfRow.inserted_meal_id)
      .single()
    meal = m
    const { data: d } = await supabase.rpc('get_daily_status', { p_user_id: userId })
    daily = d
  }

  // Resolve member names for the response so Claude can confirm naturally.
  const namedLogged: Array<{ user_id: string; name: string | null; is_self: boolean }> =
    inserted.map((r) => ({
      user_id: r.member_user_id,
      name:
        r.member_user_id === userId
          ? 'tu'
          : resolvedMembers.find((m) => m.user_id === r.member_user_id)?.name ??
            null,
      is_self: r.member_user_id === userId,
    }))

  return {
    meal,                              // null if include_self=false
    daily_status: daily,               // null if include_self=false
    unresolved_items: unresolved,
    logged_for: namedLogged,
    shared_meal_id: inserted[0]?.shared_meal_id ?? null,
  }
}

// Lookup catalog id by name OR alias. Tries exact, then ilike on name/aliases.
async function resolveFoodId(
  supabase: SupabaseClient,
  name: string
): Promise<string | null> {
  const lower = name.toLowerCase()
  // 1. exact match on canonical name
  const { data: exact } = await supabase
    .from('food_catalog')
    .select('id')
    .eq('name', lower)
    .maybeSingle()
  if (exact?.id) return exact.id as string

  // 2. exact match on aliases array
  const { data: aliasHit } = await supabase
    .from('food_catalog')
    .select('id')
    .contains('aliases', [lower])
    .limit(1)
  if (aliasHit && aliasHit[0]?.id) return aliasHit[0].id as string

  // 3. fuzzy ilike (snake to space + space to snake covered by trigram index)
  const slug = lower.replace(/\s+/g, '_')
  const { data: fuzzy } = await supabase
    .from('food_catalog')
    .select('id, name')
    .or(`name.ilike.%${lower}%,name.ilike.%${slug}%,display_name.ilike.%${lower}%`)
    .limit(1)
  return fuzzy && fuzzy[0]?.id ? (fuzzy[0].id as string) : null
}

async function runLogWater(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
) {
  const ml = Math.round(Number(input.ml))
  if (!Number.isFinite(ml) || ml <= 0 || ml > 5000) {
    throw new Error('ml deve essere tra 1 e 5000')
  }
  const { error } = await supabase.from('water').insert({ user_id: userId, ml })
  if (error) throw new Error(error.message)
  const { data: daily } = await supabase.rpc('get_daily_status', { p_user_id: userId })
  return { ml_logged: ml, daily_status: daily }
}

async function runLogWorkout(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
) {
  const type = typeof input.type === 'string' ? input.type : ''
  const duration = Number(input.duration_min)
  if (!type || !Number.isFinite(duration) || duration <= 0) {
    throw new Error('type e duration_min obbligatori')
  }
  const row: Record<string, unknown> = {
    user_id: userId,
    type,
    duration_min: duration,
    source: 'claude',
  }
  if (Number.isFinite(Number(input.distance_km))) row.distance_km = Number(input.distance_km)
  if (Number.isFinite(Number(input.calories_burned)))
    row.calories_burned = Number(input.calories_burned)
  if (typeof input.notes === 'string') row.notes = input.notes

  const { data, error } = await supabase.from('workouts').insert(row).select().single()
  if (error) throw new Error(error.message)
  return { workout: data }
}

async function runSuggestNextMeal(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.rpc('suggest_next_meal', { p_user_id: userId })
  if (error) throw new Error(error.message)
  return data
}

async function runQueryFood(supabase: SupabaseClient, input: Record<string, unknown>) {
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name) throw new Error('name obbligatorio')
  const { data, error } = await supabase
    .from('food_catalog')
    .select(
      'id, name, display_name, category, avg_kcal_100g, avg_protein_100g, avg_carbs_100g, avg_fat_100g, avg_fiber_100g, default_portion_g'
    )
    .ilike('name', `%${name}%`)
    .limit(5)
  if (error) throw new Error(error.message)
  return { query: name, matches: data ?? [] }
}

async function runQueryDailyStatus(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.rpc('get_daily_status', { p_user_id: userId })
  if (error) throw new Error(error.message)
  return data
}

async function runQueryHouseholdMemberStatus(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
) {
  const memberName = typeof input.member_name === 'string' ? input.member_name.trim() : ''
  if (!memberName) throw new Error('member_name obbligatorio')

  const { data: targetId, error: resolveErr } = await supabase.rpc(
    'resolve_household_member_by_name',
    { p_actor_user_id: userId, p_name: memberName }
  )
  if (resolveErr) throw new Error(resolveErr.message)
  if (!targetId) {
    return {
      error: 'member_not_found',
      detail: `non ho trovato nessun membro household chiamato "${memberName}"`,
    }
  }

  const { data: status, error: statusErr } = await supabase.rpc(
    'get_member_daily_status',
    {
      p_actor_user_id: userId,
      p_target_user_id: String(targetId),
      p_date: new Date().toISOString().slice(0, 10),
    }
  )
  if (statusErr) throw new Error(statusErr.message)

  return {
    member_name: memberName,
    target_user_id: String(targetId),
    daily_status: status,
  }
}
