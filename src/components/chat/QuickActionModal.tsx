'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { invalidateDashboardCache } from '@/hooks/useDashboardData'

export type QuickActionKind = 'weight' | 'water' | 'meal' | 'workout'

interface Props {
  kind: QuickActionKind
  userId: string
  onClose: () => void
  onSuccess: (toastMessage: string) => void
}

const CHAT_SEND_EVENT = 'manzallone:chat:send'

export function QuickActionModal({ kind, userId, onClose, onSuccess }: Props) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-warm-900/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-warm-200 bg-white p-5 shadow-xl dark:border-warm-700 dark:bg-warm-900"
        onClick={(e) => e.stopPropagation()}
      >
        {kind === 'weight' && (
          <WeightForm userId={userId} onClose={onClose} onSuccess={onSuccess} />
        )}
        {kind === 'water' && (
          <WaterForm userId={userId} onClose={onClose} onSuccess={onSuccess} />
        )}
        {kind === 'meal' && (
          <MealForm onClose={onClose} onSuccess={onSuccess} />
        )}
        {kind === 'workout' && (
          <WorkoutForm userId={userId} onClose={onClose} onSuccess={onSuccess} />
        )}
      </div>
    </div>
  )
}

// ---- Weight ----

function WeightForm({
  userId,
  onClose,
  onSuccess,
}: {
  userId: string
  onClose: () => void
  onSuccess: (msg: string) => void
}) {
  const [value, setValue] = useState('')
  const [notes, setNotes] = useState('')
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
        p_notes: notes.trim() || null,
      })
      if (error) throw error
      invalidateDashboardCache()
      onSuccess(`Peso ${n} kg salvato`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Errore di salvataggio')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Form
      title="Registra peso"
      hint="Misura del giorno. Verrà usata anche per ricalcolare i target."
      onClose={onClose}
      onSave={save}
      busy={busy}
      err={err}
    >
      <div className="flex items-center gap-2">
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
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Nota (opzionale)"
        className="mt-2 w-full rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-warm-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-warm-700 dark:bg-warm-800 dark:text-warm-200"
      />
    </Form>
  )
}

// ---- Water ----

