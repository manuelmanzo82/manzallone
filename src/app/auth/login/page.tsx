import { LoginForm } from './LoginForm'

export const metadata = { title: 'Accedi - ManzAllone v2' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ confirm?: string; error?: string }>
}) {
  const params = await searchParams
  return <LoginForm confirmSent={params.confirm === 'sent'} errorParam={params.error} />
}
