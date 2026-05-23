import Anthropic from '@anthropic-ai/sdk'

// Model name pinned here so it's easy to bump centrally.
// Sonnet 4.5: best cost/performance trade-off for the conversational coach.
export const CHAT_MODEL = 'claude-sonnet-4-5-20250929'

// Token budget per response — kept tight to keep Claude concise (WhatsApp-style replies).
export const MAX_RESPONSE_TOKENS = 1024

let _client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (_client) return _client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY missing. Add it to .env.local before chatting with Claude.'
    )
  }
  _client = new Anthropic({ apiKey })
  return _client
}
