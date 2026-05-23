'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import * as z from 'zod'

export type AuthState =
  | { ok?: false; error?: string; fieldErrors?: Record<string, string[]> }
  | undefined

const emailSchema = z.email({ error: 'Inserisci un indirizzo email valido' })
const passwordSchema = z
  .string()
  .min(8, { error: 'La password deve essere lunga almeno 8 caratteri' })

const SignupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: 'Inserisci la password' }),
})

const ResetSchema = z.object({ email: emailSchema })

const NewPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    error: 'Le password non coincidono',
    path: ['confirm'],
  })

async function getOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000'
  const protocol = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https')
  return `${protocol}://${host}`
}

export async function signup(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = SignupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors }
  }

  const supabase = await createClient()
  const origin = await getOrigin()

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/onboarding` },
  })

  if (error) return { error: error.message }

  // If email confirmation is OFF in Supabase, the user is signed in immediately.
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/onboarding')

  // Otherwise the verification email was sent.
  redirect('/auth/login?confirm=sent')
}

export async function login(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) return { error: 'Email o password non validi' }

  redirect('/')
}

export async function logout(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}

export async function requestPasswordReset(
  _state: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = ResetSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors }
  }

  const supabase = await createClient()
  const origin = await getOrigin()

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
  })

  if (error) return { error: error.message }

  redirect('/auth/forgot-password?sent=1')
}

export async function updatePassword(
  _state: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = NewPasswordSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })

  if (error) return { error: error.message }

  redirect('/')
}
