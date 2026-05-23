'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle, BarChart3, User } from 'lucide-react'
import { cn } from '@/lib/cn'

const TABS = [
  { href: '/chat',      label: 'Chat',       Icon: MessageCircle },
  { href: '/dashboard', label: 'Dashboard',  Icon: BarChart3 },
  { href: '/profile',   label: 'Profilo',    Icon: User },
] as const

export function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-warm-200 bg-white/95 backdrop-blur-md dark:border-warm-800 dark:bg-warm-900/95"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex w-full max-w-2xl items-stretch justify-around">
        {TABS.map(({ href, label, Icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + '/')
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-16 min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                  active
                    ? 'text-primary-600 dark:text-primary-300'
                    : 'text-warm-500 hover:text-warm-700 dark:text-warm-400 dark:hover:text-warm-200'
                )}
              >
                <Icon
                  className={cn(
                    'h-6 w-6 transition-transform',
                    active ? 'scale-110' : 'scale-100'
                  )}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
