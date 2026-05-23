import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Flame, Droplets, Scale, MessageCircleQuestion, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LogoutButton } from '@/components/LogoutButton'
import type { DailyStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'name, current_weight, target_weight, daily_calorie_target, daily_water_ml_target, onboarding_completed'
    )
    .eq('id', user.id)
    .single()

  if (!profile?.onboarding_completed) redirect('/onboarding')

  const { data: status } = await supabase.rpc('get_daily_status', {
    p_user_id: user.id,
  })
  const dailyStatus = status as DailyStatus | null

  const firstName = profile.name?.split(' ')[0] ?? 'tu'
  const kcalConsumed = dailyStatus?.consumed.kcal ?? 0
  const kcalTarget = dailyStatus?.targets.kcal ?? profile.daily_calorie_target ?? 0
  const waterConsumed = dailyStatus?.consumed.water_ml ?? 0
  const waterTarget = dailyStatus?.targets.water_ml ?? profile.daily_water_ml_target ?? 0

  return (
    <main className="min-h-screen bg-gradient-to-br from-warm-50 via-primary-50/20 to-warm-100 dark:from-warm-900 dark:via-primary-900/10 dark:to-warm-900">
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <header className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-sm text-warm-500">
              {new Date().toLocaleDateString('it-IT', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-warm-900 dark:text-warm-50">
              Ciao {firstName}!
            </h1>
          </div>
          <LogoutButton />
        </header>

        <Card className="mb-6 border-2 border-primary-300 bg-gradient-to-br from-primary-50 to-primary-100 dark:border-primary-700 dark:from-primary-900/40 dark:to-primary-900/20">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-6 w-6 shrink-0 text-primary-600" />
            <div>
              <h2 className="text-base font-semibold text-primary-900 dark:text-primary-100">
                Chat con Claude in arrivo
              </h2>
              <p className="mt-1 text-sm text-primary-800 dark:text-primary-200">
                Disponibile nel prossimo update (Prompt 3). Per ora vedi i tuoi target e tieni
                d'occhio il peso.
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={<Flame className="h-5 w-5 text-accent-600" />}
            label="Calorie oggi"
            value={`${Math.round(kcalConsumed)} / ${kcalTarget}`}
            unit="kcal"
          />
          <StatCard
            icon={<Droplets className="h-5 w-5 text-primary-600" />}
            label="Acqua oggi"
            value={`${(waterConsumed / 1000).toFixed(1)} / ${(waterTarget / 1000).toFixed(1)}`}
            unit="litri"
          />
          <StatCard
            icon={<Scale className="h-5 w-5 text-warm-700" />}
            label="Peso attuale"
            value={profile.current_weight ? `${profile.current_weight}` : '—'}
            unit="kg"
            sub={
              profile.target_weight ? `Target ${profile.target_weight} kg` : undefined
            }
          />
        </div>

        <Card className="mt-6">
          <div className="flex items-start gap-3">
            <Scale className="mt-0.5 h-6 w-6 shrink-0 text-warm-600" />
            <div className="flex-1">
              <h3 className="text-base font-semibold text-warm-900 dark:text-warm-50">
                Inizia con la pesata del giorno
              </h3>
              <p className="mt-1 text-sm text-warm-600 dark:text-warm-400">
                La pesata al mattino, sempre alla stessa ora, è il dato più importante per
                calibrare i tuoi target.
              </p>
              <Button className="mt-3" disabled>
                Registra peso (in arrivo)
              </Button>
            </div>
          </div>
        </Card>

        <Card className="mt-4">
          <div className="flex items-start gap-3">
            <MessageCircleQuestion className="mt-0.5 h-6 w-6 shrink-0 text-warm-600" />
            <div className="flex-1">
              <h3 className="text-base font-semibold text-warm-900 dark:text-warm-50">
                Cosa arriverà presto
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-warm-600 dark:text-warm-400">
                <li>Chat conversazionale con Claude (Prompt 3)</li>
                <li>Logging pasti via testo, voce, foto del piatto</li>
                <li>Suggerimenti pasti adattivi in modalità rigida</li>
                <li>Push notification per i promemoria configurati</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </main>
  )
}

function StatCard({
  icon,
  label,
  value,
  unit,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  unit: string
  sub?: string
}) {
  return (
    <Card className="!p-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs uppercase tracking-wide text-warm-500">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-warm-900 dark:text-warm-50">{value}</span>
        <span className="text-sm text-warm-500">{unit}</span>
      </div>
      {sub && <div className="mt-0.5 text-xs text-warm-500">{sub}</div>}
    </Card>
  )
}
