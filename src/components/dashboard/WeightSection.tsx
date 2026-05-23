'use client'

import { useMemo, useState } from 'react'
import { Scale, Plus, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { addDays, toIsoDate } from '@/hooks/useDashboardData'
import { createClient } from '@/lib/supabase/client'
import { invalidateDashboardCache } from '@/hooks/useDashboardData'
import type { WeightHistoryRow } from '@/lib/types'

interface Props {
  userId: string
  weekStart: Date
  weights: WeightHistoryRow[]
  targetWeight: number | null
  currentWeight: number | null
  loading: boolean
  onLogged: () => void
}

const DOW_IT = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']

export function WeightSection({
  userId,
  weekStart,
  weights,
  targetWeight,
  currentWeight,
  loading,
  onLogged,
}: Props) {
  const [open, setOpen] = useState(false)

  const series = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i)
      const iso = toIsoDate(day)
      const row = weights.find((w) => w.date === iso)
      return {
        date: iso,
        label: DOW_IT[i],
        weight: row?.weight_kg ?? null,
        delta: row?.delta_from_previous ?? null,
      }
    })
  }, [weekStart, weights])

  const values = series
    .map((s) => s.weight)
    .filter((v): v is number => v !== null)

  const min = values.length ? Math.min(...values) : null
  const max = values.length ? Math.max(...values) : null
  const avg =
    values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : null

  const last = [...series].reverse().find((s) => s.weight !== null)
  const lastDelta = last?.delta ?? null

  const yDomain: [number, number] | undefined = useMemo(() => {
    if (!values.length && targetWeight == null) return undefined
    const all = [...values]
    if (targetWeight != null) all.push(targetWeight)
    const lo = Math.min(...all) - 1
    const hi = Math.max(...all) + 1
    return [Math.floor(lo), Math.ceil(hi)]
  }, [values, targetWeight])

  if (loading) {
    return (
      <div className="h-60 animate-pulse rounded-2xl border border-warm-200 bg-warm-100 dark:border-warm-800 dark:bg-warm-900" />
    )
  }

  return (
    <section className="rounded-2xl border border-warm-200 bg-white p-4 shadow-sm dark:border-warm-800 dark:bg-warm-900">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary-600 dark:text-primary-300" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-warm-600 dark:text-warm-300">
            Peso
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded-full bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-700 active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
          Registra
        </button>
      </header>

      <div className="flex items-end gap-3">
        <div className="text-4xl font-bold text-warm-900 dark:text-warm-50">
          {currentWeight != null ? `${currentWeight.toFixed(1)}` : '—'}
        </div>
        <div className="pb-1 text-sm text-warm-500">kg</div>
        {lastDelta !== null && lastDelta !== 0 && (
          <DeltaPill delta={lastDelta} />
        )}
        {lastDelta === 0 && (
          <span className="pb-1 inline-flex items-center gap-1 text-xs text-warm-500">
            <Minus className="h-3 w-3" />
            invariato
          </span>
        )}
      </div>
      {targetWeight != null && currentWeight != null && (
        <div className="mt-1 text-xs text-warm-500">
          Target {targetWeight} kg · mancano{' '}
          <span className="font-medium text-warm-700 dark:text-warm-200">
            {Math.max(currentWeight - targetWeight, 0).toFixed(1)} kg
          </span>
        </div>
      )}

      {values.length === 0 ? (
        <EmptyWeightChart onAdd={() => setOpen(true)} />
      ) : (
        <>
          <div className="mt-4 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={series}
                margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(120,113,108,0.15)"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  axisLine={false}
                  tickLine={false}
                  className="text-warm-500"
                />
                <YAxis
                  domain={yDomain}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                  className="text-warm-500"
                />
                <Tooltip
                  cursor={{ stroke: '#0d9488', strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const p = payload[0].payload as (typeof series)[number]
                    if (p.weight === null) return null
                    return (
                      <div className="rounded-lg border border-warm-200 bg-white px-2 py-1.5 text-xs shadow-md dark:border-warm-700 dark:bg-warm-800">
                        <div className="font-semibold text-warm-900 dark:text-warm-50">
                          {p.weight} kg
                        </div>
                        {p.delta !== null && p.delta !== 0 && (
                          <div
                            className={
                              p.delta < 0
                                ? 'text-success-600'
                                : 'text-danger-600'
                            }
                          >
                            {p.delta > 0 ? '+' : ''}
                            {p.delta} kg vs precedente
                          </div>
                        )}
                      </div>
                    )
                  }}
                />
                {targetWeight != null && (
                  <ReferenceLine
                    y={targetWeight}
                    stroke="#ea580c"
                    strokeDasharray="4 4"
                    label={{
                      value: `target ${targetWeight}`,
                      position: 'right',
                      fill: '#ea580c',
                      fontSize: 10,
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  connectNulls={false}
                  dot={{ r: 3.5, fill: '#0d9488', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <dl className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Media" value={avg ? `${avg.toFixed(1)} kg` : '—'} />
            <Stat label="Min" value={min !== null ? `${min.toFixed(1)} kg` : '—'} />
            <Stat label="Max" value={max !== null ? `${max.toFixed(1)} kg` : '—'} />
          </dl>
        </>
      )}

      {open && (
        <WeightLogModal
          userId={userId}
          currentWeight={currentWeight}
          onClose={() => setOpen(false)}
          onSaved={() => {
            invalidateDashboardCache()
            onLogged()
            setOpen(false)
          }}
        />
      )}
    </section>
  )
}

function DeltaPill({ delta }: { delta: number }) {
  const down = delta < 0
  const Icon = down ? TrendingDown : TrendingUp
  return (
    <span
      className={[
        'pb-1 inline-flex items-center gap-1 text-xs font-medium',
        down ? 'text-success-600' : 'text-danger-600',
      ].join(' ')}
    >
      <Icon className="h-3.5 w-3.5" />
      {delta > 0 ? '+' : ''}
      {delta.toFixed(1)} kg
    </span>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-warm-100 px-2 py-1.5 dark:bg-warm-800">
      <div className="text-[10px] uppercase tracking-wider text-warm-500">
        {label}
      </div>
      <div className="text-sm font-semibold text-warm-900 dark:text-warm-50">
        {value}
      </div>
    </div>
  )
}

function EmptyWeightChart({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-warm-300 bg-warm-50 p-5 text-center dark:border-warm-700 dark:bg-warm-800/50">
      <div className="text-sm text-warm-600 dark:text-warm-300">
        Nessun peso registrato questa settimana.
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline dark:text-primary-300"
      >
        Registra il primo →
      </button>
    </div>
  )
}

function WeightLogModal({
  userId,
  currentWeight,
  onClose,
  onSaved,
}: {
  userId: string
  currentWeight: number | null
  onClose: () => void
  onSaved: () => void
}) {
  const [value, setValue] = useState<string>(
    currentWeight != null ? String(currentWeight) : ''
  )
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setErr(null)
    const n = Number(value.replace(',', '.'))
    if (!Number.isFinite(n) || n < 30 || n > 300) {
      setErr('Inserisci un peso plausibile (30–300 kg).')
      return
    }
    setBusy(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.rpc('log_weight_and_recalculate', {
        p_user_id: userId,
        p_weight: n,
        p_notes: null,
      })
      if (error) throw error
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Errore di salvataggio')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-warm-900/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-warm-200 bg-white p-5 shadow-xl dark:border-warm-700 dark:bg-warm-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-warm-900 dark:text-warm-50">
          Registra peso
        </h3>
        <p className="mt-1 text-xs text-warm-500">
          Misura del giorno. Verrà usata anche per ricalcolare i target.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-lg font-semibold text-warm-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-warm-700 dark:bg-warm-800 dark:text-warm-50"
            placeholder="89.2"
            autoFocus
          />
          <span className="text-warm-500">kg</span>
        </div>
        {err && (
          <div className="mt-2 text-xs text-danger-600">{err}</div>
        )}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-warm-200 px-3 py-2 text-sm font-medium text-warm-700 hover:bg-warm-100 dark:border-warm-700 dark:text-warm-200 dark:hover:bg-warm-800"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="flex-1 rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {busy ? 'Salvo…' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  )
}
