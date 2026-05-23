import Link from 'next/link'
import { Sparkles, User } from 'lucide-react'

export function ChatHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-warm-200 bg-white/80 backdrop-blur-md dark:border-warm-800 dark:bg-warm-900/80">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
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
        <Link
          href="/profile"
          aria-label="Profilo"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-warm-600 hover:bg-warm-100 dark:text-warm-300 dark:hover:bg-warm-800"
        >
          <User className="h-5 w-5" />
        </Link>
      </div>
    </header>
  )
}
