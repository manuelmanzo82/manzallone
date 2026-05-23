import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/components/LogoutButton'
import { ProfileForm } from './ProfileForm'
import type { Profile, Household } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (!profileRaw) redirect('/onboarding')
  const profile = profileRaw as Profile

  let household: Household | null = null
  if (profile.household_id) {
    const { data: h } = await supabase
      .from('households')
      .select('id, name, invite_code, created_by, created_at')
      .eq('id', profile.household_id)
      .single()
    household = (h as Household) ?? null
  }

  return (
    <main
      className="min-h-[100dvh] bg-warm-50 dark:bg-warm-950"
      style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
    >
      <header className="sticky top-0 z-10 border-b border-warm-200 bg-white/85 backdrop-blur dark:border-warm-800 dark:bg-warm-900/85">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
          <h1 className="text-base font-semibold text-warm-900 dark:text-warm-50">
            Profilo
          </h1>
          <LogoutButton />
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <section className="mb-6 rounded-2xl border border-warm-200 bg-white p-5 dark:border-warm-700 dark:bg-warm-800">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-warm-500">
            Stato
          </h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-warm-500">Peso attuale</dt>
            <dd className="text-warm-900 dark:text-warm-50">
              {profile.current_weight ? `${profile.current_weight} kg` : '—'}
            </dd>
            <dt className="text-warm-500">Calorie target</dt>
            <dd className="text-warm-900 dark:text-warm-50">
              {profile.daily_calorie_target ? `${profile.daily_calorie_target} kcal/giorno` : '—'}
            </dd>
            <dt className="text-warm-500">Proteine target</dt>
            <dd className="text-warm-900 dark:text-warm-50">
              {profile.daily_protein_target_g ? `${profile.daily_protein_target_g} g/giorno` : '—'}
            </dd>
            <dt className="text-warm-500">Acqua target</dt>
            <dd className="text-warm-900 dark:text-warm-50">
              {(profile.daily_water_ml_target / 1000).toFixed(1)} l/giorno
            </dd>
          </dl>
        </section>

        <ProfileForm profile={profile} />

        {household && (
          <section className="mt-6 rounded-2xl border border-warm-200 bg-white p-5 dark:border-warm-700 dark:bg-warm-800">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-warm-500">
              Casa
            </h2>
            <div className="text-sm text-warm-700 dark:text-warm-300">
              <div className="font-medium text-warm-900 dark:text-warm-50">{household.name}</div>
              {household.invite_code && (
                <div className="mt-2">
                  Codice invito:{' '}
                  <code className="rounded bg-warm-100 px-2 py-0.5 font-mono text-primary-700 dark:bg-warm-900 dark:text-primary-300">
                    {household.invite_code}
                  </code>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
