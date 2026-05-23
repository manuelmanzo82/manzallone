import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingProvider } from '@/components/onboarding/OnboardingContext'
import { OnboardingRouter } from '@/components/onboarding/OnboardingRouter'
import {
  DEFAULT_ONBOARDING_DATA,
  SECTION_KEYS,
  type OnboardingData,
  type SectionKey,
} from '@/lib/onboarding/types'
import type { FoodItem } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Onboarding - ManzAllone v2' }

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed, onboarding_step, onboarding_data, household_id')
    .eq('id', user.id)
    .single()

  if (profile?.onboarding_completed) redirect('/')

  const { data: foods } = await supabase
    .from('food_catalog')
    .select(
      'id, name, display_name, category, subcategory, avg_kcal_100g, avg_protein_100g, avg_carbs_100g, avg_fat_100g, avg_fiber_100g, glycemic_index, default_portion_g, default_portion_unit, aliases, is_system, validation_count, created_at'
    )
    .order('validation_count', { ascending: false })
    .order('name', { ascending: true })
    .limit(500)

  const stepKey = (profile?.onboarding_step ?? 'welcome') as SectionKey
  const initialStep: SectionKey = SECTION_KEYS.includes(stepKey) ? stepKey : 'welcome'

  // If household_id is already set, hydrate partner.household_id so the partner step
  // shows the existing invite code rather than re-creating one.
  const initial = (profile?.onboarding_data as Partial<OnboardingData>) ?? {}
  if (profile?.household_id && !initial.partner?.household_id) {
    const { data: hh } = await supabase
      .from('households')
      .select('id, name, invite_code')
      .eq('id', profile.household_id)
      .single()
    if (hh) {
      initial.partner = {
        ...(initial.partner ?? DEFAULT_ONBOARDING_DATA.partner),
        household_id: hh.id,
        household_name: hh.name,
        invite_code: hh.invite_code,
      }
    }
  }

  return (
    <OnboardingProvider
      initialData={initial as OnboardingData}
      initialStep={initialStep}
      initialFoods={(foods as FoodItem[]) ?? []}
    >
      <OnboardingRouter />
    </OnboardingProvider>
  )
}
