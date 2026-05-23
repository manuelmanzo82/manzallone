import { createClient } from '@/lib/supabase/server'
import {
  getOrCreateConversation,
  fetchRecentMessages,
} from '@/lib/claude/conversation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/chat/messages?before=<iso>&limit=<n>
// Returns ordered messages (oldest -> newest), capped at 20 by default.
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const before = url.searchParams.get('before') ?? undefined
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 20), 1), 50)

  const conversationId = await getOrCreateConversation(supabase, user.id)
  const messages = await fetchRecentMessages(supabase, conversationId, limit, before)

  // hasMore = true if we got a full page (rough heuristic, client can keep paginating)
  return Response.json({
    conversationId,
    messages,
    hasMore: messages.length === limit,
  })
}
