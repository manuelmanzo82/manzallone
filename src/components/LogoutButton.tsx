'use client'

import { useTransition } from 'react'
import { LogOut } from 'lucide-react'
import { logout } from '@/lib/auth/actions'

export function LogoutButton() {
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => logout())}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-warm-600 hover:bg-warm-100 dark:text-warm-400 dark:hover:bg-warm-800 disabled:opacity-50"
    >
      <LogOut className="h-3.5 w-3.5" />
      Esci
    </button>
  )
}
