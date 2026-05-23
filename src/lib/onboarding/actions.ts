'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type {
  OnboardingData,
  SectionKey,
  AnagraficaData,
  ObiettiviData,
  PreferenzeData,
  NotificheData,
  PersonalitaCoachData,
  PartnerData,
} from './types'
import type { FoodCategory } from '@/lib/types'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return { supabase, userId: user.id }
}

// Persist onboarding snapshot + advance step pointer.
// Also mirrors section data into typed profile columns where applicable.
export async function saveSectionProgress(
  nextStep: SectionKey,
  data: OnboardingData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, userId } = await requireUser()

  const profileUpdate: Record<string, unknown> = {
    onboarding_step: nextStep,
    onboarding_data: data,
  }

  // Mirror anagrafica
  const a: AnagraficaData = data.anagrafica
  if (a.name) profileUpdate.name = a.name
  if (a.age !== null) profileUpdate.age = a.age
  if (a.sex !== null) profileUpdate.sex = a.sex
  if (a.height_cm !== null) profileUpdate.height_cm = a.height_cm
  if (a.current_weight !== null) profileUpdate.current_weight = a.current_weight

  // Mirror obiettivi
  const o: ObiettiviData = data.obiettivi
  if (o.goal !== null) profileUpdate.goal = o.goal
  if (o.target_weight !== null) profileUpdate.target_weight = o.target_weight
  if (o.target_date !== null) profileUpdate.target_date = o.target_date
  if (o.activity_level !== null) profileUpdate.activity_level = o.activity_level

  // Mirror personalità coach
  const c: PersonalitaCoachData = data.personalita_coach
  if (c.coach_tone !== null) {
    // Profile schema accepts 'direct' | 'gentle' | 'playful' | 'tough' — map ours.
    const toneMap: Record<string, string> = {
      direct: 'direct',
      motivating: 'gentle',
      technical: 'direct',
      friendly: 'playful',
      mixed: 'gentle',
    }
    profileUpdate.coach_tone = toneMap[c.coach_tone] ?? 'direct'
  }
  profileUpdate.coach_strictness = c.strict_mode ? 'strict' : 'flexible'

  // Mirror notifiche
  const n: NotificheData = data.notifiche
  profileUpdate.notification_prefs = {
    reminders: n.reminders,
    pause_days: n.pause_days,
  }

  // Mirror partner privacy
  const p: PartnerData = data.partner
  profileUpdate.privacy_prefs = p.privacy_prefs

  // Mirror preferenze: keep food_loves / food_hates / allergies arrays in sync.
  const pref: PreferenzeData = data.preferenze
  const lovedIds = Object.entries(pref.preferences)
    .filter(([, v]) => v === 'love')
    .map(([id]) => id)
  const hatedIds = Object.entries(pref.preferences)
    .filter(([, v]) => v === 'hate')
    .map(([id]) => id)

  if (lovedIds.length || hatedIds.length) {
    const allIds = [...new Set([...lovedIds, ...hatedIds])]
    const { data: foods } = await supabase
      .from('food_catalog')
      .select('id, name')
      .in('id', allIds)
    const idToName = new Map((foods ?? []).map((f) => [f.id, f.name]))
    profileUpdate.food_loves = lovedIds.map((id) => idToName.get(id)).filter(Boolean)
    profileUpdate.food_hates = hatedIds.map((id) => idToName.get(id)).filter(Boolean)
  }
  if (pref.allergies.length) {
    profileUpdate.allergies = pref.allergies
  }

  const { error } = await supabase.from('profiles').update(profileUpdate).eq('id', userId)
  if (error) return { ok: false, error: error.message }

  // Sync profile_food_preferences (delete-then-insert for the touched rows).
  const allMarked = Object.entries(pref.preferences)
  if (allMarked.length > 0) {
    const foodIds = allMarked.map(([id]) => id)
    await supabase
      .from('profile_food_preferences')
      .delete()
      .eq('user_id', userId)
      .in('food_id', foodIds)

    const rows = allMarked.map(([food_id, preference]) => ({
      user_id: userId,
      food_id,
      preference,
      source: 'onboarding',
      confidence: 1.0,
    }))
    await supabase.from('profile_food_preferences').insert(rows)
  }

  revalidatePath('/onboarding')
  return { ok: true }
}

export async function addCustomFood(
  category: FoodCategory,
  name: string
): Promise<{ ok: true; id: string; name: string } | { ok: false; error: string }> {
  const { supabase, userId } = await requireUser()
  const trimmed = name.trim().toLowerCase()
  if (!trimmed) return { ok: false, error: 'Nome vuoto' }

  // Try insert, on conflict ignore — then fetch the id.
  const { error: insertError } = await supabase.from('food_catalog').insert({
    name: trimmed,
    display_name: name.trim(),
    category,
    is_system: false,
    added_by_user_id: userId,
    validation_count: 1,
  })

  if (insertError && !insertError.message.includes('duplicate')) {
    return { ok: false, error: insertError.message }
  }

  const { data: row } = await supabase
    .from('food_catalog')
    .select('id, name')
    .eq('name', trimmed)
    .single()

  if (!row) return { ok: false, error: 'Inserimento fallito' }
  return { ok: true, id: row.id, name: row.name }
}

export async function createHousehold(name: string): Promise<
  | { ok: true; household_id: string; invite_code: string; name: string }
  | { ok: false; error: string }
> {
  const { supabase } = await requireUser()
  const { data, error } = await supabase.rpc('create_household_with_invite', {
    p_name: name,
  })
  if (error || !data) return { ok: false, error: error?.message ?? 'Errore creazione famiglia' }

  return {
    ok: true,
    household_id: data.id as string,
    invite_code: data.invite_code as string,
    name: data.name as string,
  }
}

export async function completeOnboarding(
  data: OnboardingData
): Promise<{ ok: true; targets: { kcal: number; protein: number; carbs: number; fat: number; water_ml: number } } | { ok: false; error: string }> {
  const { supabase, userId } = await requireUser()

  // Final persist + flip flag.
  const saveResult = await saveSectionProgress('riepilogo', data)
  if (!saveResult.ok) return { ok: false, error: saveResult.error }

  const { error: flagError } = await supabase
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', userId)
  if (flagError) return { ok: false, error: flagError.message }

  // Compute targets via the RPC (Mifflin-St Jeor + activity + goal).
  const { error: recalcError } = await supabase.rpc('recalculate_targets', {
    p_user_id: userId,
    p_reason: 'onboarding',
  })
  if (recalcError) return { ok: false, error: recalcError.message }

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'daily_calorie_target, daily_protein_target_g, daily_carbs_target_g, daily_fat_target_g, daily_water_ml_target'
    )
    .eq('id', userId)
    .single()

  return {
    ok: true,
    targets: {
      kcal: profile?.daily_calorie_target ?? 0,
      protein: Number(profile?.daily_protein_target_g ?? 0),
      carbs: Number(profile?.daily_carbs_target_g ?? 0),
      fat: Number(profile?.daily_fat_target_g ?? 0),
      water_ml: profile?.daily_water_ml_target ?? 0,
    },
  }
}

// Used for the "Salva ed esci" button: persist current data, then go home (which will
// proxy back to /auth/login because they're still in onboarding... actually no, the
// proxy redirects them back to /onboarding because onboarding_completed is still false.
// So "salva ed esci" effectively means "save and close the tab"; we just persist + show
// a confirmation page.)
export async function saveAndExit(
  currentStep: SectionKey,
  data: OnboardingData
): Promise<{ ok: true } | { ok: false; error: string }> {
  return saveSectionProgress(currentStep, data)
}
