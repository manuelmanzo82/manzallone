'use client'

import { useMemo, useState } from 'react'
import { startOfWeekMonday, useDashboardData } from '@/hooks/useDashboardData'
import type { Profile } from '@/lib/types'
import { StreakCard } from './StreakCard'
import { WeekSummary } from './WeekSummary'
import { WeightSection } from './WeightSection'
import { CaloriesSection } from './CaloriesSection'
import { MealsSection } from './MealsSection'
import { ActivitySection } from './ActivitySection'
import { HydrationSection } from './HydrationSection'
import { CompareSection } from './CompareSection'

interface Props {
  userId: string
  profile: Profile
}

export function DashboardClient({ userId, profile }: Props) {
  const todayWeekStart = useMemo(() => startOfWeekMonday(new Date()), [])
  const [weekStart, setWeekStart] = useState<Date>(todayWeekStart)

  const { data, loading, error, refresh } = useDashboardData(userId, weekStart)

  const isCurrentWeek =
    weekStart.getTime() === todayWeekStart.getTime()

  return (
    <main
      className="min-h-[100dvh] bg-warm-50 dark:bg-warm-950"
      style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
    >
      <header className="sticky top-0 z-10 border-b border-warm-200 bg-white/85 backdrop-blur dark:border-warm-800 dark:bg-warm-900/85">
        <div className="mx-auto w-full max-w-2xl px-4 py-3">
          <h1 className="text-base font-semibold text-warm-900 dark:text-warm-50">
            Dashboard
          </h1>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-3 py-4 sm:px-4">
        {error && (
          <div className="rounded-2xl border border-danger-500/30 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:bg-danger-500/10">
            {error}{' '}
            <button onClick={refresh} className="ml-2 underline">
              riprova
            </button>
          </div>
        )}

        <StreakCard streak={data?.streak ?? null} loading={loading && !data} />

        <WeekSummary
          weekStart={weekStart}
          onChange={setWeekStart}
          isCurrentWeek={isCurrentWeek}
          trackedDays={
            data
              ? countTrackedDays(data)
              : null
          }
        />

        <WeightSection
          userId={userId}
          weekStart={weekStart}
          weights={data?.weights ?? []}
          targetWeight={profile.target_weight}
          currentWeight={profile.current_weight}
          loading={loading && !data}
          onLogged={refresh}
        />

        <CaloriesSection
          weekStart={weekStart}
          meals={data?.meals ?? []}
          weekMeals={data?.weekMeals ?? []}
          profile={profile}
          loading={loading && !data}
        />

        <MealsSection
          weekStart={weekStart}
          weekMeals={data?.weekMeals ?? []}
          loading={loading && !data}
        />

        <ActivitySection
          weekStart={weekStart}
          workouts={data?.workouts ?? []}
          weekWorkouts={data?.weekWorkouts ?? []}
          loading={loading && !data}
        />

        <HydrationSection
          userId={userId}
          weekStart={weekStart}
          water={data?.water ?? []}
          targetMl={profile.daily_water_ml_target}
          loading={loading && !data}
          onLogged={refresh}
        />

        <CompareSection
          comparison={data?.comparison ?? null}
          loading={loading && !data}
        />
      </div>
    </main>
  )
}

function countTrackedDays(data: {
  weights: { date: string; weight_kg: number | null }[]
  meals: { date: string }[]
  workouts: { date: string }[]
  water: { date: string }[]
}): number {
  const set = new Set<string>()
  for (const w of data.weights) if (w.weight_kg !== null) set.add(w.date)
  for (const m of data.meals) set.add(m.date)
  for (const wo of data.workouts) set.add(wo.date)
  for (const wa of data.water) set.add(wa.date)
  return set.size
}
