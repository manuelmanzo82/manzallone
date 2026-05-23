import { redirect } from 'next/navigation'

// The proxy redirects authenticated+onboarded users straight to /chat.
// This handles the edge case where the proxy didn't run (e.g. direct render).
export default function RootPage() {
  redirect('/chat')
}
