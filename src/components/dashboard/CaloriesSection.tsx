'use client'

import { useMemo, useState } from 'react'
import { Flame } from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { addDays, toIsoDate } from '@/hooks/useDashboardData'
import type { Meal, MealsSummaryRow, Profile } from '@/lib/types'

interface Props {
  weekStart: Date
  meals: MealsSummaryRow[]
  weekMeals: Meal[]
  profile: Profile
  loading: boolean
}

const DOW_IT = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']

export function CaloriesSection({
  weekStart,
  meals,
  weekMeals,
  profile,
  loading,
}: Props) {
  const [openDay, setOpenDay] = useState<string | null>(null)

  const todayIso = toIsoDate(new Date())
  const today = meals.find((m) => m.date === todayIso)

  const targetKcal = profile.daily_calorie_target ?? 0
  const targetProtein = profile.daily_protein_target_g ?? 0
  const targetCarbs = profile.daily_carbs_target_g ?? 0
  const targetFat = profile.daily_fat_target_g ?? 0

  const consumedKcal = today?.total_kcal ?? 0
  const consumedProtein = today?.total_protein ?? 0
  const consumedCarbs = today?.total_carbs ?? 0
  const consumedFat = today?.total_fat ?? 0

  const remaining = Math.max(targetKcal - consumedKcal, 0)
  const pct = targetKcal > 0 ? Math.min(consumedKcal / targetKcal, 1.05) : 0

  const weekSeries = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i)
      const iso = toIsoDate(day)
      const row = meals.find((m) => m.date === iso)
      const kcal = row?.total_kcal ?? 0
      let band: 'under' | 'ok' | 'over' = 'under'
      if (targetKcal > 0) {
        if (kcal > targetKcal * 1.1) band = 'over'
        else if (kcal >= targetKcal * 0.7) band = 'ok'
      }
      return { date: iso, label: DOW_IT[i], kcal, band }
    })
  }, [weekStart, meals, targetKcal])

  const dayMeals = openDay
    ? weekMeals.filter(
        (m) => m.recorded_at.slice(0, 10) === openDay
      )
    : []

  if (loading) {
    return (
      <div className="h-72 animate-pulse rounded-2xl border border-warm-200 bg-warm-100 dark:border-warm-800 dark:bg-warm-900" />
    )
  }

  return (
    <section className="rounded-2xl border border-warm-200 bg-white p-4 shadow-sm dark:border-warm-800 dark:bg-warm-900">
      <header className="mb-3 flex items-center gap-2">
        <Flame className="h-4 w-4 text-accent-500" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-warm-600 dark:text-warm-300">
          Calorie giornaliere
        </h2>
      </header>

      <div className="flex items-center gap-4">
        <CalorieRing
          pct={pct}
          consumed={consumedKcal}
          target={targetKcal}
          remaining={remaining}
        />
        <div className="flex-1 space-y-2">
          <MacroBar
            label="Proteine"
            value={consumedProtein}
            target={targetProtein}
            unit="g"
            color="#0d9488"
          />
          <MacroBar
            label="Carbo"
            value={consumedCarbs}
            target={targetCarbs}
            unit="g"
            color="#f97316"
          />
          <MacroBar
            label="Grassi"
            value={consumedFat}
            target={targetFat}
            unit="g"
            color="#a855f7"
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 text-[11px] uppercase tracking-wide text-warm-500">
          Settimana
        </div>
        {weekSeries.every((d) => d.kcal === 0) ? (
          <div className="rounded-xl border border-dashed border-warm-300 bg-warm-50 p-4 text-center text-sm text-warm-600 dark:border-warm-700 dark:bg-warm-800/50 dark:text-warm-300">
            Nessun pasto registrato questa settimana.
          </div>
        ) : (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weekSeries}
                margin={{ top: 4, right: 8, bottom: 0, left: -16 }}
                onClick={(ev) => {
                  const payload = (
                    ev as unknown as {
                      activePayload?: { payload: (typeof weekSeries)[number] }[]
                    }
                  )?.activePayload?.[0]?.payload
                  if (payload && payload.kcal > 0) setOpenDay(payload.date)
                }}
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
                  width={32}
                  className="text-warm-500"
                />
                <Tooltip
                  cursor={{ fill: 'rgba(120,113,108,0.1)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const p = payload[0].payload as (typeof weekSeries)[number]
                    return (
                      <div className="rounded-lg border border-warm-200 bg-white px-2 py-1.5 text-xs shadow-md dark:border-warm-700 dark:bg-warm-800">
                        <div className="font-semibold text-warm-900 dark:text-warm-50">
                          {p.kcal} kcal
                        </div>
                        <div className="text-warm-500">tap per dettaglio</div>
                      </div>
                    )
                  }}
                />
                {targetKcal > 0 && (
                  <ReferenceLine
                    y={targetKcal}
                    stroke="#0d9488"
                    strokeDasharray="3 3"
                    label={{
                      value: `${targetKcal}`,
                      position: 'right',
                      fill: '#0d9488',
                      fontSize: 10,
                    }}
                  />
                )}
                <Bar dataKey="kcal" radius={[6, 6, 0, 0]} maxBarSize={36}>
                  {weekSeries.map((d) => (
                    <Cell
                      key={d.date}
                      fill={
                        d.band === 'over'
                          ? '#dc2626'
                          : d.band === 'ok'
                          ? '#10b981'
                          : '#f97316'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {openDay && (
        <DayDetailModal
          dateIso={openDay}
          meals={dayMeals}
          onClose={() => setOpenDay(null)}
        />
      )}
    </section>
  )
}

function CalorieRing({
  pct,
  consumed,
  target,
  remaining,
}: {
  pct: number
  consumed: number
  target: number
  remaining: number
}) {
  const size = 132
  const stroke = 12
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.min(pct, 1))

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(120,113,108,0.18)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={pct > 1 ? '#dc2626' : '#0d9488'}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-warm-900 dark:text-warm-50">
          {Math.round(consumed)}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-warm-500">
          di {target} kcal
        </div>
        <div className="mt-0.5 text-[11px] font-medium text-warm-600 dark:text-warm-300">
          {remaining} rimasti
        </div>
      </div>
    </div>
  )
}

function MacroBar({
  label,
  value,
  target,
  unit,
  color,
}: {
  label: string
  value: number
  target: number
  unit: string
  color: string
}) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between text-[11px]">
        <span className="font-medium text-warm-600 dark:text-warm-300">
          {label}
        </span>
        <span className="text-warm-500">
          {value.toFixed(0)} / {target.toFixed(0)} {unit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-warm-200 dark:bg-warm-800">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function DayDetailModal({
  dateIso,
  meals,
  onClose,
}: {
  dateIso: string
  meals: Meal[]
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-warm-900/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-warm-200 bg-white p-5 shadow-xl dark:border-warm-700 dark:bg-warm-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-warm-900 dark:text-warm-50">
          Pasti del {dateIso}
        </h3>
        {meals.length === 0 ? (
          <p className="mt-3 text-sm text-warm-500">
            Nessun pasto questo giorno.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {meals.map((m) => (
              <li
                key={m.id}
                className="rounded-xl border border-warm-200 p-3 dark:border-warm-700"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300">
                    {prettyMealType(m.meal_type)}
                  </span>
                  <span className="text-warm-500">
                    {new Date(m.recorded_at).toLocaleTimeString('it-IT', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    · {Math.round(m.total_kcal ?? 0)} kcal
                  </span>
                </div>
                <div className="mt-1 text-sm text-warm-700 dark:text-warm-200">
                  {m.items
                    .map((it) => `${it.display_name ?? it.name ?? '?'} ${it.quantity_g}g`)
                    .join(' · ') || '—'}
                </div>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-warm-200 px-3 py-2 text-sm font-medium text-warm-700 hover:bg-warm-100 dark:border-warm-700 dark:text-warm-200 dark:hover:bg-warm-800"
        >
          Chiudi
        </button>
      </div>
    </div>
  )
}

function prettyMealType(t: string | null): string {
  switch (t) {
    case 'breakfast': return 'Colazione'
    case 'morning_snack': return 'Spuntino mattina'
    case 'lunch': return 'Pranzo'
    case 'afternoon_snack': return 'Spuntino pomeriggio'
    case 'dinner': return 'Cena'
    case 'evening_snack': return 'Spuntino serale'
    default: return 'Pasto'
  }
}
