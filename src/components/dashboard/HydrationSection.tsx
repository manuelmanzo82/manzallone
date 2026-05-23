'use client'

import { useMemo, useState } from 'react'
import { Droplet } from 'lucide-react'
import { addDays, invalidateDashboardCache, toIsoDate } from '@/hooks/useDashboardData'
import { createClient } from '@/lib/supabase/client'
import type { WaterRow } from '@/lib/types'

interface Props {
  userId: string
  weekStart: Date
  water: WaterRow[]
  targetMl: number
  loading: boolean
  onLogged: () => void
}

const DOW_IT = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']

export function HydrationSection({
  userId,
  weekStart,
  water,
  targetMl,
  loading,
  onLogged,
}: Props) {
  const [busy, setBusy] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const todayIso = toIsoDate(new Date())
  const today = water.find((w) => w.date === todayIso)
  const consumed = today?.total_ml ?? 0
  const pct = targetMl > 0 ? Math.min(consumed / targetMl, 1) : 0

  const series = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i)
      const iso = toIsoDate(day)
      const ml = water.find((w) => w.date === iso)?.total_ml ?? 0
      return { iso, label: DOW_IT[i], ml }
    })
  }, [weekStart, water])

  async function add(ml: number) {
    setErr(null)
    setBusy(ml)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('water').insert({
        user_id: userId,
        ml,
      })
      if (error) throw error
      invalidateDashboardCache()
      onLogged()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Errore di salvataggio')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="h-44 animate-pulse rounded-2xl border border-warm-200 bg-warm-100 dark:border-warm-800 dark:bg-warm-900" />
    )
  }

  return (
    <section className="rounded-2xl border border-warm-200 bg-white p-4 shadow-sm dark:border-warm-800 dark:bg-warm-900">
      <header className="mb-3 flex items-center gap-2">
        <Droplet className="h-4 w-4 text-sky-500" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-warm-600 dark:text-warm-300">
          Acqua
        </h2>
      </header>

      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <span className="text-2xl font-bold text-warm-900 dark:text-warm-50">
            {(consumed / 1000).toFixed(1)}
          </span>{' '}
          <span className="text-sm text-warm-500">
            / {(targetMl / 1000).toFixed(1)} L
          </span>
        </div>
        <span className="text-xs text-warm-500">
          {Math.round(pct * 100)}%
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-warm-200 dark:bg-warm-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600 transition-[width] duration-700"
          style={{ width: `${pct * 100}%` }}
        />
      </div>

      <div className="mt-3 flex gap-2">
        {[250, 500, 750].map((ml) => (
          <button
            key={ml}
            type="button"
            onClick={() => add(ml)}
            disabled={busy !== null}
            className="flex-1 rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100 active:scale-95 disabled:opacity-50 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300"
          >
            {busy === ml ? '…' : `+${ml} ml`}
          </button>
        ))}
      </div>
      {err && <div className="mt-2 text-xs text-danger-600">{err}</div>}

      <div className="mt-4">
        <div className="mb-1 text-[11px] uppercase tracking-wide text-warm-500">
          Settimana
        </div>
        <div className="flex h-20 items-end gap-1">
          {series.map((d) => {
            const h = targetMl > 0 ? Math.min(d.ml / targetMl, 1) * 100 : 0
            return (
              <div key={d.iso} className="flex flex-1 flex-col items-center">
                <div className="flex h-16 w-full items-end overflow-hidden rounded-md bg-warm-100 dark:bg-warm-800">
                  <div
                    className="w-full rounded-md bg-gradient-to-t from-sky-500 to-sky-300 transition-[height] duration-700"
                    style={{ height: `${h}%` }}
                  />
                </div>
                <div className="mt-1 text-[10px] text-warm-500">{d.label}</div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
