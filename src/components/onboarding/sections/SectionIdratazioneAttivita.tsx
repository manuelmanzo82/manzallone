'use client'

import { Trash2, Plus } from 'lucide-react'
import { useOnboarding } from '../OnboardingContext'
import { OnboardingShell } from '../OnboardingShell'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Checkbox } from '@/components/ui/Checkbox'
import { Slider } from '@/components/ui/Slider'
import { Button } from '@/components/ui/Button'

const ACTIVITY_OPTIONS = [
  'Corsa',
  'Camminata',
  'Palestra',
  'Bici',
  'Nuoto',
  'Yoga',
  'Pilates',
  'Sport di squadra',
  'Altro',
] as const

const APP_OPTIONS = [
  'Nike Running Club',
  'Apple Salute',
  'Strava',
  'Garmin Connect',
  'Polar Flow',
  'Altro',
] as const

export function SectionIdratazioneAttivita() {
  const { data, setData } = useOnboarding()
  const ia = data.idratazione_attivita

  const canProceed = Boolean(ia.water_l > 0)

  const toggleApp = (app: string, on: boolean) => {
    const set = new Set(ia.apps)
    if (on) set.add(app)
    else set.delete(app)
    setData('idratazione_attivita', { apps: [...set] })
  }

  const addActivity = (name: string) => {
    if (ia.activities.some((a) => a.name === name)) return
    setData('idratazione_attivita', {
      activities: [...ia.activities, { name, freq_per_week: 2, duration_min: 45 }],
    })
  }

  const removeActivity = (name: string) => {
    setData('idratazione_attivita', {
      activities: ia.activities.filter((a) => a.name !== name),
    })
  }

  const updateActivity = (name: string, patch: Partial<{ freq_per_week: number; duration_min: number }>) => {
    setData('idratazione_attivita', {
      activities: ia.activities.map((a) => (a.name === name ? { ...a, ...patch } : a)),
    })
  }

  return (
    <OnboardingShell canProceed={canProceed}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
          Idratazione e movimento
        </h2>
        <p className="mt-1 text-sm text-warm-600 dark:text-warm-400">
          Quanto bevi e quanto ti muovi — base per il bilancio energetico.
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <Slider
            label="Quanti litri d'acqua bevi al giorno?"
            value={ia.water_l}
            onChange={(v) => setData('idratazione_attivita', { water_l: v })}
            min={0.5}
            max={4}
            step={0.25}
            unit="L"
            formatValue={(v) => `${v.toFixed(2)} L`}
          />
        </Card>

        <Card className="space-y-3">
          <h3 className="text-sm font-medium text-warm-800 dark:text-warm-200">
            Bevande che assumi regolarmente
          </h3>

          <Checkbox
            label="Caffè"
            checked={ia.beverages.coffee}
            onChange={(v) =>
              setData('idratazione_attivita', {
                beverages: { ...ia.beverages, coffee: v },
              })
            }
          />
          {ia.beverages.coffee && (
            <Input
              name="coffee_cups"
              type="number"
              min={1}
              max={12}
              label="Quante tazze al giorno?"
              value={ia.beverages.coffee_cups_per_day}
              onChange={(e) =>
                setData('idratazione_attivita', {
                  beverages: {
                    ...ia.beverages,
                    coffee_cups_per_day: parseInt(e.target.value, 10) || 0,
                  },
                })
              }
            />
          )}

          <Checkbox
            label="Tè / tisane"
            checked={ia.beverages.tea}
            onChange={(v) =>
              setData('idratazione_attivita', { beverages: { ...ia.beverages, tea: v } })
            }
          />

          <Checkbox
            label="Vino"
            checked={ia.beverages.wine}
            onChange={(v) =>
              setData('idratazione_attivita', { beverages: { ...ia.beverages, wine: v } })
            }
          />
          {ia.beverages.wine && (
            <Input
              name="wine_per_week"
              type="number"
              min={1}
              max={30}
              label="Quanti bicchieri a settimana?"
              value={ia.beverages.wine_glasses_per_week}
              onChange={(e) =>
                setData('idratazione_attivita', {
                  beverages: {
                    ...ia.beverages,
                    wine_glasses_per_week: parseInt(e.target.value, 10) || 0,
                  },
                })
              }
            />
          )}

          <Checkbox
            label="Birra"
            checked={ia.beverages.beer}
            onChange={(v) =>
              setData('idratazione_attivita', { beverages: { ...ia.beverages, beer: v } })
            }
          />

          <Checkbox
            label="Bibite zuccherate"
            checked={ia.beverages.soda}
            onChange={(v) =>
              setData('idratazione_attivita', { beverages: { ...ia.beverages, soda: v } })
            }
          />

          <Input
            name="other_drinks"
            label="Altre bevande (opzionale)"
            placeholder="es. kombucha, succo di frutta, smoothie…"
            value={ia.beverages.other}
            onChange={(e) =>
              setData('idratazione_attivita', {
                beverages: { ...ia.beverages, other: e.target.value },
              })
            }
          />
        </Card>

        <Card className="space-y-4">
          <h3 className="text-sm font-medium text-warm-800 dark:text-warm-200">
            Quali attività pratichi?
          </h3>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_OPTIONS.map((act) => {
              const selected = ia.activities.some((a) => a.name === act)
              return (
                <button
                  key={act}
                  type="button"
                  onClick={() => (selected ? removeActivity(act) : addActivity(act))}
                  className={
                    selected
                      ? 'rounded-full bg-primary-600 px-3 py-1.5 text-sm font-medium text-white'
                      : 'rounded-full border border-warm-300 px-3 py-1.5 text-sm text-warm-700 hover:border-primary-500 hover:text-primary-700 dark:border-warm-700 dark:text-warm-300'
                  }
                >
                  {act}
                </button>
              )
            })}
          </div>

          {ia.activities.length > 0 && (
            <div className="space-y-3 pt-2">
              {ia.activities.map((act) => (
                <div
                  key={act.name}
                  className="rounded-xl border border-warm-200 bg-warm-50 p-3 dark:border-warm-700 dark:bg-warm-800/40"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium text-warm-900 dark:text-warm-50">{act.name}</span>
                    <button
                      type="button"
                      onClick={() => removeActivity(act.name)}
                      className="text-warm-400 hover:text-danger-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      name={`freq_${act.name}`}
                      type="number"
                      min={1}
                      max={14}
                      label="Volte/sett."
                      value={act.freq_per_week}
                      onChange={(e) =>
                        updateActivity(act.name, {
                          freq_per_week: parseInt(e.target.value, 10) || 1,
                        })
                      }
                    />
                    <Input
                      name={`dur_${act.name}`}
                      type="number"
                      min={5}
                      max={300}
                      label="Durata (min)"
                      value={act.duration_min}
                      onChange={(e) =>
                        updateActivity(act.name, {
                          duration_min: parseInt(e.target.value, 10) || 5,
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <h3 className="text-sm font-medium text-warm-800 dark:text-warm-200">
            App fitness che usi
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {APP_OPTIONS.map((a) => (
              <Checkbox
                key={a}
                label={a}
                checked={ia.apps.includes(a)}
                onChange={(on) => toggleApp(a, on)}
              />
            ))}
          </div>
          <Textarea
            name="wearables"
            label="Hai wearable? (opzionale)"
            placeholder="es. Apple Watch Series 9, Garmin Forerunner 265, Oura Ring…"
            value={ia.wearables}
            onChange={(e) => setData('idratazione_attivita', { wearables: e.target.value })}
          />
        </Card>
      </div>
    </OnboardingShell>
  )
}
