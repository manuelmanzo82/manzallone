'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { ActivityLevel, CoachTone, Goal } from '@/lib/types'

const ALLOWED_ACTIVITY: ActivityLevel[] = [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
]
const ALLOWED_GOAL: Goal[] = ['lose', 'maintain', 'gain', 'health', 'performance']
const ALLOWED_TONE: CoachTone[] = ['direct', 'gentle', 'playful', 'tough']

interface ProfileUpdateInput {
  name?: string
  target_weight?: number | null
  activity_level?: ActivityLevel
  goal?: Goal
  coach_tone?: CoachTone
  food_loves?: string[]
  food_hates?: string[]
  allergies?: string[]
}

export interface ProfileFormState {
  ok?: boolean
  error?: string
}

function parseList(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== 'string') return []
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 50)
}

export async function updateProfile(
  _state: ProfileFormState | undefined,
  formData: FormData
): Promise<ProfileFormState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const update: ProfileUpdateInput = {}

  const name = formData.get('name')
  if (typeof name === 'string' && name.trim()) update.name = name.trim()

  const tw = formData.get('target_weight')
  if (typeof tw === 'string' && tw.trim()) {
    const n = Number(tw)
    if (Number.isFinite(n) && n >= 30 && n <= 250) update.target_weight = n
  }

  const act = formData.get('activity_level')
  if (typeof act === 'string' && (ALLOWED_ACTIVITY as string[]).includes(act))
    update.activity_level = act as ActivityLevel

  const goal = formData.get('goal')
  if (typeof goal === 'string' && (ALLOWED_GOAL as string[]).includes(goal))
    update.goal = goal as Goal

  const tone = formData.get('coach_tone')
  if (typeof tone === 'string' && (ALLOWED_TONE as string[]).includes(tone))
    update.coach_tone = tone as CoachTone

  update.food_loves = parseList(formData.get('food_loves'))
  update.food_hates = parseList(formData.get('food_hates'))
  update.allergies = parseList(formData.get('allergies'))

  const { error } = await supabase
    .from('profiles')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) return { error: error.message }

  // If goal/activity/target_weight changed, recompute targets
  if (update.activity_level || update.goal || update.target_weight !== undefined) {
    await supabase.rpc('recalculate_targets', { p_user_id: user.id, p_reason: 'profile_edit' })
  }

  revalidatePath('/profile')
  revalidatePath('/chat')
  return { ok: true }
}
