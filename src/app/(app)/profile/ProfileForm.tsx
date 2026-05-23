'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { updateProfile, type ProfileFormState } from '@/lib/profile/actions'
import type { Profile } from '@/lib/types'

interface Props {
  profile: Profile
}

const initialState: ProfileFormState = {}

export function ProfileForm({ profile }: Props) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState)

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-warm-200 bg-white p-5 dark:border-warm-700 dark:bg-warm-800"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-warm-500">
        Modifica profilo
      </h2>

      <Input
        name="name"
        label="Nome"
        defaultValue={profile.name ?? ''}
        autoComplete="given-name"
      />

      <Input
        name="target_weight"
        label="Peso target (kg)"
        type="number"
        step="0.1"
        min="30"
        max="250"
        defaultValue={profile.target_weight ?? ''}
      />

      <div>
        <label
          htmlFor="activity_level"
          className="mb-1.5 block text-sm font-medium text-warm-800 dark:text-warm-200"
        >
          Livello di attività
        </label>
        <select
          id="activity_level"
          name="activity_level"
          defaultValue={profile.activity_level ?? 'moderate'}
          className="block w-full rounded-xl border border-warm-300 bg-white px-4 py-3 text-base text-warm-900 dark:border-warm-700 dark:bg-warm-900 dark:text-warm-50"
        >
          <option value="sedentary">Sedentario</option>
          <option value="light">Leggero (1-3 g/sett)</option>
          <option value="moderate">Moderato (3-5 g/sett)</option>
          <option value="active">Attivo (6-7 g/sett)</option>
          <option value="very_active">Molto attivo (atleta)</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="goal"
          className="mb-1.5 block text-sm font-medium text-warm-800 dark:text-warm-200"
        >
          Obiettivo
        </label>
        <select
          id="goal"
          name="goal"
          defaultValue={profile.goal ?? 'lose'}
          className="block w-full rounded-xl border border-warm-300 bg-white px-4 py-3 text-base text-warm-900 dark:border-warm-700 dark:bg-warm-900 dark:text-warm-50"
        >
          <option value="lose">Perdere peso</option>
          <option value="maintain">Mantenere</option>
          <option value="gain">Aumentare</option>
          <option value="health">Salute generale</option>
          <option value="performance">Performance</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="coach_tone"
          className="mb-1.5 block text-sm font-medium text-warm-800 dark:text-warm-200"
        >
          Tono del coach
        </label>
        <select
          id="coach_tone"
          name="coach_tone"
          defaultValue={profile.coach_tone ?? 'direct'}
          className="block w-full rounded-xl border border-warm-300 bg-white px-4 py-3 text-base text-warm-900 dark:border-warm-700 dark:bg-warm-900 dark:text-warm-50"
        >
          <option value="direct">Diretto</option>
          <option value="gentle">Gentile</option>
          <option value="playful">Amichevole</option>
          <option value="tough">Esigente</option>
        </select>
      </div>

      <Textarea
        name="food_loves"
        label="Cibi che ami (separati da virgola)"
        defaultValue={(profile.food_loves ?? []).join(', ')}
        rows={2}
      />
      <Textarea
        name="food_hates"
        label="Cibi che non ami"
        defaultValue={(profile.food_hates ?? []).join(', ')}
        rows={2}
      />
      <Textarea
        name="allergies"
        label="Allergie / intolleranze"
        defaultValue={(profile.allergies ?? []).join(', ')}
        rows={2}
      />

      {state?.error && (
        <p className="text-sm text-danger-600">{state.error}</p>
      )}
      {state?.ok && (
        <p className="text-sm text-success-600">Salvato.</p>
      )}

      <Button type="submit" loading={pending} fullWidth>
        Salva modifiche
      </Button>
    </form>
  )
}
