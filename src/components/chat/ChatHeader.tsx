import { Sparkles } from 'lucide-react'
import { ChatDailyBanner } from './ChatDailyBanner'

export function ChatHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-warm-200 bg-white/80 backdrop-blur-md dark:border-warm-800 dark:bg-warm-900/80">
      <div className="mx-auto w-full max-w-2xl px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-semibold text-warm-900 dark:text-warm-50">
              Claude
            </div>
            <div className="flex items-center gap-1 text-xs text-success-600">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-success-500" />
              online
            </div>
          </div>
        </div>
        <ChatDailyBanner />
      </div>
    </header>
  )
}
