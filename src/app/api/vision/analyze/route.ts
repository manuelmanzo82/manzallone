import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAnthropicClient } from '@/lib/claude/client'
import {
  parseVisionResponse,
  VISION_MODEL,
  VISION_SYSTEM_PROMPT,
  type VisionExtraction,
} from '@/lib/claude/vision'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SIGNED_URL_TTL_SECONDS = 300

interface Body {
  /** Storage path inside the 'screenshots' bucket, e.g. "<user_id>/<ts>_<name>" */
  path: string
}

interface Result {
  extraction: VisionExtraction
  /** Friendly assistant message to show in chat after analysis. */
  assistantMessage: string
  /** What we did with the extracted data: an inserted row id, a proposal, or nothing. */
  action:
    | { kind: 'workout_inserted';  workout_id: string }
    | { kind: 'weight_inserted';   weight_id: string; recalculated: boolean }
    | { kind: 'food_proposed';     food_id: string; product_name: string }
    | { kind: 'meal_suggested' }
    | { kind: 'noop' }
  screenshotPath: string
}

export async function POST(request: Request) {
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }
  const path = String(body.path ?? '').trim()
  if (!path) {
    return Response.json({ error: 'missing_path' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Enforce user-folder pattern even though Storage RLS already does.
  const expectedPrefix = `${user.id}/`
  if (!path.startsWith(expectedPrefix)) {
    return Response.json({ error: 'forbidden_path' }, { status: 403 })
  }

  // Sign URL via admin (always works even if user signed in via cookies).
  const admin = createAdminClient()
  const { data: signed, error: signErr } = await admin.storage
    .from('screenshots')
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (signErr || !signed?.signedUrl) {
    return Response.json(
      { error: 'signed_url_failed', detail: signErr?.message },
      { status: 500 }
    )
  }

  // Ask Claude Vision.
  let extraction: VisionExtraction | null = null
  let rawText = ''
  try {
    const claude = getAnthropicClient()
    const resp = await claude.messages.create({
      model: VISION_MODEL,
      max_tokens: 800,
      system: VISION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: signed.signedUrl },
            },
            {
              type: 'text',
              text: 'Analizza questo screenshot e restituisci il JSON come da schema.',
            },
          ],
        },
      ],
    })
    const firstText = resp.content.find((b) => b.type === 'text')
    rawText = firstText && firstText.type === 'text' ? firstText.text : ''
    extraction = parseVisionResponse(rawText)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'vision_call_failed'
    return Response.json({ error: 'vision_call_failed', detail: msg }, { status: 502 })
  }

  if (!extraction) {
    return Response.json(
      {
        error: 'parse_failed',
        detail: 'Claude non ha restituito JSON valido.',
        raw: rawText.slice(0, 500),
      },
      { status: 422 }
    )
  }

  // Route based on screenshot_type. Always use admin client for inserts so we
  // can include screenshot_url even though weights normally goes through RPC.
  let action: Result['action'] = { kind: 'noop' }
  let assistantMessage = ''

  if (extraction.screenshot_type.startsWith('workout_')) {
    const w = extraction.data as Extract<VisionExtraction, { screenshot_type: `workout_${string}` }>['data']
    const insert = {
      user_id: user.id,
      type: w.type ?? extractWorkoutSource(extraction.screenshot_type),
      duration_min: w.duration_min,
      distance_km: w.distance_km,
      calories_burned: w.calories_burned,
      pace: w.pace,
      hr_avg: w.hr_avg,
      hr_max: w.hr_max,
      screenshot_url: path,
      source: extraction.screenshot_type,
    }
    const { data, error } = await admin
      .from('workouts')
      .insert(insert)
      .select('id')
      .single()
    if (error) {
      return Response.json(
        { error: 'workout_insert_failed', detail: error.message },
        { status: 500 }
      )
    }
    action = { kind: 'workout_inserted', workout_id: data.id }
    assistantMessage = workoutSummary(w)
  } else if (extraction.screenshot_type === 'scale_smart') {
    const s = extraction.data
    if (s.weight_kg == null) {
      assistantMessage =
        'Ho visto la bilancia ma non sono riuscito a leggere il peso. Riprova con una foto più nitida.'
    } else {
      const insertRes = await admin
        .from('weights')
        .insert({
          user_id: user.id,
          weight_kg: s.weight_kg,
          body_fat: s.body_fat_pct,
          muscle_mass: s.muscle_mass_kg,
          screenshot_url: path,
          source: 'scale_smart',
        })
        .select('id')
        .single()
      if (insertRes.error) {
        return Response.json(
          { error: 'weight_insert_failed', detail: insertRes.error.message },
          { status: 500 }
        )
      }
      // Sync current_weight + recalculate targets via the existing RPC pattern.
      await admin
        .from('profiles')
        .update({ current_weight: s.weight_kg, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      const { data: recalc } = await admin.rpc('recalculate_targets', {
        p_user_id: user.id,
        p_reason: 'scale_smart_screenshot',
      })
      action = {
        kind: 'weight_inserted',
        weight_id: insertRes.data.id,
        recalculated: recalc !== null,
      }
      assistantMessage = scaleSummary(s)
    }
  } else if (extraction.screenshot_type === 'meal_label') {
    const m = extraction.data
    if (!m.product_name || m.kcal_per_100g == null) {
      assistantMessage =
        'Ho visto un\'etichetta ma non sono riuscito a leggere abbastanza dati. Riprova con una foto più nitida o registra manualmente.'
    } else {
      // Upsert into food_catalog (skip if name collides).
      const upsert = await admin
        .from('food_catalog')
        .upsert(
          {
            name: m.product_name.toLowerCase(),
            display_name: m.product_name,
            category: 'snack_dolci',
            avg_kcal_100g: m.kcal_per_100g,
            avg_protein_100g: m.protein,
            avg_carbs_100g: m.carbs,
            avg_fat_100g: m.fat,
            avg_fiber_100g: m.fiber,
            default_portion_g: m.portion_size_g,
            added_by_user_id: user.id,
            is_system: false,
          },
          { onConflict: 'name', ignoreDuplicates: false }
        )
        .select('id, name, display_name')
        .single()
      if (upsert.error) {
        return Response.json(
          { error: 'food_upsert_failed', detail: upsert.error.message },
          { status: 500 }
        )
      }
      action = {
        kind: 'food_proposed',
        food_id: upsert.data.id,
        product_name: upsert.data.display_name ?? upsert.data.name,
      }
      assistantMessage = mealLabelSummary(m)
    }
  } else if (extraction.screenshot_type === 'meal_photo') {
    const m = extraction.data
    action = { kind: 'meal_suggested' }
    assistantMessage = mealPhotoSummary(m)
  } else if (extraction.screenshot_type === 'other') {
    const o = extraction.data
    assistantMessage =
      `Ho analizzato lo screenshot ma non corrisponde a un tipo che so registrare automaticamente.\n\n` +
      `${o.description ?? ''}` +
      (o.useful_data ? `\n\n${o.useful_data}` : '')
  } else {
    assistantMessage = `Non sono riuscito a classificare lo screenshot (tipo: ${String(extraction.screenshot_type)}).`
  }

  const result: Result = {
    extraction,
    assistantMessage,
    action,
    screenshotPath: path,
  }
  return Response.json(result)
}

// ---- helpers ----

function extractWorkoutSource(t: string): string {
  // turn 'workout_nike_running' -> 'Nike Running' fallback type label
  const tail = t.replace(/^workout_/, '').replace(/_/g, ' ')
  if (!tail || tail === 'other') return 'Allenamento'
  return tail.replace(/\b\w/g, (c) => c.toUpperCase())
}

function workoutSummary(w: {
  type: string | null
  distance_km: number | null
  duration_min: number | null
  calories_burned: number | null
  pace: string | null
  hr_avg: number | null
}): string {
  const parts: string[] = []
  parts.push(`✓ ${w.type ?? 'Allenamento'} salvato`)
  const stats: string[] = []
  if (w.duration_min) stats.push(`${w.duration_min} min`)
  if (w.distance_km) stats.push(`${w.distance_km} km`)
  if (w.pace) stats.push(w.pace)
  if (w.calories_burned) stats.push(`${w.calories_burned} kcal`)
  if (w.hr_avg) stats.push(`FC ${w.hr_avg}`)
  if (stats.length) parts.push(stats.join(' · '))
  return parts.join('\n')
}

function scaleSummary(s: {
  weight_kg: number | null
  body_fat_pct: number | null
  muscle_mass_kg: number | null
}): string {
  const parts: string[] = []
  parts.push(`✓ Peso ${s.weight_kg} kg registrato dalla bilancia`)
  const extras: string[] = []
  if (s.body_fat_pct != null) extras.push(`grasso ${s.body_fat_pct}%`)
  if (s.muscle_mass_kg != null) extras.push(`muscoli ${s.muscle_mass_kg} kg`)
  if (extras.length) parts.push(extras.join(' · '))
  parts.push('Target calorici ricalcolati.')
  return parts.join('\n')
}

function mealLabelSummary(m: {
  product_name: string | null
  kcal_per_100g: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  portion_size_g: number | null
}): string {
  return (
    `✓ Prodotto aggiunto al catalogo: ${m.product_name}\n` +
    `${m.kcal_per_100g} kcal/100g · P${m.protein ?? '–'} C${m.carbs ?? '–'} F${m.fat ?? '–'}` +
    (m.portion_size_g ? ` · porzione ${m.portion_size_g}g` : '') +
    `\n\nVuoi registrare un pasto con questo prodotto? Dimmi quanti grammi e per quale pasto.`
  )
}

function mealPhotoSummary(m: {
  dish_description: string | null
  estimated_items: { name: string; estimated_quantity_g: number; kcal: number }[]
  total_kcal_estimate: number | null
}): string {
  const lines: string[] = []
  lines.push(`Vedo: ${m.dish_description ?? 'un piatto'}.`)
  if (m.estimated_items?.length) {
    lines.push('Stima:')
    for (const it of m.estimated_items) {
      lines.push(`  • ${it.name} ~${it.estimated_quantity_g}g (${it.kcal} kcal)`)
    }
  }
  if (m.total_kcal_estimate != null) {
    lines.push(`Totale stimato: ~${m.total_kcal_estimate} kcal`)
  }
  lines.push('Confermi che registro questo pasto? Scrivi "sì registra" o specifica modifiche.')
  return lines.join('\n')
}
