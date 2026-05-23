'use client'

import { useMemo } from 'react'
import { Dumbbell } from 'lucide-react'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { addDays, toIsoDate } from '@/hooks/useDashboardData'
import type { Workout, WorkoutsSummaryRow } from '@/lib/types'

interface Props {
  weekStart: Date
  workouts: WorkoutsSummaryRow[]
  weekWorkouts: Workout[]
  loading: boolean
}

const DOW_IT = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']

export function ActivitySection({
  weekStart,
  workouts,
  weekWorkouts,
  loading,
}: Props) {
  const totals = useMemo(() => {
    return workouts.reduce(
      (acc, w) => ({
        sessions: acc.sessions + w.count,
        minutes: acc.minutes + w.total_min,
        km: acc.km + Number(w.total_km),
        kcal: acc.kcal + w.total_kcal,
      }),
      { sessions: 0, minutes: 0, km: 0, kcal: 0 }
    )
  }, [workouts])

  const series = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i)
      const iso = toIsoDate(day)
      const row = workouts.find((w) => w.date === iso)
      return { date: iso, label: DOW_IT[i], minutes: row?.total_min ?? 0 }
    })
  }, [weekStart, workouts])

  if (loading) {
    return (
      <div className="h-64 animate-pulse rounded-2xl border border-warm-200 bg-warm-100 dark:border-warm-800 dark:bg-warm-900" />
    )
  }

  return (
    <section className="rounded-2xl border border-warm-200 bg-white p-4 shadow-sm dark:border-warm-800 dark:bg-warm-900">
      <header className="mb-3 flex items-center gap-2">
        <Dumbbell className="h-4 w-4 text-primary-600 dark:text-primary-300" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-warm-600 dark:text-warm-300">
          Attività
        </h2>
      </header>

      {totals.sessions === 0 ? (
        <div className="rounded-xl border border-dashed border-warm-300 bg-warm-50 p-5 text-center dark:border-warm-700 dark:bg-warm-800/50">
          <div className="text-2xl">💪</div>
          <div className="mt-1 text-sm font-semibold text-warm-700 dark:text-warm-200">
            Nessun allenamento questa settimana
          </div>
          <div className="mt-0.5 text-xs text-warm-500">
            Anche solo una camminata vale.
          </div>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-4 gap-2 text-center">
            <Kpi label="Sessioni" value={String(totals.sessions)} />
            <Kpi label="Minuti" value={String(totals.minutes)} />
            <Kpi
              label="Km"
              value={totals.km > 0 ? totals.km.toFixed(1) : '—'}
            />
            <Kpi
              label="Kcal"
              value={totals.kcal > 0 ? String(totals.kcal) : '—'}
            />
          </dl>

          <div className="mt-4 h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={series}
                margin={{ top: 4, right: 8, bottom: 0, left: -16 }}
              >
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  axisLine={false}
                  tickLine={false}
                  className="text-warm-500"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                  className="text-warm-500"
                />
                <Tooltip
                  cursor={{ fill: 'rgba(120,113,108,0.1)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const p = payload[0].payload as (typeof series)[number]
                    return (
                      <div className="rounded-lg border border-warm-200 bg-white px-2 py-1.5 text-xs shadow-md dark:border-warm-700 dark:bg-warm-800">
                        {p.minutes > 0 ? `${p.minutes} min` : 'riposo'}
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="minutes"
                  fill="#0d9488"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-3 space-y-1.5">
            {weekWorkouts.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between rounded-xl border border-warm-200 px-3 py-2 text-sm dark:border-warm-700"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-warm-900 dark:text-warm-50">
                    {w.type ?? 'Allenamento'}
                  </div>
                  <div className="text-xs text-warm-500">
                    {new Date(w.recorded_at).toLocaleDateString('it-IT', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </div>
                </div>
                <div className="text-right text-xs text-warm-600 dark:text-warm-300">
                  {w.duration_min ? `${w.duration_min} min` : ''}
                  {w.distance_km ? ` · ${w.distance_km} km` : ''}
                  {w.calories_burned ? ` · ${w.calories_burned} kcal` : ''}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-warm-100 px-2 py-2 dark:bg-warm-800">
      <div className="text-lg font-bold text-warm-900 dark:text-warm-50">
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-warm-500">
        {label}
      </div>
    </div>
  )
}
