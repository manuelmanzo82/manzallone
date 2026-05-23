'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signup, type AuthState } from '@/lib/auth/actions'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signup, undefined)

  return (
    <Card className="p-8">
      <CardTitle>Crea il tuo account</CardTitle>
      <CardDescription>
        Inizia a costruire la tua versione migliore con un coach che ti conosce davvero.
      </CardDescription>

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
          autoComplete="new-password"
          label="Password"
          placeholder="Almeno 8 caratteri"
          hint="Almeno 8 caratteri."
          error={state?.fieldErrors?.password?.[0]}
        />

        {state?.error && (
          <div className="rounded-xl bg-danger-500/10 px-4 py-3 text-sm text-danger-700 dark:text-danger-500">
            {state.error}
          </div>
        )}

        <Button type="submit" size="lg" fullWidth loading={pending}>
          Crea account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-warm-600 dark:text-warm-400">
        Hai già un account?{' '}
        <Link href="/auth/login" className="font-medium text-primary-600 hover:underline">
          Accedi
        </Link>
      </p>
    </Card>
  )
}
