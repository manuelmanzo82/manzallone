'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  DashboardData,
  Meal,
  MealsSummaryRow,
  WaterRow,
  WeekComparison,
  WeightHistoryRow,
  Workout,
  WorkoutsSummaryRow,
} from '@/lib/types'

const CACHE_TTL_MS = 30_000
const INVALIDATE_EVENT = 'manzallone:data:invalidate'

interface CacheEntry {
  data: DashboardData
  ts: number
}

const cache = new Map<string, CacheEntry>()

function weekKey(weekStartIso: string, userId: string) {
  return `${userId}:${weekStartIso}`
}

/** Fire from anywhere on the client (e.g. after chat tool call success) to
 *  drop cached dashboard data so the next view re-fetches. */
export function invalidateDashboardCache() {
  if (typeof window === 'undefined') return
  cache.clear()
  window.dispatchEvent(new CustomEvent(INVALIDATE_EVENT))
}

async function fetchAll(userId: string, weekStart: Date): Promise<DashboardData> {
  const weekStartIso = toIsoDate(weekStart)
  const weekEndIso = toIsoDate(addDays(weekStart, 6))
  const supabase = createClient()

  const [
    weightsRes,
    mealsSummaryRes,
    workoutsSummaryRes,
    waterRes,
    streakRes,
    comparisonRes,
    weekMealsRes,
    weekWorkoutsRes,
  ] = await Promise.all([
    supabase.rpc('get_weight_history', {
      p_user_id: userId,
      p_start_date: weekStartIso,
      p_end_date: weekEndIso,
    }),
    supabase.rpc('get_meals_summary_by_day', {
      p_user_id: userId,
      p_start_date: weekStartIso,
      p_end_date: weekEndIso,
    }),
    supabase.rpc('get_workouts_summary', {
      p_user_id: userId,
      p_start_date: weekStartIso,
      p_end_date: weekEndIso,
    }),
    supabase.rpc('get_water_by_day', {
      p_user_id: userId,
      p_start_date: weekStartIso,
      p_end_date: weekEndIso,
    }),
    supabase.rpc('get_streak', { p_user_id: userId }),
    supabase.rpc('get_week_comparison', {
      p_user_id: userId,
      p_week_start: weekStartIso,
    }),
    supabase.rpc('get_meals_for_week', {
      p_user_id: userId,
      p_week_start: weekStartIso,
    }),
    supabase.rpc('get_workouts_for_week', {
      p_user_id: userId,
      p_week_start: weekStartIso,
    }),
  ])

  const firstErr =
    weightsRes.error ??
    mealsSummaryRes.error ??
    workoutsSummaryRes.error ??
    waterRes.error ??
    streakRes.error ??
    comparisonRes.error ??
    weekMealsRes.error ??
    weekWorkoutsRes.error
  if (firstErr) throw new Error(firstErr.message)

  return {
    weights: (weightsRes.data ?? []) as WeightHistoryRow[],
    meals: (mealsSummaryRes.data ?? []) as MealsSummaryRow[],
    workouts: (workoutsSummaryRes.data ?? []) as WorkoutsSummaryRow[],
    water: (waterRes.data ?? []) as WaterRow[],
    weekMeals: (weekMealsRes.data ?? []) as Meal[],
    weekWorkouts: (weekWorkoutsRes.data ?? []) as Workout[],
    streak: (streakRes.data as number) ?? 0,
    comparison: comparisonRes.data as WeekComparison,
  }
}

export interface UseDashboardDataResult {
  data: DashboardData | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useDashboardData(
  userId: string,
  weekStart: Date
): UseDashboardDataResult {
  const weekStartIso = toIsoDate(weekStart)
  const key = weekKey(weekStartIso, userId)

  const initial = cache.get(key)
  const [data, setData] = useState<DashboardData | null>(initial?.data ?? null)
  const [loading, setLoading] = useState<boolean>(!initial)
  const [error, setError] = useState<string | null>(null)
  const [bumpToken, setBump] = useState(0)
  const lastFetchKey = useRef<string | null>(null)

  const triggerRefresh = useCallback(() => {
    cache.delete(key)
    setBump((x) => x + 1)
  }, [key])

  useEffect(() => {
    let cancelled = false
    const cached = cache.get(key)
    const fresh = cached && Date.now() - cached.ts < CACHE_TTL_MS

    if (cached) {
      setData(cached.data)
    }
    if (fresh && lastFetchKey.current === key) {
      setLoading(false)
      return
    }

    setLoading(!cached)
    setError(null)
    lastFetchKey.current = key

    fetchAll(userId, weekStart)
      .then((d) => {
        if (cancelled) return
        cache.set(key, { data: d, ts: Date.now() })
        setData(d)
        setLoading(false)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Errore di caricamento')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, bumpToken])

  // global invalidation listener
  useEffect(() => {
    const handler = () => {
      lastFetchKey.current = null
      setBump((x) => x + 1)
    }
    window.addEventListener(INVALIDATE_EVENT, handler)
    return () => window.removeEventListener(INVALIDATE_EVENT, handler)
  }, [])

  return { data, loading, error, refresh: triggerRefresh }
}

// ---- Date helpers ----

export function startOfWeekMonday(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  const day = r.getDay() // 0=Sun, 1=Mon, ...
  const diff = (day + 6) % 7 // days since Monday
  r.setDate(r.getDate() - diff)
  return r
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
