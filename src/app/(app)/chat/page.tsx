import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  fetchRecentMessages,
  getOrCreateConversation,
} from '@/lib/claude/conversation'
import { ChatRoot } from '@/components/chat/ChatRoot'
import { computeGreetingHint } from '@/lib/claude/greeting'

export const dynamic = 'force-dynamic'

export default async function ChatPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, onboarding_completed')
    .eq('id', user.id)
    .single()
  if (!profile?.onboarding_completed) redirect('/onboarding')

  const conversationId = await getOrCreateConversation(supabase, user.id)
  const initialMessages = await fetchRecentMessages(supabase, conversationId, 20)

  // Decide if we should fire a greeting on mount.
  // Trigger if: no prior messages OR last message older than 30 min.
  const last = initialMessages[initialMessages.length - 1]
  const thirtyMinAgo = Date.now() - 30 * 60 * 1000
  const lastIsStale = !last || new Date(last.created_at).getTime() < thirtyMinAgo

  // Has user logged any meal/weight today already?
  const todayIso = new Date().toISOString().slice(0, 10)
  const [{ data: meals }, { data: weights }] = await Promise.all([
    supabase
      .from('meals')
      .select('id')
      .eq('user_id', user.id)
      .gte('recorded_at', `${todayIso}T00:00:00Z`)
      .limit(1),
    supabase
      .from('weights')
      .select('id')
      .eq('user_id', user.id)
      .gte('recorded_at', `${todayIso}T00:00:00Z`)
      .limit(1),
  ])

  const romeHour = Number(
    new Intl.DateTimeFormat('it-IT', {
      hour: '2-digit',
      hour12: false,
      timeZone: 'Europe/Rome',
    }).format(new Date())
  )

  const greetingHint = computeGreetingHint({
    hour: romeHour,
    hasMealsToday: (meals?.length ?? 0) > 0,
    hasWeightToday: (weights?.length ?? 0) > 0,
    firstTimeEver: initialMessages.length === 0,
  })

  const shouldAutoGreet = lastIsStale && greetingHint.shouldGreet

  return (
    <ChatRoot
      conversationId={conversationId}
      initialMessages={initialMessages}
      hasMore={initialMessages.length === 20}
      userName={profile.name ?? 'tu'}
      autoGreetDirective={shouldAutoGreet ? greetingHint.directive : null}
    />
  )
}
