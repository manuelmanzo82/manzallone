import Link from 'next/link'
import { type ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-warm-50 via-primary-50/30 to-warm-100 dark:from-warm-900 dark:via-primary-900/20 dark:to-warm-900">
      <header className="px-6 py-6">
        <Link href="/" className="inline-block">
          <span className="text-xl font-bold tracking-tight text-warm-900 dark:text-warm-50">
            ManzAllone <span className="text-primary-600">v2</span>
          </span>
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="px-6 py-4 text-center text-xs text-warm-500">
        Tracking salute, nutrizione e fitness · coaching adattivo rigido
      </footer>
    </div>
  )
}
