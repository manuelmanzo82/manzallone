'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Utensils } from 'lucide-react'
import { addDays, toIsoDate } from '@/hooks/useDashboardData'
import type { Meal } from '@/lib/types'

interface Props {
  weekStart: Date
  weekMeals: Meal[]
  loading: boolean
}

const DOW_FULL_IT = [
  'lunedì', 'martedì', 'mercoledì', 'giovedì',
  'venerdì', 'sabato', 'domenica',
]
const MONTHS_SHORT_IT = [
  'gen', 'feb', 'mar', 'apr', 'mag', 'giu',
  'lug', 'ago', 'set', 'ott', 'nov', 'dic',
]

export function MealsSection({ weekStart, weekMeals, loading }: Props) {
  const todayIso = toIsoDate(new Date())
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    [todayIso]: true,
  })

  const grouped = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i)
      const iso = toIsoDate(day)
      const meals = weekMeals
        .filter((m) => m.recorded_at.slice(0, 10) === iso)
        .sort(
          (a, b) =>
            new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
        )
      const totalKcal = meals.reduce((s, m) => s + (m.total_kcal ?? 0), 0)
      return { iso, dow: DOW_FULL_IT[i], date: day, meals, totalKcal }
    })
    return days.filter((d) => d.meals.length > 0)
  }, [weekStart, weekMeals])

  if (loading) {
    return (
      <div className="h-40 animate-pulse rounded-2xl border border-warm-200 bg-warm-100 dark:border-warm-800 dark:bg-warm-900" />
    )
  }

  return (
    <section className="rounded-2xl border border-warm-200 bg-white p-4 shadow-sm dark:border-warm-800 dark:bg-warm-900">
      <header className="mb-3 flex items-center gap-2">
        <Utensils className="h-4 w-4 text-primary-600 dark:text-primary-300" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-warm-600 dark:text-warm-300">
          Pasti
        </h2>
      </header>

      {grouped.length === 0 ? (
        <div className="rounded-xl border border-dashed border-warm-300 bg-warm-50 p-4 text-center text-sm text-warm-600 dark:border-warm-700 dark:bg-warm-800/50 dark:text-warm-300">
          Nessun pasto registrato questa settimana.
        </div>
      ) : (
        <ul className="space-y-2">
          {grouped.map((g) => {
            const open = expanded[g.iso] ?? false
            return (
              <li
                key={g.iso}
                className="overflow-hidden rounded-xl border border-warm-200 dark:border-warm-700"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((s) => ({ ...s, [g.iso]: !open }))
                  }
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-warm-50 dark:hover:bg-warm-800"
                >
                  <div className="flex items-center gap-2">
                    {open ? (
                      <ChevronDown className="h-4 w-4 text-warm-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-warm-500" />
                    )}
                    <span className="text-sm font-semibold text-warm-900 dark:text-warm-50">
                      {g.iso === todayIso ? 'Oggi' : capitalize(g.dow)}{' '}
                      <span className="font-normal text-warm-500">
                        {g.date.getDate()} {MONTHS_SHORT_IT[g.date.getMonth()]}
                      </span>
                    </span>
                  </div>
                  <span className="text-xs text-warm-500">
                    {g.meals.length} pasti · {Math.round(g.totalKcal)} kcal
                  </span>
                </button>
                {open && (
                  <ul className="space-y-1 border-t border-warm-200 bg-warm-50 px-3 py-2 dark:border-warm-700 dark:bg-warm-800/50">
                    {g.meals.map((m) => (
                      <MealRow key={m.id} meal={m} />
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function MealRow({ meal }: { meal: Meal }) {
  const [open, setOpen] = useState(false)
  const summary = meal.items
    .slice(0, 3)
    .map((it) => it.display_name ?? it.name ?? '?')
    .join(', ')
  const time = new Date(meal.recorded_at).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <li className="rounded-lg bg-white p-2 dark:bg-warm-900">
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        className="flex w-full items-start justify-between gap-2 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300">
              {prettyMealType(meal.meal_type)}
            </span>
            <span className="text-warm-500">{time}</span>
          </div>
          <div className="truncate text-sm text-warm-700 dark:text-warm-200">
            {summary || '—'}
            {meal.items.length > 3 && (
              <span className="text-warm-500"> +{meal.items.length - 3}</span>
            )}
          </div>
        </div>
        <div className="text-right text-xs">
          <div className="font-semibold text-warm-900 dark:text-warm-50">
            {Math.round(meal.total_kcal ?? 0)} kcal
          </div>
          <div className="text-warm-500">
            P{Math.round(meal.total_protein ?? 0)} · C
            {Math.round(meal.total_carbs ?? 0)} · F
            {Math.round(meal.total_fat ?? 0)}
          </div>
        </div>
      </button>
      {open && meal.items.length > 0 && (
        <ul className="mt-2 space-y-0.5 border-t border-warm-200 pt-2 text-xs dark:border-warm-700">
          {meal.items.map((it, i) => (
            <li
              key={i}
              className="flex items-center justify-between text-warm-600 dark:text-warm-300"
            >
              <span>
                {it.display_name ?? it.name ?? '?'}{' '}
                <span className="text-warm-500">· {it.quantity_g}g</span>
              </span>
              {it.kcal != null && (
                <span className="text-warm-500">{Math.round(it.kcal)} kcal</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function prettyMealType(t: string | null): string {
  switch (t) {
    case 'breakfast': return 'Colazione'
    case 'morning_snack': return 'Spuntino'
    case 'lunch': return 'Pranzo'
    case 'afternoon_snack': return 'Merenda'
    case 'dinner': return 'Cena'
    case 'evening_snack': return 'Spuntino'
    default: return 'Pasto'
  }
}
