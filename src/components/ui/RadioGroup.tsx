'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface RadioOption<T extends string = string> {
  value: T
  label: string
  description?: string
}

interface RadioGroupProps<T extends string> {
  name: string
  value: T | null
  onChange: (value: T) => void
  options: ReadonlyArray<RadioOption<T>>
  label?: string
  hint?: string
  columns?: 1 | 2
}

export function RadioGroup<T extends string>({
  name,
  value,
  onChange,
  options,
  label,
  hint,
  columns = 1,
}: RadioGroupProps<T>) {
  return (
    <fieldset className="w-full">
      {label && (
        <legend className="mb-2 text-sm font-medium text-warm-800 dark:text-warm-200">
          {label}
        </legend>
      )}
      <div
        className={cn(
          'grid gap-2',
          columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1'
        )}
      >
        {options.map((opt) => {
          const selected = value === opt.value
          return (
            <label
              key={opt.value}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition-all',
                selected
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                  : 'border-warm-200 bg-white hover:border-warm-300 dark:border-warm-700 dark:bg-warm-800'
              )}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={selected}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              <span
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  selected
                    ? 'border-primary-600 bg-primary-600'
                    : 'border-warm-300 bg-white dark:bg-warm-700'
                )}
              >
                {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </span>
              <span className="flex-1">
                <span className="block font-medium text-warm-900 dark:text-warm-50">
                  {opt.label}
                </span>
                {opt.description && (
                  <span className="mt-0.5 block text-sm text-warm-600 dark:text-warm-400">
                    {opt.description}
                  </span>
                )}
              </span>
            </label>
          )
        })}
      </div>
      {hint && (
        <p className="mt-2 text-xs text-warm-500 dark:text-warm-400">{hint}</p>
      )}
    </fieldset>
  )
}
