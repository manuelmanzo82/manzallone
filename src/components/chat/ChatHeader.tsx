'use client'

import { useCallback, useRef, useState } from 'react'
import {
  Dumbbell,
  Droplet,
  Scale,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import { ChatDailyBanner } from './ChatDailyBanner'
import { QuickActionModal, type QuickActionKind } from './QuickActionModal'

interface Props {
  userId: string
}

const ACTIONS: { kind: QuickActionKind; Icon: LucideIcon; label: string }[] = [
  { kind: 'weight',  Icon: Scale,            label: 'Peso' },
  { kind: 'water',   Icon: Droplet,          label: 'Acqua' },
  { kind: 'meal',    Icon: UtensilsCrossed,  label: 'Pasto' },
  { kind: 'workout', Icon: Dumbbell,         label: 'Allenamento' },
]

export function ChatHeader({ userId }: Props) {
  const [openKind, setOpenKind] = useState<QuickActionKind | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2500)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-warm-200 bg-white/80 backdrop-blur-md dark:border-warm-800 dark:bg-warm-900/80">
        <div className="mx-auto w-full max-w-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="text-base font-semibold text-warm-900 dark:text-warm-50">
                Claude
              </div>
              <div className="flex items-center gap-1 text-xs text-success-600">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-success-500" />
                online
              </div>
            </div>
            <div className="flex flex-1 items-center justify-end gap-1.5 sm:gap-2">
              {ACTIONS.map(({ kind, Icon, label }) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setOpenKind(kind)}
                  aria-label={label}
                  title={label}
                  className="group relative inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-warm-600 transition hover:bg-primary-50 hover:text-primary-700 active:scale-95 dark:text-warm-300 dark:hover:bg-primary-900/30 dark:hover:text-primary-300 sm:h-10 sm:w-10"
                >
                  <Icon className="h-5 w-5" />
                  <span className="pointer-events-none absolute top-full z-30 mt-1 hidden whitespace-nowrap rounded-md bg-warm-900 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity sm:group-hover:block sm:group-hover:opacity-100 dark:bg-warm-100 dark:text-warm-900">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <ChatDailyBanner />
        </div>
      </header>

      {openKind && (
        <QuickActionModal
          kind={openKind}
          userId={userId}
          onClose={() => setOpenKind(null)}
          onSuccess={(msg) => {
            setOpenKind(null)
            showToast(msg)
          }}
        />
      )}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div className="pointer-events-auto rounded-full bg-success-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
            ✓ {toast}
          </div>
        </div>
      )}
    </>
  )
}
