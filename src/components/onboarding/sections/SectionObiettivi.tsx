'use client'

import { useOnboarding } from '../OnboardingContext'
import { OnboardingShell } from '../OnboardingShell'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Checkbox } from '@/components/ui/Checkbox'
import { RadioGroup, type RadioOption } from '@/components/ui/RadioGroup'
import type { ObiettiviData } from '@/lib/onboarding/types'

const GOAL_OPTIONS: RadioOption<NonNullable<ObiettiviData['goal']>>[] = [
  { value: 'lose', label: 'Perdere peso', description: 'Deficit calorico moderato' },
  { value: 'maintain', label: 'Mantenere peso', description: 'Bilancio energetico stabile' },
  { value: 'gain', label: 'Aumentare massa muscolare', description: 'Surplus calorico controllato' },
  { value: 'health', label: 'Migliorare salute generale', description: 'Focus su qualità del cibo' },
  { value: 'performance', label: 'Migliorare performance', description: 'Energia per allenamenti intensi' },
]

const ACTIVITY_OPTIONS: RadioOption<NonNullable<ObiettiviData['activity_level']>>[] = [
  { value: 'sedentary', label: 'Sedentario', description: 'Lavoro da scrivania, poco movimento' },
  { value: 'light', label: 'Leggermente attivo', description: 'Passeggiate frequenti, 1-2 allenamenti leggeri/settimana' },
  { value: 'moderate', label: 'Moderatamente attivo', description: '3-4 allenamenti/settimana o lavoro fisico leggero' },
  { value: 'active', label: 'Molto attivo', description: '5+ allenamenti/settimana o lavoro fisico' },
  { value: 'very_active', label: 'Atleta', description: 'Allenamenti quotidiani intensi, doppie sessioni' },
]

export function SectionObiettivi() {
  const { data, setData } = useOnboarding()
  const o = data.obiettivi

  const needsTarget = o.goal === 'lose' || o.goal === 'gain'

  const canProceed = Boolean(
    o.goal &&
      o.activity_level &&
      (!needsTarget || (o.target_weight && o.target_date)) &&
      (o.no_conditions || o.conditions.trim().length > 0 || true) // conditions is optional if "no_conditions" or empty
  )

  return (
    <OnboardingShell canProceed={canProceed}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-warm-900 dark:text-warm-50">I tuoi obiettivi</h2>
        <p className="mt-1 text-sm text-warm-600 dark:text-warm-400">
          Costruiamo la dieta giusta per quello che vuoi ottenere.
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <RadioGroup
            name="goal"
            label="Qual è il tuo obiettivo principale?"
            value={o.goal}
            onChange={(v) => setData('obiettivi', { goal: v })}
            options={GOAL_OPTIONS}
          />
        </Card>

        {needsTarget && (
          <Card className="space-y-4">
            <Input
              name="target_weight"
              type="number"
              step="0.1"
              label="Peso obiettivo in kg"
              placeholder="es. 75"
              min={20}
              max={400}
              value={o.target_weight ?? ''}
              onChange={(e) =>
                setData('obiettivi', {
                  target_weight: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
            />
            <Input
              name="target_date"
              type="date"
              label="Entro quando vuoi raggiungerlo?"
              value={o.target_date ?? ''}
              onChange={(e) => setData('obiettivi', { target_date: e.target.value || null })}
            />
          </Card>
        )}

        <Card>
          <RadioGroup
            name="activity_level"
            label="Livello di attività generale"
            value={o.activity_level}
            onChange={(v) => setData('obiettivi', { activity_level: v })}
            options={ACTIVITY_OPTIONS}
          />
        </Card>

        <Card className="space-y-3">
          <Textarea
            name="conditions"
            label="Hai patologie o condizioni che influenzano la dieta?"
            placeholder="es. diabete tipo 2, ipertensione, intestino irritabile…"
            hint="Opzionale. Aiuta Claude a calibrare i suggerimenti."
            value={o.conditions}
            disabled={o.no_conditions}
            onChange={(e) => setData('obiettivi', { conditions: e.target.value })}
          />
          <Checkbox
            label="Nessuna patologia o condizione particolare"
            checked={o.no_conditions}
            onChange={(v) => setData('obiettivi', { no_conditions: v, conditions: v ? '' : o.conditions })}
          />
        </Card>
      </div>
    </OnboardingShell>
  )
}
