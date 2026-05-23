'use client'

import { useEffect, useRef, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { cn } from '@/lib/cn'
import { VoiceButton } from './VoiceButton'

interface Props {
  value: string
  onChange: (v: string) => void
  onSend: () => void
  onVoice: (t: string) => void
  disabled?: boolean
  placeholder?: string
}

export function MessageInput({
  value,
  onChange,
  onSend,
  onVoice,
  disabled,
  placeholder = 'Scrivi a Claude…',
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  // Autoresize
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [value])

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) onSend()
    }
  }

  return (
    <div className="flex items-end gap-2 px-3 pb-3 pt-1">
      <div className="flex-1">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className={cn(
            'block w-full resize-none rounded-2xl border border-warm-300 bg-white px-4 py-2.5 text-[15px] text-warm-900 placeholder:text-warm-400 shadow-sm',
            'focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500',
            'dark:border-warm-700 dark:bg-warm-800 dark:text-warm-50',
            'disabled:opacity-60'
          )}
        />
      </div>
      <VoiceButton onTranscript={onVoice} disabled={disabled} />
      <button
        type="button"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        aria-label="Invia messaggio"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm transition hover:bg-primary-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-primary-300"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  )
}