function WaterForm({
  userId,
  onClose,
  onSuccess,
}: {
  userId: string
  onClose: () => void
  onSuccess: (msg: string) => void
}) {
  const [ml, setMl] = useState<number | ''>(250)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setErr(null)
    const n = typeof ml === 'number' ? ml : Number(ml)
    if (!Number.isFinite(n) || n <= 0 || n > 5000) {
      setErr('Quantità non valida (1–5000 ml).')
      return
    }
    setBusy(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('water')
        .insert({ user_id: userId, ml: n })
      if (error) throw error
      invalidateDashboardCache()
      onSuccess(`+${n} ml di acqua`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Errore di salvataggio')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Form
      title="Registra acqua"
      onClose={onClose}
      onSave={save}
      busy={busy}
      err={err}
    >
      <div className="grid grid-cols-3 gap-2">
        {[250, 500, 750].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setMl(preset)}
            className={[
              'rounded-xl border px-3 py-2 text-sm font-semibold transition',
              ml === preset
                ? 'border-sky-500 bg-sky-100 text-sky-700 dark:border-sky-400 dark:bg-sky-500/20 dark:text-sky-200'
                : 'border-warm-200 bg-warm-50 text-warm-700 hover:border-sky-300 dark:border-warm-700 dark:bg-warm-800 dark:text-warm-200',
            ].join(' ')}
          >
            {preset} ml
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          step="50"
          value={ml}
          onChange={(e) =>
            setMl(e.target.value === '' ? '' : Number(e.target.value))
          }
          placeholder="Custom"
          className="flex-1 rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-base text-warm-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-warm-700 dark:bg-warm-800 dark:text-warm-50"
        />
        <span className="text-warm-500">ml</span>
      </div>
    </Form>
  )
}

// ---- Meal (envia messaggio in chat, Claude usa record_meal) ----

const MEAL_TYPES: { value: string; label: string }[] = [
  { value: 'breakfast', label: 'Colazione' },
  { value: 'morning_snack', label: 'Spuntino mattina' },
  { value: 'lunch', label: 'Pranzo' },
  { value: 'afternoon_snack', label: 'Spuntino pomeriggio' },
  { value: 'dinner', label: 'Cena' },
  { value: 'evening_snack', label: 'Spuntino serale' },
]

function MealForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: (msg: string) => void
}) {
  const [type, setType] = useState<string>(suggestMealType())
  const [text, setText] = useState('')
  const [err, setErr] = useState<string | null>(null)

  function send() {
    setErr(null)
    const t = text.trim()
    if (!t) {
      setErr('Descrivi cosa hai mangiato.')
      return
    }
    const typeLabel =
      MEAL_TYPES.find((m) => m.value === type)?.label.toLowerCase() ?? 'pasto'
    const message = `Per ${typeLabel} ho mangiato: ${t}`
    window.dispatchEvent(
      new CustomEvent(CHAT_SEND_EVENT, { detail: { text: message } })
    )
    onSuccess('Pasto inviato in chat')
  }

  return (
    <Form
      title="Registra pasto"
      hint="Verrà analizzato in chat per calcolare macro e kcal."
      onClose={onClose}
      onSave={send}
      saveLabel="Invia in chat"
      busy={false}
      err={err}
    >
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="w-full rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-warm-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-warm-700 dark:bg-warm-800 dark:text-warm-50"
      >
        {MEAL_TYPES.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        autoFocus
        placeholder="es. 150g pollo grigliato, 80g riso, insalata mista"
        className="mt-2 w-full rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-warm-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-warm-700 dark:bg-warm-800 dark:text-warm-50"
      />
    </Form>
  )
}

// ---- Workout ----

function WorkoutForm({
  userId,
  onClose,
  onSuccess,
}: {
  userId: string
  onClose: () => void
  onSuccess: (msg: string) => void
}) {
  const [type, setType] = useState('Corsa')
  const [duration, setDuration] = useState<number | ''>(30)
  const [distance, setDistance] = useState<number | ''>('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setErr(null)
    const dur = typeof duration === 'number' ? duration : Number(duration)
    if (!type.trim()) {
      setErr('Indica il tipo di allenamento.')
      return
    }
    if (!Number.isFinite(dur) || dur <= 0 || dur > 600) {
      setErr('Durata non valida (1–600 min).')
      return
    }
    const dist =
      distance === '' ? null : Number(distance)
    if (dist !== null && (!Number.isFinite(dist) || dist < 0 || dist > 500)) {
      setErr('Distanza non valida (0–500 km).')
      return
    }
    setBusy(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('workouts').insert({
        user_id: userId,
        type: type.trim(),
        duration_min: dur,
        distance_km: dist,
        source: 'manual',
      })
      if (error) throw error
      invalidateDashboardCache()
      onSuccess(`${type.trim()} salvato`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Errore di salvataggio')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Form
      title="Registra allenamento"
      onClose={onClose}
      onSave={save}
      busy={busy}
      err={err}
    >
      <input
        type="text"
        value={type}
        onChange={(e) => setType(e.target.value)}
        placeholder="es. Corsa, Palestra, Bici"
        className="w-full rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-warm-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-warm-700 dark:bg-warm-800 dark:text-warm-50"
      />
      <div className="mt-2 flex gap-2">
        <label className="flex flex-1 flex-col text-xs text-warm-500">
          Durata (min)
          <input
            type="number"
            inputMode="numeric"
            step="5"
            value={duration}
            onChange={(e) =>
              setDuration(e.target.value === '' ? '' : Number(e.target.value))
            }
            className="mt-0.5 rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-base text-warm-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-warm-700 dark:bg-warm-800 dark:text-warm-50"
          />
        </label>
        <label className="flex flex-1 flex-col text-xs text-warm-500">
          Distanza km (opz.)
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={distance}
            onChange={(e) =>
              setDistance(e.target.value === '' ? '' : Number(e.target.value))
            }
            className="mt-0.5 rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-base text-warm-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-warm-700 dark:bg-warm-800 dark:text-warm-50"
          />
        </label>
      </div>
    </Form>
  )
}

// ---- Shared form chrome ----

function Form({
  title,
  hint,
  onClose,
  onSave,
  saveLabel = 'Salva',
  busy,
  err,
  children,
}: {
  title: string
  hint?: string
  onClose: () => void
  onSave: () => void
  saveLabel?: string
  busy: boolean
  err: string | null
  children: React.ReactNode
}) {
  return (
    <>
      <h3 className="text-base font-semibold text-warm-900 dark:text-warm-50">
        {title}
      </h3>
      {hint && <p className="mt-1 text-xs text-warm-500">{hint}</p>}
      <div className="mt-4">{children}</div>
      {err && <div className="mt-2 text-xs text-danger-600">{err}</div>}
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
          onClick={onSave}
          disabled={busy}
          className="flex-1 rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {busy ? 'Salvo…' : saveLabel}
        </button>
      </div>
    </>
  )
}

function suggestMealType(): string {
  const h = new Date().getHours()
  if (h < 10) return 'breakfast'
  if (h < 12) return 'morning_snack'
  if (h < 15) return 'lunch'
  if (h < 18) return 'afternoon_snack'
  if (h < 22) return 'dinner'
  return 'evening_snack'
}
