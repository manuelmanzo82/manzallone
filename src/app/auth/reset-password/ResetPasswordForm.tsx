'use client'

import { useActionState } from 'react'
import { updatePassword, type AuthState } from '@/lib/auth/actions'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    updatePassword,
    undefined
  )

  return (
    <Card className="p-8">
      <CardTitle>Imposta nuova password</CardTitle>
      <CardDescription>Scegli una nuova password sicura per il tuo account.</CardDescription>

      <form action={action} className="mt-6 space-y-4" noValidate>
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          label="Nuova password"
          placeholder="Almeno 8 caratteri"
          error={state?.fieldErrors?.password?.[0]}
        />
        <Input
          name="confirm"
          type="password"
          autoComplete="new-password"
          label="Conferma password"
          placeholder="Ripeti la password"
          error={state?.fieldErrors?.confirm?.[0]}
        />

        {state?.error && (
          <div className="rounded-xl bg-danger-500/10 px-4 py-3 text-sm text-danger-700 dark:text-danger-500">
            {state.error}
          </div>
        )}

        <Button type="submit" size="lg" fullWidth loading={pending}>
          Salva nuova password
        </Button>
      </form>
    </Card>
  )
}
