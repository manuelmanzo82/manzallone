'use client'

import { useEffect } from 'react'
import { useOnboarding } from '../OnboardingContext'
import { OnboardingShell } from '../OnboardingShell'
import { Card } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Textarea'
import { TimePicker } from '@/components/ui/TimePicker'
import { RadioGroup, type RadioOption } from '@/components/ui/RadioGroup'
import { Toggle } from '@/components/ui/Toggle'
import type { AbitudiniData, MealKey } from '@/lib/onboarding/types'

const MEALS_PER_DAY_OPTIONS: RadioOption<NonNullable<AbitudiniData['meals_per_day']>>[] = [
  { value: '3', label: '3 pasti', description: 'Colazione, pranzo, cena' },
  { value: '4', label: '4 pasti', description: 'Aggiungi uno spuntino' },
  { value: '5', label: '5 pasti', description: 'Tre principali + due spuntini' },
  { value: 'variable', label: 'Variabile', description: 'Dipende dai giorni' },
]

const EAT_WHERE_OPTIONS: RadioOption<NonNullable<AbitudiniData['eat_where']>>[] = [
  { value: 'home', label: 'Quasi sempre a casa', description: 'Cucino io o in famiglia' },
  { value: 'office', label: 'Pranzo in ufficio / mensa', description: 'Pranzo fuori, cena a casa' },
  { value: 'restaurant', label: 'Spesso al ristorante', description: 'Fuori almeno 4-5 volte/settimana' },
  { value: 'mix', label: 'Mix di tutto', description: 'Casa + fuori in proporzione' },
]

const MEAL_LABELS: Record<MealKey, string> = {
  breakfast: 'Colazione',
  morning_snack: 'Spuntino mattutino',
  lunch: 'Pranzo',
  afternoon_snack: 'Spuntino pomeridiano',
  dinner: 'Cena',
  evening_snack: 'Spuntino serale',
}

const MEAL_ORDER: MealKey[] = [
  'breakfast',
  'morning_snack',
  'lunch',
  'afternoon_snack',
  'dinner',
  'evening_snack',
]

// Pre-enable a sensible default set of meals based on the "meals_per_day" choice.
function presetForCount(count: AbitudiniData['meals_per_day']): MealKey[] {
  switch (count) {
    case '3':
      return ['breakfast', 'lunch', 'dinner']
    case '4':
      return ['breakfast', 'lunch', 'afternoon_snack', 'dinner']
    case '5':
      return ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner']
    case 'variable':
      return ['breakfast', 'lunch', 'dinner']
    default:
      return ['breakfast', 'lunch', 'dinner']
  }
}

export function SectionAbitudiniAlimentari() {
  const { data, setData, replaceSection } = useOnboarding()
  const ab = data.abitudini

  // When the meal count changes, auto-enable the matching set so the user only has to tweak.
  useEffect(() => {
    if (!ab.meals_per_day) return
    const enabled = new Set(presetForCount(ab.meals_per_day))
    const next = { ...ab.meal_schedules }
    let changed = false
    for (const key of MEAL_ORDER) {
      const shouldEnable = enabled.has(key)
      if (next[key].enabled !== shouldEnable) {
        next[key] = { ...next[key], enabled: shouldEnable }
        changed = true
      }
    }
    if (changed) replaceSection('abitudini', { ...ab, meal_schedules: next })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ab.meals_per_day])

  const canProceed = Boolean(
    ab.meals_per_day &&
      ab.eat_where &&
      MEAL_ORDER.some((k) => ab.meal_schedules[k].enabled)
  )

  return (
    <OnboardingShell canProceed={canProceed}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
          Come mangi di solito?
        </h2>
        <p className="mt-1 text-sm text-warm-600 dark:text-warm-400">
          Mi servono i tuoi ritmi reali per pianificare in modo realistico.
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <RadioGroup
            name="meals_per_day"
            label="Quanti pasti fai al giorno?"
            value={ab.meals_per_day}
            onChange={(v) => setData('abitudini', { meals_per_day: v })}
            options={MEALS_PER_DAY_OPTIONS}
            columns={2}
          />
        </Card>

        {MEAL_ORDER.map((key) => {
          const meal = ab.meal_schedules[key]
          return (
            <Card key={key} className="space-y-4">
              <Toggle
                checked={meal.enabled}
                onChange={(v) =>
                  setData('abitudini', {
                    meal_schedules: { ...ab.meal_schedules, [key]: { ...meal, enabled: v } },
                  })
                }
                label={MEAL_LABELS[key]}
              />
              {meal.enabled && (
                <>
                  <TimePicker
                    label="A che ora di solito?"
                    value={meal.time}
                    onChange={(v) =>
                      setData('abitudini', {
                        meal_schedules: { ...ab.meal_schedules, [key]: { ...meal, time: v } },
                      })
                    }
                  />
                  <Textarea
                    name={`examples_${key}`}
                    label="3-5 versioni più frequenti del pasto"
                    placeholder="Una per riga&#10;es. yogurt greco 150g + granola 30g + frutti di bosco"
                    hint="Aiuta Claude a suggerirti varianti simili a quelle che già ami."
                    value={meal.examples}
                    onChange={(e) =>
                      setData('abitudini', {
                        meal_schedules: {
                          ...ab.meal_schedules,
                          [key]: { ...meal, examples: e.target.value },
                        },
                      })
                    }
                  />
                </>
              )}
            </Card>
          )
        })}

        <Card>
          <RadioGroup
            name="eat_where"
            label="Mangi più spesso a casa o fuori?"
            value={ab.eat_where}
            onChange={(v) => setData('abitudini', { eat_where: v })}
            options={EAT_WHERE_OPTIONS}
          />
        </Card>
      </div>
    </OnboardingShell>
  )
}
