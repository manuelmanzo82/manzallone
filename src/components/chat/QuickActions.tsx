'use client'

import { Scale, Droplet, Utensils, Dumbbell } from 'lucide-react'

interface Props {
  onPick: (prompt: string) => void
  disabled?: boolean
}

const actions = [
  { key: 'peso', label: 'Peso', icon: Scale, prompt: 'Voglio registrare il peso di oggi: ' },
  { key: 'acqua', label: 'Acqua', icon: Droplet, prompt: 'Registra 250 ml di acqua.' },
  { key: 'pasto', label: 'Pasto', icon: Utensils, prompt: 'Ho appena mangiato: ' },
  { key: 'allenamento', label: 'Allenamento', icon: Dumbbell, prompt: 'Ho fatto un allenamento: ' },
] as const

export function QuickActions({ onPick, disabled }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2 px-3 pb-2">
      {actions.map(({ key, label, icon: Icon, prompt }) => (
        <button
          key={key}
          type="button"
          onClick={() => onPick(prompt)}
          disabled={disabled}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-warm-200 bg-white px-2 py-2.5 text-xs font-medium text-warm-700 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 active:scale-95 disabled:opacity-50 dark:border-warm-700 dark:bg-warm-800 dark:text-warm-200 dark:hover:border-primary-500 dark:hover:bg-primary-900/30"
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  )
}
