'use client'

import { useOnboarding } from '../OnboardingContext'
import { OnboardingShell } from '../OnboardingShell'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { RadioGroup, type RadioOption } from '@/components/ui/RadioGroup'

const SEX_OPTIONS: RadioOption<'male' | 'female' | 'other'>[] = [
  { value: 'male', label: 'Maschio' },
  { value: 'female', label: 'Femmina' },
  { value: 'other', label: 'Altro / preferisco non dirlo' },
]

export function SectionAnagrafica() {
  const { data, setData } = useOnboarding()
  const a = data.anagrafica

  const canProceed = Boolean(
    a.name.trim() &&
      a.age &&
      a.age > 0 &&
      a.age < 120 &&
      a.sex &&
      a.height_cm &&
      a.height_cm > 50 &&
      a.height_cm < 250 &&
      a.current_weight &&
      a.current_weight > 20 &&
      a.current_weight < 400
  )

  return (
    <OnboardingShell canProceed={canProceed}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
          Parliamo un po' di te
        </h2>
        <p className="mt-1 text-sm text-warm-600 dark:text-warm-400">
          Dati base per calcolare con precisione il tuo fabbisogno energetico.
        </p>
      </div>

      <Card className="space-y-5">
        <Input
          name="name"
          label="Come ti chiami?"
          placeholder="Il tuo nome"
          value={a.name}
          onChange={(e) => setData('anagrafica', { name: e.target.value })}
          autoComplete="given-name"
        />

        <Input
          name="age"
          type="number"
          label="Quanti anni hai?"
          placeholder="es. 43"
          min={1}
          max={120}
          value={a.age ?? ''}
          onChange={(e) =>
            setData('anagrafica', { age: e.target.value ? parseInt(e.target.value, 10) : null })
          }
        />

        <RadioGroup
          name="sex"
          label="Sesso biologico"
          value={a.sex}
          onChange={(v) => setData('anagrafica', { sex: v })}
          options={SEX_OPTIONS}
          hint="Serve per calcolare il metabolismo basale (Mifflin-St Jeor)."
        />

        <Input
          name="height_cm"
          type="number"
          label="Quanto sei alto in cm?"
          placeholder="es. 178"
          min={50}
          max={250}
          value={a.height_cm ?? ''}
          onChange={(e) =>
            setData('anagrafica', {
              height_cm: e.target.value ? parseInt(e.target.value, 10) : null,
            })
          }
        />

        <Input
          name="current_weight"
          type="number"
          step="0.1"
          label="Quanto pesi adesso in kg?"
          placeholder="es. 78.2"
          min={20}
          max={400}
          value={a.current_weight ?? ''}
          onChange={(e) =>
            setData('anagrafica', {
              current_weight: e.target.value ? parseFloat(e.target.value) : null,
            })
          }
        />
      </Card>
    </OnboardingShell>
  )
}
