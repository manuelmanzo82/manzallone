'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { requestPasswordReset, type AuthState } from '@/lib/auth/actions'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function ForgotPasswordForm({ sent }: { sent: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    requestPasswordReset,
    undefined
  )

  return (
    <Card className="p-8">
      <CardTitle>Reset password</CardTitle>
      <CardDescription>
        Inserisci l'email del tuo account, ti invieremo un link per impostare una nuova password.
      </CardDescription>

      {sent ? (
        <div className="mt-6 rounded-xl bg-success-500/10 px-4 py-3 text-sm text-success-700 dark:text-success-500">
          Email inviata. Controlla la posta (anche spam) e clicca il link per reimpostare la password.
        </div>
      ) : (
        <form action={action} className="mt-6 space-y-4" noValidate>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            label="Email"
            placeholder="tu@esempio.it"
            error={state?.fieldErrors?.email?.[0]}
          />

          {state?.error && (
            <div className="rounded-xl bg-danger-500/10 px-4 py-3 text-sm text-danger-700 dark:text-danger-500">
              {state.error}
            </div>
          )}

          <Button type="submit" size="lg" fullWidth loading={pending}>
            <Mail className="h-4 w-4" /> Inviami il link
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-warm-600 dark:text-warm-400">
        <Link href="/auth/login" className="text-primary-600 hover:underline">
          Torna al login
        </Link>
      </p>
    </Card>
  )
}
