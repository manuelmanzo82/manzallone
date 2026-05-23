'use client'

import { useOnboarding } from '../OnboardingContext'
import { OnboardingShell } from '../OnboardingShell'
import { Card } from '@/components/ui/Card'
import { Toggle } from '@/components/ui/Toggle'
import { TimePicker } from '@/components/ui/TimePicker'
import { cn } from '@/lib/cn'
import type { ReminderKey } from '@/lib/onboarding/types'

const REMINDER_LABELS: Record<ReminderKey, string> = {
  peso_mattutino: 'Pesata mattutina',
  colazione: 'Colazione',
  spuntino_mat: 'Spuntino mattutino',
  pranzo: 'Pranzo',
  spuntino_pom: 'Spuntino pomeridiano',
  cena: 'Cena',
  riepilogo_serale: 'Riepilogo serale',
}

const REMINDER_ORDER: ReminderKey[] = [
  'peso_mattutino',
  'colazione',
  'spuntino_mat',
  'pranzo',
  'spuntino_pom',
  'cena',
  'riepilogo_serale',
]

const DAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Gio' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sab' },
  { value: 0, label: 'Dom' },
]

export function SectionNotifiche() {
  const { data, setData } = useOnboarding()
  const n = data.notifiche

  const togglePauseDay = (day: number) => {
    const set = new Set(n.pause_days)
    if (set.has(day)) set.delete(day)
    else set.add(day)
    setData('notifiche', { pause_days: [...set] })
  }

  return (
    <OnboardingShell>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
          Promemoria intelligenti
        </h2>
        <p className="mt-1 text-sm text-warm-600 dark:text-warm-400">
          Attiva solo quelli che ti servono davvero. Cambia tutto in qualsiasi momento.
        </p>
      </div>

      <Card className="divide-y divide-warm-200 dark:divide-warm-700">
        {REMINDER_ORDER.map((key) => {
          const r = n.reminders[key]
          return (
            <div key={key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex-1">
                <Toggle
                  checked={r.enabled}
                  onChange={(v) =>
                    setData('notifiche', {
                      reminders: { ...n.reminders, [key]: { ...r, enabled: v } },
                    })
                  }
                  label={REMINDER_LABELS[key]}
                />
              </div>
              <div className="w-32">
                <TimePicker
                  value={r.time}
                  onChange={(v) =>
                    setData('notifiche', {
                      reminders: { ...n.reminders, [key]: { ...r, time: v } },
                    })
                  }
                  disabled={!r.enabled}
                />
              </div>
            </div>
          )
        })}
      </Card>

      <Card className="mt-4">
        <h3 className="mb-1 text-base font-semibold text-warm-900 dark:text-warm-50">
          Giorni di pausa
        </h3>
        <p className="mb-3 text-sm text-warm-600 dark:text-warm-400">
          Nessun promemoria nei giorni selezionati.
        </p>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => {
            const selected = n.pause_days.includes(d.value)
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => togglePauseDay(d.value)}
                className={cn(
                  'h-10 w-12 rounded-xl text-sm font-medium transition-colors',
                  selected
                    ? 'bg-accent-500 text-white'
                    : 'border border-warm-300 text-warm-700 hover:border-accent-500 dark:border-warm-700 dark:text-warm-300'
                )}
              >
                {d.label}
              </button>
            )
          })}
        </div>
      </Card>
    </OnboardingShell>
  )
}
