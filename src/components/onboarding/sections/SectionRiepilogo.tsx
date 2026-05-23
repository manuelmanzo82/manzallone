'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Sparkles, Flame, Drumstick, Wheat, Salad, Droplets } from 'lucide-react'
import { useOnboarding } from '../OnboardingContext'
import { OnboardingShell } from '../OnboardingShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export function SectionRiepilogo() {
  const { data, foodCatalog, finalize } = useOnboarding()
  const [pending, startTransition] = useTransition()
  const [targets, setTargets] = useState<
    null | { kcal: number; protein: number; carbs: number; fat: number; water_ml: number }
  >(null)
  const [error, setError] = useState<string | null>(null)

  const a = data.anagrafica
  const o = data.obiettivi

  const goalLabel: Record<string, string> = {
    lose: 'Perdere peso',
    maintain: 'Mantenere',
    gain: 'Aumentare massa',
    health: 'Migliorare salute',
    performance: 'Migliorare performance',
  }
  const activityLabel: Record<string, string> = {
    sedentary: 'Sedentario',
    light: 'Leggera',
    moderate: 'Moderata',
    active: 'Alta',
    very_active: 'Atleta',
  }

  const lovedIds = Object.entries(data.preferenze.preferences)
    .filter(([, v]) => v === 'love')
    .map(([id]) => id)
  const lovedNames = lovedIds
    .map((id) => foodCatalog.find((f) => f.id === id)?.display_name ?? foodCatalog.find((f) => f.id === id)?.name)
    .filter(Boolean)
    .slice(0, 5) as string[]

  const enabledReminders = Object.entries(data.notifiche.reminders)
    .filter(([, r]) => r.enabled)
    .map(([k, r]) => ({ key: k, time: r.time }))

  const primaryActivity = data.idratazione_attivita.activities[0]?.name ?? '—'

  const handleFinalize = () => {
    setError(null)
    startTransition(async () => {
      const result = await finalize()
      if (!result) return
      if (result.ok) setTargets(result.targets)
      else setError(result.error)
    })
  }

  return (
    <OnboardingShell hideNext>
      <div className="mb-6 flex items-center gap-3">
        <Sparkles className="h-7 w-7 text-primary-600" />
        <div>
          <h2 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
            Perfetto, conosciamoci meglio.
          </h2>
          <p className="text-sm text-warm-600 dark:text-warm-400">
            Ecco quello che ho capito di te:
          </p>
        </div>
      </div>

      <Card className="space-y-3">
        <Row label="Nome" value={a.name || '—'} />
        <Row label="Età" value={a.age ? `${a.age} anni` : '—'} />
        <Row
          label="Statura / peso"
          value={a.height_cm && a.current_weight ? `${a.height_cm} cm · ${a.current_weight} kg` : '—'}
        />
        <Row label="Obiettivo" value={o.goal ? goalLabel[o.goal] : '—'} />
        {(o.goal === 'lose' || o.goal === 'gain') && (
          <Row
            label="Peso target"
            value={
              o.target_weight && o.target_date
                ? `${o.target_weight} kg entro ${new Date(o.target_date).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`
                : '—'
            }
          />
        )}
        <Row
          label="Attività"
          value={o.activity_level ? activityLabel[o.activity_level] : '—'}
        />
        <Row label="Attività principale" value={primaryActivity} />
        <Row
          label="Top 5 alimenti amati"
          value={lovedNames.length ? lovedNames.join(' · ') : 'Nessuno selezionato'}
        />
        <Row
          label="Promemoria attivi"
          value={
            enabledReminders.length
              ? enabledReminders.map((r) => r.time).join(' · ')
              : 'Nessuno'
          }
        />
      </Card>

      {!targets ? (
        <Card className="mt-4 border-2 border-primary-300 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/30">
          <h3 className="text-base font-semibold text-primary-900 dark:text-primary-100">
            Calcolo dei tuoi target
          </h3>
          <p className="mt-1 text-sm text-primary-800 dark:text-primary-200">
            Quando confermi, Claude calcolerà calorie e macro precisi con la formula
            Mifflin-St Jeor + il tuo livello di attività + il tuo obiettivo.
          </p>
          {error && (
            <div className="mt-3 rounded-xl bg-danger-500/10 px-4 py-3 text-sm text-danger-700">
              {error}
            </div>
          )}
          <Button
            size="lg"
            fullWidth
            onClick={handleFinalize}
            loading={pending}
            className="mt-4"
          >
            <CheckCircle2 className="h-5 w-5" />
            Completa onboarding e inizia
          </Button>
        </Card>
      ) : (
        <Card className="mt-4 border-2 border-success-500 bg-success-50 dark:border-success-700 dark:bg-success-900/30">
          <div className="mb-4 flex items-center gap-3">
            <CheckCircle2 className="h-7 w-7 text-success-600" />
            <h3 className="text-base font-semibold text-success-900 dark:text-success-100">
              I tuoi target giornalieri
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <TargetTile icon={<Flame className="h-4 w-4" />} label="Calorie" value={`${targets.kcal} kcal`} />
            <TargetTile icon={<Drumstick className="h-4 w-4" />} label="Proteine" value={`${targets.protein} g`} />
            <TargetTile icon={<Wheat className="h-4 w-4" />} label="Carboidrati" value={`${targets.carbs} g`} />
            <TargetTile icon={<Salad className="h-4 w-4" />} label="Grassi" value={`${targets.fat} g`} />
            <TargetTile icon={<Droplets className="h-4 w-4" />} label="Acqua" value={`${(targets.water_ml / 1000).toFixed(1)} L`} />
          </div>
          <p className="mt-4 text-center text-sm text-success-800 dark:text-success-200">
            Stiamo aprendo la tua home…
          </p>
        </Card>
      )}
    </OnboardingShell>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-warm-100 pb-2 last:border-b-0 last:pb-0 dark:border-warm-700/50">
      <span className="text-sm text-warm-600 dark:text-warm-400">{label}</span>
      <span className="text-right text-sm font-medium text-warm-900 dark:text-warm-50">
        {value}
      </span>
    </div>
  )
}

function TargetTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-white p-3 text-center shadow-sm dark:bg-warm-800">
      <div className="mb-1 flex justify-center text-success-600">{icon}</div>
      <div className="text-xs uppercase tracking-wide text-warm-500">{label}</div>
      <div className="mt-1 text-sm font-bold text-warm-900 dark:text-warm-50">{value}</div>
    </div>
  )
}
