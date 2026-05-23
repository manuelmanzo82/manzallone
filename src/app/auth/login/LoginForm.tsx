'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Mail, Lock } from 'lucide-react'
import { login, type AuthState } from '@/lib/auth/actions'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function LoginForm({
  confirmSent,
  errorParam,
}: {
  confirmSent: boolean
  errorParam?: string
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, undefined)

  return (
    <Card className="p-8">
      <CardTitle>Bentornato</CardTitle>
      <CardDescription>Accedi al tuo account ManzAllone.</CardDescription>

      {confirmSent && (
        <div className="mt-4 rounded-xl bg-success-500/10 px-4 py-3 text-sm text-success-700 dark:text-success-500">
          Ti abbiamo inviato un'email di conferma. Clicca il link per attivare l'account, poi torna qui per accedere.
        </div>
      )}

      {errorParam === 'callback_failed' && (
        <div className="mt-4 rounded-xl bg-danger-500/10 px-4 py-3 text-sm text-danger-700 dark:text-danger-500">
          Il link non è valido o è scaduto. Riprova.
        </div>
      )}

      <form action={action} className="mt-6 space-y-4" noValidate>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          label="Email"
          placeholder="tu@esempio.it"
          error={state?.fieldErrors?.email?.[0]}
        />
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          label="Password"
          placeholder="••••••••"
          error={state?.fieldErrors?.password?.[0]}
        />

        {state?.error && (
          <div className="rounded-xl bg-danger-500/10 px-4 py-3 text-sm text-danger-700 dark:text-danger-500">
            {state.error}
          </div>
        )}

        <Button type="submit" size="lg" fullWidth loading={pending}>
          <Lock className="h-4 w-4" /> Accedi
        </Button>
      </form>

      <div className="mt-6 flex flex-col gap-2 text-center text-sm text-warm-600 dark:text-warm-400">
        <Link href="/auth/forgot-password" className="text-primary-600 hover:underline">
          Password dimenticata?
        </Link>
        <span>
          Non hai un account?{' '}
          <Link href="/auth/signup" className="font-medium text-primary-600 hover:underline">
            Registrati
          </Link>
        </span>
      </div>
    </Card>
  )
}
