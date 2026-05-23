'use client'

import { type ChangeEvent } from 'react'

interface SliderProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  label?: string
  unit?: string
  formatValue?: (v: number) => string
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step,
  label,
  unit,
  formatValue,
}: SliderProps) {
  const displayValue = formatValue ? formatValue(value) : `${value}${unit ? ` ${unit}` : ''}`

  return (
    <div className="w-full">
      {label && (
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-warm-800 dark:text-warm-200">{label}</label>
          <span className="rounded-lg bg-primary-100 px-3 py-1 text-sm font-semibold text-primary-800 dark:bg-primary-900/40 dark:text-primary-200">
            {displayValue}
          </span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(parseFloat(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-warm-200 accent-primary-600 dark:bg-warm-700"
      />
      <div className="mt-1 flex justify-between text-xs text-warm-500">
        <span>
          {min}
          {unit ? ` ${unit}` : ''}
        </span>
        <span>
          {max}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
    </div>
  )
}
