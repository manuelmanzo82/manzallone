'use client'

import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props {
  role: 'user' | 'assistant'
  content: string
  createdAt?: string | null
  showAvatar?: boolean
  imageUrl?: string | null
  imageLoading?: boolean
}

export function MessageBubble({
  role,
  content,
  createdAt,
  showAvatar,
  imageUrl,
  imageLoading,
}: Props) {
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
        {imageUrl && (
          <div
            className={cn(
              'relative overflow-hidden rounded-2xl shadow-sm',
              isUser ? 'rounded-br-sm' : 'rounded-bl-sm'
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="screenshot"
              className="block max-h-72 max-w-full object-cover"
            />
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                <div className="flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-warm-700 shadow">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary-600 border-r-transparent" />
                  Analisi in corso…
                </div>
              </div>
            )}
          </div>
        )}
        {content && (
          <div
            className={cn(
              'whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm',
              isUser
                ? 'rounded-br-sm bg-primary-600 text-white'
                : 'rounded-bl-sm bg-white text-warm-900 ring-1 ring-warm-200 dark:bg-warm-800 dark:text-warm-50 dark:ring-warm-700'
            )}
          >
            {content}
          </div>
        )}
        {time && (
          <div className="px-1 text-[10px] text-warm-500">{time}</div>
        )}
      </div>
    </div>
  )
}
