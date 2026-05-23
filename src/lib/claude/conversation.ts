import type { SupabaseClient } from '@supabase/supabase-js'
import type { ConversationMessage } from '@/lib/types'

// One continuous conversation per user (single-thread philosophy).
// We create it lazily on first message.

export async function getOrCreateConversation(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.id) return existing.id

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, title: 'Chat con Claude' })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return created.id
}

export async function fetchRecentMessages(
  supabase: SupabaseClient,
  conversationId: string,
  limit = 20,
  before?: string
): Promise<ConversationMessage[]> {
  let q = supabase
    .from('messages')
    .select('id, conversation_id, role, content, ui_components, context_snapshot, actions_taken, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (before) q = q.lt('created_at', before)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return ((data ?? []) as ConversationMessage[]).reverse()
}

export async function fetchLastMessage(
  supabase: SupabaseClient,
  conversationId: string
): Promise<ConversationMessage | null> {
  const { data } = await supabase
    .from('messages')
    .select('id, conversation_id, role, content, ui_components, context_snapshot, actions_taken, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data ?? null) as ConversationMessage | null
}

export async function saveMessage(
  supabase: SupabaseClient,
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  contextSnapshot: Record<string, unknown> | null = null,
  actionsTaken: Record<string, unknown> | null = null
): Promise<ConversationMessage> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      context_snapshot: contextSnapshot,
      actions_taken: actionsTaken,
    })
    .select('id, conversation_id, role, content, ui_components, context_snapshot, actions_taken, created_at')
    .single()
  if (error) throw new Error(error.message)

  // bump conversation last_message_at
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  return data as ConversationMessage
}
