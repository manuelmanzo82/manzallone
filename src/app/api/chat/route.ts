import { createClient } from '@/lib/supabase/server'
import { getAnthropicClient, CHAT_MODEL, MAX_RESPONSE_TOKENS } from '@/lib/claude/client'
import { chatTools } from '@/lib/claude/tools'
import { executeTool } from '@/lib/claude/tool-executor'
import { buildSystemPrompt } from '@/lib/claude/system-prompt'
import {
  getOrCreateConversation,
  fetchRecentMessages,
  saveMessage,
} from '@/lib/claude/conversation'
import type Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_TOOL_ITERATIONS = 5

// SSE encoder. Each event: `data: <json>\n\n`.
function sseEncode(payload: unknown): Uint8Array {
  const json = typeof payload === 'string' ? payload : JSON.stringify(payload)
  return new TextEncoder().encode(`data: ${json}\n\n`)
}

interface Body {
  message: string
  // If true the user did NOT type anything; we just want Claude to greet.
  // The `message` field is then a directive consumed as an internal system note.
  isGreeting?: boolean
}

export async function POST(request: Request) {
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const userText = String(body.message ?? '').trim()
  if (!userText) return Response.json({ error: 'empty_message' }, { status: 400 })

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const conversationId = await getOrCreateConversation(supabase, user.id)
  const { prompt: systemPrompt, snapshot } = await buildSystemPrompt(supabase, user.id)

  // Pull last 20 messages BEFORE we save the new user message
  const history = await fetchRecentMessages(supabase, conversationId, 20)

  // Persist user turn (skip if greeting — those are server-internal directives)
  if (!body.isGreeting) {
    await saveMessage(supabase, conversationId, 'user', userText)
  }

  // Build Anthropic messages array
  const messages: Anthropic.Messages.MessageParam[] = history
    .filter((m) => m.role !== 'system' && typeof m.content === 'string' && m.content.length > 0)
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content as string,
    }))

  let effectiveSystemPrompt = systemPrompt
  if (body.isGreeting) {
    effectiveSystemPrompt += `\n\n# Direttiva apertura chat\n\n${userText}\n\nGenera ora il messaggio di apertura. Non parlare come "ho aperto la chat", scrivi solo il messaggio che vuoi che l'utente legga.`
    messages.push({ role: 'user', content: '(apertura chat)' })
  } else {
    messages.push({ role: 'user', content: userText })
  }

  const anthropic = getAnthropicClient()
  const actionsTaken: Array<{ tool: string; input: unknown; result: unknown; isError: boolean }> = []

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => controller.enqueue(sseEncode(payload))
      let finalText = ''

      try {
        for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
          // Always stream so text deltas reach the client in real time.
          // If the turn ends with stop_reason='tool_use', execute the tools
          // server-side and loop back — Claude usually emits little/no text
          // before a tool call, so the user just sees a brief typing pause.
          const streamed = anthropic.messages.stream({
            model: CHAT_MODEL,
            max_tokens: MAX_RESPONSE_TOKENS,
            system: effectiveSystemPrompt,
            tools: chatTools,
            messages,
          })

          let textForTurn = ''
          for await (const event of streamed) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const chunk = event.delta.text
              textForTurn += chunk
              send({ type: 'text', text: chunk })
            }
          }
          const finalMessage = await streamed.finalMessage()
          const stopReason = finalMessage.stop_reason
          const blocks = finalMessage.content

          if (stopReason === 'tool_use') {
            const toolUseBlocks = blocks.filter(
              (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use'
            )
            if (toolUseBlocks.length === 0) {
              finalText += textForTurn
              break
            }

            send({ type: 'tools_start', count: toolUseBlocks.length })

            messages.push({ role: 'assistant', content: blocks })

            const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []
            for (const block of toolUseBlocks) {
              const exec = await executeTool(
                supabase,
                user.id,
                block.name,
                (block.input ?? {}) as Record<string, unknown>
              )
              actionsTaken.push({
                tool: block.name,
                input: block.input,
                result: exec.result,
                isError: exec.isError,
              })
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(exec.result),
                is_error: exec.isError,
              })
            }
            messages.push({ role: 'user', content: toolResults })
            send({ type: 'tools_done' })

            finalText += textForTurn
            continue
          }

          // end_turn / stop / max_tokens — done
          finalText += textForTurn
          break
        }

        // Persist assistant message with snapshot for audit/debug
        const saved = await saveMessage(
          supabase,
          conversationId,
          'assistant',
          finalText,
          { context: snapshotSummary(snapshot) },
          actionsTaken.length > 0 ? { actions: actionsTaken } : null
        )

        send({
          type: 'done',
          messageId: saved.id,
          createdAt: saved.created_at,
          actionsTaken: actionsTaken.length,
        })
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        send({ type: 'error', message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

// Reduce the full snapshot to a small audit blob (the full one is huge).
function snapshotSummary(s: unknown): Record<string, unknown> {
  if (!s || typeof s !== 'object') return {}
  const o = s as Record<string, unknown>
  return {
    now_iso: o.now_iso,
    hour: o.hour,
    time_of_day: o.time_of_day,
    last_meal_today: o.last_meal_today,
    daily_status: o.daily_status,
  }
}
