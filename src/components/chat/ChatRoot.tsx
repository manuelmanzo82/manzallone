'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronUp, AlertCircle } from 'lucide-react'
import type { ConversationMessage } from '@/lib/types'
import { ChatHeader } from './ChatHeader'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { MessageInput } from './MessageInput'

interface Props {
  userId: string
  conversationId: string
  initialMessages: ConversationMessage[]
  hasMore: boolean
  userName: string
  autoGreetDirective: string | null
}

interface UIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string | null
  pending?: boolean
}

const QUEUE_KEY = 'manzallone:chat:queue'

function toUI(m: ConversationMessage): UIMessage | null {
  if (m.role === 'system' || !m.content) return null
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.created_at,
  }
}

export function ChatRoot({
  userId,
  initialMessages,
  hasMore: initialHasMore,
  userName,
  autoGreetDirective,
}: Props) {
  const [messages, setMessages] = useState<UIMessage[]>(() =>
    initialMessages.map(toUI).filter((m): m is UIMessage => m !== null)
  )
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [toolsRunning, setToolsRunning] = useState(false)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [errorBanner, setErrorBanner] = useState<string | null>(null)
  const [online, setOnline] = useState(true)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const greetingFiredRef = useRef(false)

  // Track online state for queue/retry hint
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  // Auto-scroll to bottom on new messages/streaming
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length, streaming, toolsRunning])

  const sendMessage = useCallback(
    async (text: string, opts: { isGreeting?: boolean } = {}) => {
      const trimmed = text.trim()
      if (!trimmed) return
      if (streaming) return

      const tempUserId = `temp-${Date.now()}`
      const tempAssistantId = `temp-${Date.now()}-a`

      if (!opts.isGreeting) {
        setMessages((prev) => [
          ...prev,
          {
            id: tempUserId,
            role: 'user',
            content: trimmed,
            createdAt: new Date().toISOString(),
          },
          {
            id: tempAssistantId,
            role: 'assistant',
            content: '',
            createdAt: null,
            pending: true,
          },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: tempAssistantId,
            role: 'assistant',
            content: '',
            createdAt: null,
            pending: true,
          },
        ])
      }
      setStreaming(true)
      setErrorBanner(null)

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmed, isGreeting: opts.isGreeting }),
        })

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(
            res.status === 429
              ? 'Troppi messaggi, attendi qualche secondo.'
              : errBody.error ?? 'Errore di comunicazione con Claude.'
          )
        }

        if (!res.body) throw new Error('Nessuna risposta ricevuta.')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let accumulated = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const events = buffer.split('\n\n')
          buffer = events.pop() ?? ''
          for (const evt of events) {
            const line = evt.trim()
            if (!line.startsWith('data:')) continue
            const payload = line.slice(5).trim()
            if (!payload) continue
            let data: { type: string; text?: string; messageId?: string; createdAt?: string; message?: string }
            try {
              data = JSON.parse(payload)
            } catch {
              continue
            }
            if (data.type === 'text' && typeof data.text === 'string') {
              accumulated += data.text
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempAssistantId ? { ...m, content: accumulated, pending: true } : m
                )
              )
            } else if (data.type === 'tools_start') {
              setToolsRunning(true)
            } else if (data.type === 'tools_done') {
              setToolsRunning(false)
              // Any tool ran -> dashboard data may be stale.
              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('manzallone:data:invalidate')
                )
              }
            } else if (data.type === 'done') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempAssistantId
                    ? {
                        ...m,
                        id: data.messageId ?? m.id,
                        createdAt: data.createdAt ?? new Date().toISOString(),
                        pending: false,
                      }
                    : m
                )
              )
            } else if (data.type === 'error') {
              throw new Error(data.message ?? 'Errore sconosciuto da Claude.')
            }
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Errore'
        setErrorBanner(msg)
        // Remove pending assistant bubble
        setMessages((prev) => prev.filter((m) => m.id !== tempAssistantId))
        // Queue user message locally if offline
        if (!navigator.onLine && !opts.isGreeting) {
          const queue = readQueue()
          queue.push({ text: trimmed, at: Date.now() })
          writeQueue(queue)
        }
      } finally {
        setStreaming(false)
        setToolsRunning(false)
      }
    },
    [streaming]
  )

  // Fire auto-greeting once after mount (only if conditions met server-side)
  useEffect(() => {
    if (greetingFiredRef.current) return
    if (!autoGreetDirective) return
    greetingFiredRef.current = true
    sendMessage(autoGreetDirective, { isGreeting: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGreetDirective])

  // Flush local queue when coming back online
  useEffect(() => {
    if (!online) return
    const queue = readQueue()
    if (queue.length === 0) return
    writeQueue([])
    queue.forEach((q) => sendMessage(q.text))
  }, [online, sendMessage])

  // Quick-action "Pasto" dispatches a message to send through chat so Claude
  // can parse it with record_meal.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ text?: string }>).detail
      if (detail?.text) sendMessage(detail.text)
    }
    window.addEventListener('manzallone:chat:send', handler)
    return () => window.removeEventListener('manzallone:chat:send', handler)
  }, [sendMessage])

  async function loadOlder() {
    if (loadingOlder || !hasMore || messages.length === 0) return
    setLoadingOlder(true)
    try {
      const firstCreated = messages.find((m) => m.createdAt)?.createdAt
      if (!firstCreated) return
      const res = await fetch(
        `/api/chat/messages?before=${encodeURIComponent(firstCreated)}&limit=20`
      )
      const data: { messages: ConversationMessage[]; hasMore: boolean } = await res.json()
      const ui = data.messages.map(toUI).filter((m): m is UIMessage => m !== null)
      // Maintain scroll position
      const scroller = scrollerRef.current
      const prevHeight = scroller?.scrollHeight ?? 0
      setMessages((prev) => [...ui, ...prev])
      setHasMore(data.hasMore)
      requestAnimationFrame(() => {
        if (!scroller) return
        const newHeight = scroller.scrollHeight
        scroller.scrollTop = newHeight - prevHeight
      })
    } finally {
      setLoadingOlder(false)
    }
  }

  function handleSend() {
    const t = draft.trim()
    if (!t) return
    setDraft('')
    sendMessage(t)
  }

  function handleVoice(transcript: string) {
    // Either set into draft for review, or send straight away. Default: send if short.
    if (transcript.split(/\s+/).length <= 3) {
      setDraft(transcript)
    } else {
      setDraft(transcript)
    }
  }

  // Group avatar visibility: show avatar only on the first assistant msg in a run
  const enriched = messages.map((m, i) => {
    const prev = messages[i - 1]
    const showAvatar = m.role === 'assistant' && (!prev || prev.role !== 'assistant')
    return { ...m, showAvatar }
  })

  return (
    <div
      className="flex h-[100dvh] flex-col bg-warm-50 dark:bg-warm-950"
      style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
    >
      <ChatHeader userId={userId} />

      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-3 py-4">
          {hasMore && (
            <button
              type="button"
              onClick={loadOlder}
              disabled={loadingOlder}
              className="mx-auto inline-flex items-center gap-1 rounded-full border border-warm-200 bg-white px-3 py-1 text-xs text-warm-600 hover:bg-warm-100 disabled:opacity-50 dark:border-warm-700 dark:bg-warm-800 dark:text-warm-300"
            >
              <ChevronUp className="h-3 w-3" />
              {loadingOlder ? 'Carico…' : 'Carica messaggi precedenti'}
            </button>
          )}

          {enriched.length === 0 && !streaming && (
            <div className="mt-12 text-center text-sm text-warm-500">
              Ciao {userName.split(' ')[0]}, scrivi un messaggio per iniziare.
            </div>
          )}

          {enriched.map((m) => (
            <MessageBubble
              key={m.id}
              role={m.role}
              content={m.content}
              createdAt={m.createdAt}
              showAvatar={m.showAvatar}
            />
          ))}

          {streaming &&
            (toolsRunning ? (
              <TypingIndicator label="sto eseguendo…" />
            ) : (
              !enriched.some((m) => m.pending && m.content.length > 0) && (
                <TypingIndicator />
              )
            ))}
        </div>
      </div>

      {errorBanner && (
        <div className="mx-auto w-full max-w-2xl px-3">
          <div className="mb-1 flex items-center gap-2 rounded-lg bg-danger-50 px-3 py-2 text-xs text-danger-700 dark:bg-danger-500/10">
            <AlertCircle className="h-3.5 w-3.5" />
            {errorBanner}
            <button
              className="ml-auto text-danger-700 underline"
              onClick={() => setErrorBanner(null)}
            >
              chiudi
            </button>
          </div>
        </div>
      )}

      {!online && (
        <div className="mx-auto w-full max-w-2xl px-3 pb-1 text-center text-xs text-warm-500">
          Offline — i messaggi verranno inviati al ritorno della connessione.
        </div>
      )}

      <div className="border-t border-warm-200 bg-white/95 backdrop-blur dark:border-warm-800 dark:bg-warm-900/95">
        <div className="mx-auto w-full max-w-2xl">
          <MessageInput
            value={draft}
            onChange={setDraft}
            onSend={handleSend}
            onVoice={handleVoice}
            disabled={streaming}
          />
        </div>
      </div>
    </div>
  )
}

// ---- local offline queue ----

interface QueuedMessage {
  text: string
  at: number
}

function readQueue(): QueuedMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(q: QueuedMessage[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
  } catch {
    /* ignore quota */
  }
}
