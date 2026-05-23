'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { DailyStatus } from '@/lib/types'

interface BannerData {
  kcalConsumed: number
  kcalTarget: number
  mealsToday: number
  weightToday: number | null
  loading: boolean
}

const INVALIDATE_EVENT = 'manzallone:data:invalidate'

export function ChatDailyBanner() {
  const [data, setData] = useState<BannerData>({
    kcalConsumed: 0,
    kcalTarget: 0,
    mealsToday: 0,
    weightToday: null,
    loading: true,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const todayIso = new Date().toISOString().slice(0, 10)
      const [statusRes, mealsRes, weightRes] = await Promise.all([
        supabase.rpc('get_daily_status', {
          p_user_id: user.id,
          p_date: todayIso,
        }),
        supabase
          .from('meals')
          .select('id')
          .eq('user_id', user.id)
          .gte('recorded_at', `${todayIso}T00:00:00Z`),
        supabase
          .from('weights')
          .select('weight_kg, recorded_at')
          .eq('user_id', user.id)
          .gte('recorded_at', `${todayIso}T00:00:00Z`)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (cancelled) return
      const status = statusRes.data as DailyStatus | null
      setData({
        kcalConsumed: status?.consumed.kcal ?? 0,
        kcalTarget: status?.targets.kcal ?? 0,
        mealsToday: mealsRes.data?.length ?? 0,
        weightToday: weightRes.data?.weight_kg ?? null,
        loading: false,
      })
    }

    load()
    const handler = () => load()
    window.addEventListener(INVALIDATE_EVENT, handler)
    return () => {
      cancelled = true
      window.removeEventListener(INVALIDATE_EVENT, handler)
    }
  }, [])

  if (data.loading) {
    return (
      <div className="mt-2 h-9 animate-pulse rounded-full bg-warm-100 dark:bg-warm-800" />
    )
  }

  return (
    <Link
      href="/dashboard"
      className="mt-2 flex items-center justify-between gap-2 rounded-full border border-warm-200 bg-warm-50 px-3 py-1.5 text-xs text-warm-700 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:border-warm-700 dark:bg-warm-800 dark:text-warm-200 dark:hover:bg-primary-900/30"
    >
      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 leading-tight">
        <span>
          <strong>{Math.round(data.kcalConsumed)}</strong>
          {data.kcalTarget > 0 && (
            <span className="text-warm-500"> / {data.kcalTarget}</span>
          )}{' '}
          kcal
        </span>
        <span className="text-warm-400">·</span>
        <span>
          <strong>{data.mealsToday}</strong> pasti
        </span>
        {data.weightToday !== null && (
          <>
            <span className="text-warm-400">·</span>
            <span>
              <strong>{data.weightToday}</strong> kg
            </span>
          </>
        )}
      </span>
      <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
    </Link>
  )
}
