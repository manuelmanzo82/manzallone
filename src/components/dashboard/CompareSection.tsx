'use client'

import { ArrowDown, ArrowRight, ArrowUp, GitCompare } from 'lucide-react'
import type { WeekComparison } from '@/lib/types'

interface Props {
  comparison: WeekComparison | null
  loading: boolean
}

type Direction = 'down' | 'up' | 'flat'
type Sentiment = 'good' | 'bad' | 'neutral'

export function CompareSection({ comparison, loading }: Props) {
  if (loading) {
    return (
      <div className="h-36 animate-pulse rounded-2xl border border-warm-200 bg-warm-100 dark:border-warm-800 dark:bg-warm-900" />
    )
  }
  if (!comparison) return null

  const { avg_weight, avg_kcal_per_day, workouts, calorie_target_adherence } =
    comparison

  const hasPrevData =
    avg_weight.previous !== null ||
    avg_kcal_per_day.previous !== null ||
    workouts.previous > 0 ||
    calorie_target_adherence.previous_total > 0

  return (
    <section className="rounded-2xl border border-warm-200 bg-white p-4 shadow-sm dark:border-warm-800 dark:bg-warm-900">
      <header className="mb-3 flex items-center gap-2">
        <GitCompare className="h-4 w-4 text-primary-600 dark:text-primary-300" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-warm-600 dark:text-warm-300">
          Confronto con settimana scorsa
        </h2>
      </header>

      {!hasPrevData ? (
        <div className="rounded-xl border border-dashed border-warm-300 bg-warm-50 p-4 text-center text-sm text-warm-600 dark:border-warm-700 dark:bg-warm-800/50 dark:text-warm-300">
          Nessun dato per la settimana precedente.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Kpi
            label="Peso medio"
            value={
              avg_weight.delta !== null
                ? `${signed(avg_weight.delta)} kg`
                : '—'
            }
            sub={
              avg_weight.current !== null
                ? `${avg_weight.current.toFixed(1)} kg`
                : 'n/d'
            }
            sentiment={sentimentLowerIsBetter(avg_weight.delta)}
            direction={direction(avg_weight.delta)}
          />
          <Kpi
            label="Kcal/giorno"
            value={
              avg_kcal_per_day.delta !== null
                ? `${signed(avg_kcal_per_day.delta)} kcal`
                : '—'
            }
            sub={
              avg_kcal_per_day.current !== null
                ? `${Math.round(avg_kcal_per_day.current)} kcal`
                : 'n/d'
            }
            sentiment="neutral"
            direction={direction(avg_kcal_per_day.delta)}
          />
          <Kpi
            label="Allenamenti"
            value={`${signed(workouts.delta)} sess.`}
            sub={`${workouts.current} / 7`}
            sentiment={sentimentHigherIsBetter(workouts.delta)}
            direction={direction(workouts.delta)}
          />
          <Kpi
            label="Target kcal"
            value={`${calorie_target_adherence.current_hit}/${calorie_target_adherence.current_total} gg`}
            sub={`vs ${calorie_target_adherence.previous_hit}/${calorie_target_adherence.previous_total}`}
            sentiment={sentimentHigherIsBetter(
              calorie_target_adherence.current_hit -
                calorie_target_adherence.previous_hit
            )}
            direction={direction(
              calorie_target_adherence.current_hit -
                calorie_target_adherence.previous_hit
            )}
          />
        </div>
      )}
    </section>
  )
}

function Kpi({
  label,
  value,
  sub,
  sentiment,
  direction,
}: {
  label: string
  value: string
  sub: string
  sentiment: Sentiment
  direction: Direction
}) {
  const color =
    sentiment === 'good'
      ? 'text-success-600'
      : sentiment === 'bad'
      ? 'text-danger-600'
      : 'text-warm-700 dark:text-warm-200'
  const Icon =
    direction === 'down' ? ArrowDown : direction === 'up' ? ArrowUp : ArrowRight
  return (
    <div className="rounded-xl border border-warm-200 p-3 dark:border-warm-700">
      <div className="text-[10px] uppercase tracking-wider text-warm-500">
        {label}
      </div>
      <div className={`mt-1 flex items-center gap-1 text-base font-bold ${color}`}>
        <Icon className="h-4 w-4" strokeWidth={2.5} />
        <span>{value}</span>
      </div>
      <div className="mt-0.5 text-[11px] text-warm-500">{sub}</div>
    </div>
  )
}

function signed(n: number | null): string {
  if (n === null) return '—'
  if (n > 0) return `+${n}`
  return String(n)
}

function direction(delta: number | null): Direction {
  if (delta === null || delta === 0) return 'flat'
  return delta > 0 ? 'up' : 'down'
}

function sentimentLowerIsBetter(delta: number | null): Sentiment {
  if (delta === null || delta === 0) return 'neutral'
  return delta < 0 ? 'good' : 'bad'
}

function sentimentHigherIsBetter(delta: number | null): Sentiment {
  if (delta === null || delta === 0) return 'neutral'
  return delta > 0 ? 'good' : 'bad'
}
