'use client'

import { type ChangeEvent } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/cn'

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
  disabled?: boolean
  className?: string
}

export function TimePicker({ value, onChange, label, disabled, className }: TimePickerProps) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-warm-800 dark:text-warm-200">
          {label}
        </label>
      )}
      <div className="relative">
        <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-400" />
        <input
          type="time"
          value={value}
          disabled={disabled}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          className={cn(
            'block w-full rounded-xl border border-warm-300 bg-white py-3 pl-9 pr-3 text-base text-warm-900',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'dark:border-warm-700 dark:bg-warm-900 dark:text-warm-50',
            disabled && 'cursor-not-allowed opacity-60'
          )}
        />
      </div>
    </div>
  )
}
