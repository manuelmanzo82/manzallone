'use client'

import { useMemo, useState, useTransition } from 'react'
import { Heart, X, Plus } from 'lucide-react'
import { useOnboarding } from '../OnboardingContext'
import { OnboardingShell } from '../OnboardingShell'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Checkbox } from '@/components/ui/Checkbox'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import {
  FOOD_CATEGORY_LABELS,
  FOOD_CATEGORY_ORDER,
  COMMON_ALLERGIES,
} from '@/lib/onboarding/types'
import { addCustomFood } from '@/lib/onboarding/actions'
import type { FoodCategory, FoodItem } from '@/lib/types'

type PrefState = 'neutral' | 'love' | 'hate'

function cycle(curr: PrefState): PrefState {
  if (curr === 'neutral') return 'love'
  if (curr === 'love') return 'hate'
  return 'neutral'
}

function FoodCard({
  food,
  state,
  onClick,
}: {
  food: FoodItem
  state: PrefState
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-between gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm transition-all',
        state === 'neutral' &&
          'border-warm-200 bg-white text-warm-800 hover:border-warm-300 dark:border-warm-700 dark:bg-warm-800 dark:text-warm-200',
        state === 'love' && 'border-success-500 bg-success-50 text-success-900 dark:bg-success-900/30 dark:text-success-100',
        state === 'hate' && 'border-danger-500 bg-danger-50 text-danger-900 dark:bg-danger-900/30 dark:text-danger-100'
      )}
    >
      <span className="flex-1 truncate font-medium">
        {food.display_name ?? food.name}
      </span>
      {state === 'love' && <Heart className="h-4 w-4 shrink-0 fill-success-500 text-success-500" />}
      {state === 'hate' && <X className="h-4 w-4 shrink-0 text-danger-500" strokeWidth={3} />}
    </button>
  )
}

function CategoryBlock({ category }: { category: FoodCategory }) {
  const { data, setData, foodCatalog, setFoodCatalog } = useOnboarding()
  const [input, setInput] = useState('')
  const [pending, startTransition] = useTransition()

  const foodsInCategory = useMemo(
    () => foodCatalog.filter((f) => f.category === category),
    [foodCatalog, category]
  )

  const prefs = data.preferenze.preferences

  const handleClick = (foodId: string) => {
    const curr = (prefs[foodId] as PrefState | undefined) ?? 'neutral'
    const next = cycle(curr)
    const updated = { ...prefs }
    if (next === 'neutral') delete updated[foodId]
    else updated[foodId] = next
    setData('preferenze', { preferences: updated })
  }

  const handleAddCustom = () => {
    const items = input
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 1)
    if (!items.length) return

    startTransition(async () => {
      const addedNames: string[] = []
      for (const name of items) {
        const result = await addCustomFood(category, name)
        if (result.ok) {
          addedNames.push(result.name)
          // Append to in-memory catalog so it shows up immediately
          if (!foodCatalog.some((f) => f.id === result.id)) {
            setFoodCatalog([
              ...foodCatalog,
              {
                id: result.id,
                name: result.name,
                display_name: name,
                category,
                subcategory: null,
                avg_kcal_100g: null,
                avg_protein_100g: null,
                avg_carbs_100g: null,
                avg_fat_100g: null,
                avg_fiber_100g: null,
                glycemic_index: null,
                default_portion_g: null,
                default_portion_unit: 'g',
                aliases: [],
                is_system: false,
                validation_count: 1,
                created_at: new Date().toISOString(),
              },
            ])
          }
        }
      }
      if (addedNames.length) {
        setData('preferenze', {
          custom_foods_added: {
            ...data.preferenze.custom_foods_added,
            [category]: [
              ...(data.preferenze.custom_foods_added[category] ?? []),
              ...addedNames,
            ],
          },
        })
      }
      setInput('')
    })
  }

  return (
    <Card>
      <h3 className="mb-3 text-base font-semibold text-warm-900 dark:text-warm-50">
        {FOOD_CATEGORY_LABELS[category]}
      </h3>
      {foodsInCategory.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {foodsInCategory.map((f) => (
            <FoodCard
              key={f.id}
              food={f}
              state={(prefs[f.id] as PrefState) ?? 'neutral'}
              onClick={() => handleClick(f.id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-warm-500">Nessun alimento in questa categoria.</p>
      )}

      <div className="mt-4 flex gap-2">
        <Input
          name={`custom_${category}`}
          placeholder={`Aggiungi altri ${FOOD_CATEGORY_LABELS[category].toLowerCase()}, separati da virgola`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="text-sm"
        />
        <Button
          variant="secondary"
          size="md"
          onClick={handleAddCustom}
          disabled={!input.trim() || pending}
          loading={pending}
          className="shrink-0"
        >
          <Plus className="h-4 w-4" /> Aggiungi
        </Button>
      </div>
    </Card>
  )
}

export function SectionPreferenzeAlimenti() {
  const { data, setData } = useOnboarding()
  const markedCount = Object.keys(data.preferenze.preferences).length

  const canProceed = markedCount >= 5

  const toggleAllergy = (a: string, on: boolean) => {
    const set = new Set(data.preferenze.allergies)
    if (on) set.add(a)
    else set.delete(a)
    setData('preferenze', { allergies: [...set] })
  }

  return (
    <OnboardingShell canProceed={canProceed}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
          Cosa ami e cosa odi
        </h2>
        <p className="mt-1 text-sm text-warm-600 dark:text-warm-400">
          Tocca un alimento per ciclare:{' '}
          <span className="text-success-600">verde = amo</span>,{' '}
          <span className="text-danger-600">rosso = odio</span>, grigio = neutrale.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-800 dark:bg-primary-900/40 dark:text-primary-200">
          {markedCount} / 5 alimenti marcati (minimo per proseguire)
        </div>
      </div>

      <div className="space-y-4">
        {FOOD_CATEGORY_ORDER.map((cat) => (
          <CategoryBlock key={cat} category={cat} />
        ))}

        <Card>
          <h3 className="mb-1 text-base font-semibold text-warm-900 dark:text-warm-50">
            Allergie e intolleranze
          </h3>
          <p className="mb-3 text-sm text-warm-600 dark:text-warm-400">
            Claude eviterà sempre questi ingredienti.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {COMMON_ALLERGIES.map((a) => (
              <Checkbox
                key={a}
                label={a.charAt(0).toUpperCase() + a.slice(1)}
                checked={data.preferenze.allergies.includes(a)}
                onChange={(on) => toggleAllergy(a, on)}
              />
            ))}
          </div>
        </Card>
      </div>
    </OnboardingShell>
  )
}
