'use client'

import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props {
  role: 'user' | 'assistant'
  content: string
  createdAt?: string | null
  showAvatar?: boolean
}

export function MessageBubble({ role, content, createdAt, showAvatar }: Props) {
  const isUser = role === 'user'
  const time = createdAt
    ? new Date(createdAt).toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  return (
    <div
      className={cn(
        'flex w-full items-end gap-2',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white',
            showAvatar ? 'opacity-100' : 'invisible'
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      )}
      <div
        className={cn(
          'flex max-w-[80%] flex-col gap-1',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm',
            isUser
              ? 'rounded-br-sm bg-primary-600 text-white'
              : 'rounded-bl-sm bg-white text-warm-900 ring-1 ring-warm-200 dark:bg-warm-800 dark:text-warm-50 dark:ring-warm-700'
          )}
        >
          {content || ' '}
        </div>
        {time && (
          <div className="px-1 text-[10px] text-warm-500">{time}</div>
        )}
      </div>
    </div>
  )
}
