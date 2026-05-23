import { ForgotPasswordForm } from './ForgotPasswordForm'

export const metadata = { title: 'Reset password - ManzAllone v2' }

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>
}) {
  const params = await searchParams
  return <ForgotPasswordForm sent={params.sent === '1'} />
}
