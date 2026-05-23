'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}

export function Checkbox({ checked, onChange, label, description, disabled }: CheckboxProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-all',
        checked
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
          : 'border-warm-200 bg-white hover:border-warm-300 dark:border-warm-700 dark:bg-warm-800',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
      <span
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
          checked
            ? 'border-primary-600 bg-primary-600'
            : 'border-warm-300 bg-white dark:bg-warm-700'
        )}
      >
        {checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-medium text-warm-900 dark:text-warm-50">
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs text-warm-600 dark:text-warm-400">
            {description}
          </span>
        )}
      </span>
    </label>
  )
}
