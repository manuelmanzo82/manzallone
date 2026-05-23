import type { SupabaseClient } from '@supabase/supabase-js'
import type { DailyStatus, Profile } from '@/lib/types'

interface FrequentFoodRow {
  meal_type: string | null
  food_name: string
  frequency: number
}

interface ContextSnapshot {
  now_iso: string
  date_label: string
  weekday: string
  hour: number
  time_of_day: string
  last_meal_today: { meal_type: string | null; recorded_at: string; total_kcal: number | null } | null
  profile: Profile
  daily_status: DailyStatus | null
  frequent_foods: {
    breakfast: string[]
    lunch: string[]
    dinner: string[]
    snack: string[]
  }
  last7days: {
    weight_delta_kg: number | null
    avg_kcal: number | null
    workouts_count: number
  }
}

// Public: returns both the rendered prompt and the structured snapshot
// (the snapshot is saved on messages.context_snapshot for debugging/audit).
export async function buildSystemPrompt(
  supabase: SupabaseClient,
  userId: string
): Promise<{ prompt: string; snapshot: ContextSnapshot }> {
  const snapshot = await collectContext(supabase, userId)
  const prompt = renderPrompt(snapshot)
  return { prompt, snapshot }
}

async function collectContext(
  supabase: SupabaseClient,
  userId: string
): Promise<ContextSnapshot> {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const [
    profileRes,
    statusRes,
    lastMealRes,
    freqRes,
    weights7Res,
    meals7Res,
    workouts7Res,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.rpc('get_daily_status', { p_user_id: userId }),
    supabase
      .from('meals')
      .select('meal_type, recorded_at, total_kcal')
      .eq('user_id', userId)
      .gte('recorded_at', `${today}T00:00:00Z`)
      .order('recorded_at', { ascending: false })
      .limit(1),
    supabase
      .from('frequent_foods')
      .select('meal_type, food_name, frequency')
      .eq('user_id', userId)
      .order('frequency', { ascending: false })
      .limit(40),
    supabase
      .from('weights')
      .select('weight_kg, recorded_at')
      .eq('user_id', userId)
      .gte('recorded_at', `${sevenDaysAgo}T00:00:00Z`)
      .order('recorded_at', { ascending: true }),
    supabase
      .from('meals')
      .select('total_kcal, recorded_at')
      .eq('user_id', userId)
      .gte('recorded_at', `${sevenDaysAgo}T00:00:00Z`),
    supabase
      .from('workouts')
      .select('id')
      .eq('user_id', userId)
      .gte('recorded_at', `${sevenDaysAgo}T00:00:00Z`),
  ])

  const profile = (profileRes.data ?? {}) as Profile
  const daily_status = (statusRes.data ?? null) as DailyStatus | null
  const lastMeal = lastMealRes.data?.[0] ?? null

  const freqRows = (freqRes.data ?? []) as FrequentFoodRow[]
  const groupTop = (matcher: (m: string | null) => boolean) =>
    freqRows
      .filter((r) => matcher(r.meal_type))
      .slice(0, 5)
      .map((r) => r.food_name)

  const frequent_foods = {
    breakfast: groupTop((m) => m === 'breakfast'),
    lunch: groupTop((m) => m === 'lunch'),
    dinner: groupTop((m) => m === 'dinner'),
    snack: groupTop((m) =>
      m === 'morning_snack' || m === 'afternoon_snack' || m === 'evening_snack'
    ),
  }

  // 7-day rollup
  const weights = (weights7Res.data ?? []) as { weight_kg: number; recorded_at: string }[]
  const weight_delta_kg =
    weights.length >= 2
      ? Number(
          (weights[weights.length - 1].weight_kg - weights[0].weight_kg).toFixed(2)
        )
      : null

  const meals = (meals7Res.data ?? []) as { total_kcal: number | null; recorded_at: string }[]
  const dayKcal = new Map<string, number>()
  for (const m of meals) {
    const day = m.recorded_at.slice(0, 10)
    dayKcal.set(day, (dayKcal.get(day) ?? 0) + Number(m.total_kcal ?? 0))
  }
  const avg_kcal =
    dayKcal.size > 0
      ? Math.round(Array.from(dayKcal.values()).reduce((a, b) => a + b, 0) / dayKcal.size)
      : null

  const workouts_count = (workouts7Res.data ?? []).length

  const hour = Number(
    new Intl.DateTimeFormat('it-IT', {
      hour: '2-digit',
      hour12: false,
      timeZone: 'Europe/Rome',
    }).format(now)
  )

  return {
    now_iso: now.toISOString(),
    date_label: new Intl.DateTimeFormat('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Rome',
    }).format(now),
    weekday: new Intl.DateTimeFormat('it-IT', {
      weekday: 'long',
      timeZone: 'Europe/Rome',
    }).format(now),
    hour,
    time_of_day: timeOfDay(hour),
    last_meal_today: lastMeal,
    profile,
    daily_status,
    frequent_foods,
    last7days: { weight_delta_kg, avg_kcal, workouts_count },
  }
}

function timeOfDay(h: number): string {
  if (h < 6) return 'notte'
  if (h < 12) return 'mattina'
  if (h < 14) return 'pranzo'
  if (h < 18) return 'pomeriggio'
  if (h < 22) return 'sera'
  return 'notte'
}

