'use client'

import { Sparkles } from 'lucide-react'

export function TypingIndicator({ label }: { label?: string }) {
  return (
    <div className="flex w-full items-end gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-warm-200 dark:bg-warm-800 dark:ring-warm-700">
        <div className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-warm-400 [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-warm-400 [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-warm-400" />
        </div>
        {label && <span className="text-xs text-warm-500">{label}</span>}
      </div>
    </div>
  )
}
