'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, startOfWeekMonday } from '@/hooks/useDashboardData'

interface Props {
  weekStart: Date
  onChange: (next: Date) => void
  isCurrentWeek: boolean
  trackedDays: number | null
}

const MONTHS_IT = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
]

function formatRange(weekStart: Date): string {
  const end = addDays(weekStart, 6)
  const sMonth = weekStart.getMonth()
  const eMonth = end.getMonth()
  if (sMonth === eMonth) {
    return `${weekStart.getDate()}–${end.getDate()} ${MONTHS_IT[sMonth]}`
  }
  return `${weekStart.getDate()} ${MONTHS_IT[sMonth].slice(0, 3)} – ${end.getDate()} ${MONTHS_IT[eMonth].slice(0, 3)}`
}

export function WeekSummary({
  weekStart,
  onChange,
  isCurrentWeek,
  trackedDays,
}: Props) {
  const today = startOfWeekMonday(new Date())
  const isFuture = weekStart.getTime() >= today.getTime()

  return (
    <div className="flex items-center justify-between rounded-2xl border border-warm-200 bg-white px-3 py-2 dark:border-warm-800 dark:bg-warm-900">
      <button
        type="button"
        aria-label="Settimana precedente"
        onClick={() => onChange(addDays(weekStart, -7))}
        className="flex h-11 w-11 items-center justify-center rounded-full text-warm-600 hover:bg-warm-100 active:scale-95 dark:text-warm-300 dark:hover:bg-warm-800"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="flex flex-col items-center text-center">
        <div
          className={[
            'text-sm font-semibold',
            isCurrentWeek
              ? 'text-primary-700 dark:text-primary-300'
              : 'text-warm-900 dark:text-warm-50',
          ].join(' ')}
        >
          {isCurrentWeek ? 'Questa settimana' : formatRange(weekStart)}
        </div>
        <div className="text-[11px] text-warm-500">
          {isCurrentWeek
            ? formatRange(weekStart)
            : ''}
          {trackedDays !== null && (
            <span>
              {isCurrentWeek ? ' · ' : ''}
              {trackedDays}/7 giorni tracciati
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        aria-label="Settimana successiva"
        onClick={() => !isFuture && onChange(addDays(weekStart, 7))}
        disabled={isFuture}
        className="flex h-11 w-11 items-center justify-center rounded-full text-warm-600 hover:bg-warm-100 active:scale-95 disabled:opacity-30 dark:text-warm-300 dark:hover:bg-warm-800"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}