function renderPrompt(s: ContextSnapshot): string {
  const p = s.profile
  const firstName = p.name?.split(' ')[0] ?? 'tu'
  const distance =
    p.current_weight && p.target_weight
      ? Number((p.current_weight - p.target_weight).toFixed(1))
      : null

  const lovesShort = (p.food_loves ?? []).slice(0, 10).join(', ') || '—'
  const hatesShort = (p.food_hates ?? []).slice(0, 10).join(', ') || '—'
  const allergies = (p.allergies ?? []).join(', ') || 'nessuna'

  const lastMeal = s.last_meal_today
    ? `${s.last_meal_today.meal_type ?? '?'} alle ${new Date(s.last_meal_today.recorded_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })} (${Math.round(s.last_meal_today.total_kcal ?? 0)} kcal)`
    : 'nessun pasto registrato oggi'

  const ds = s.daily_status
  const dailyBlock = ds
    ? [
        `Calorie: ${Math.round(ds.consumed.kcal)}/${ds.targets.kcal} kcal (rimangono ${Math.round(ds.remaining.kcal)} = ${ds.percentage.kcal}% usato)`,
        `Proteine: ${ds.consumed.protein}/${ds.targets.protein} g (rimangono ${Math.max(0, Math.round((ds.remaining.protein) * 10) / 10)})`,
        `Carboidrati: ${ds.consumed.carbs}/${ds.targets.carbs} g`,
        `Grassi: ${ds.consumed.fat}/${ds.targets.fat} g`,
        `Acqua: ${ds.consumed.water_ml}/${ds.targets.water_ml} ml`,
      ].join('\n  - ')
    : 'non disponibile'

  const freqBlock = [
    `Colazione: ${s.frequent_foods.breakfast.join(', ') || '—'}`,
    `Pranzo: ${s.frequent_foods.lunch.join(', ') || '—'}`,
    `Cena: ${s.frequent_foods.dinner.join(', ') || '—'}`,
    `Snack: ${s.frequent_foods.snack.join(', ') || '—'}`,
  ].join('\n  - ')

  const last7 = `peso Δ ${s.last7days.weight_delta_kg ?? '—'} kg, media ${s.last7days.avg_kcal ?? '—'} kcal/die, ${s.last7days.workouts_count} allenamenti`

  return `# Identità

Sei il Claude personale di ${firstName}. Lo aiuti con tracking salute, nutrizione, peso e attività in italiano sempre.

Modalità rigida: usi SEMPRE grammature precise (es. 80g pasta, 150g pollo) e kcal esatte. Risposte brevi e azionabili, mai prolisse. Niente consigli generici come "mangia sano" — sempre numeri concreti.

Tono: ${p.coach_tone ?? 'direct'} — sii ${toneAdjective(p.coach_tone)}. Sui sgarri: registra senza giudizio, ricalcola, proponi piano riequilibrio per il resto della giornata.

# Contesto temporale

- Data: ${s.date_label}
- Ora: ${s.hour}:00 (Europe/Rome)
- Momento: ${s.time_of_day}
- Ultimo pasto oggi: ${lastMeal}

# Stato utente

- Nome: ${p.name ?? '—'} (${p.age ?? '?'} anni, ${p.height_cm ?? '?'} cm, ${p.sex ?? '?'})
- Peso attuale: ${p.current_weight ?? '?'} kg → target ${p.target_weight ?? '?'} kg${distance !== null ? ` (distanza ${distance} kg)` : ''}
- Goal: ${p.goal ?? '—'}, attività ${p.activity_level ?? '—'}
- Target giornalieri: ${p.daily_calorie_target ?? '?'} kcal / ${p.daily_protein_target_g ?? '?'}g P / ${p.daily_carbs_target_g ?? '?'}g C / ${p.daily_fat_target_g ?? '?'}g F / ${p.daily_water_ml_target} ml acqua

# Stato giornata (live)

  - ${dailyBlock}

# Preferenze

- Ama: ${lovesShort}
- Non ama: ${hatesShort}
- Allergie: ${allergies}

# Cibi più frequenti (per fascia)

  - ${freqBlock}

# Ultimi 7 giorni

${last7}

# Tool a tua disposizione

- log_weight (registra pesata + ricalcola se necessario)
- record_meal (registra pasto con grammature; il server calcola kcal/macro)
- log_water (registra ml)
- log_workout (registra allenamento)
- suggest_next_meal (genera target macros + candidati per prossimo pasto)
- query_food (lookup nutrizionale alimento)
- query_daily_status (snapshot live giornata)

# Regole di comportamento

1. Se l'utente registra peso → chiama log_weight, conferma con delta vs ieri (se disponibile dalla cronologia 7gg) e una micro-azione concreta.
2. Se registra pasto via testo libero → estrai items con grammatura, chiama record_meal, conferma con totale kcal/macro e quanto resta oggi.
3. Se chiede suggerimento pasto → chiama suggest_next_meal, presenta MAX 3 opzioni con grammature precise, formattate brevi tipo "Opzione 1: 80g pasta integrale + 150g pollo + 200g verdure = 520 kcal".
4. Se l'utente non sa cosa mangiare e siamo vicini a un orario pasto, proponi proattivamente.
5. Sgarro (pizza, gelato, etc): registra con stima ragionevole (es. pizza margherita ~800 kcal), niente giudizio, suggerisci come riequilibrare il resto.
6. Mai inventare cibi non presenti nel food_catalog senza usare query_food prima per verificare.
7. Quando chiami un tool, NON commentare il fatto che lo stai chiamando — agisci e basta. L'utente vedrà il risultato finale.
8. Risposte massimo 3-4 frasi salvo necessità.
`
}

function toneAdjective(tone: Profile['coach_tone'] | null | undefined): string {
  switch (tone) {
    case 'gentle':
      return 'gentile, incoraggiante, mai duro'
    case 'playful':
      return 'amichevole, con qualche battuta'
    case 'tough':
      return 'diretto, esigente, senza fronzoli'
    case 'direct':
    default:
      return 'diretto e chiaro, asciutto'
  }
}
