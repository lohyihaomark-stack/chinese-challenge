// Claude-powered 词语老师 chat API
// Uses the same ANTHROPIC_API_KEY already set for check-meaning.js

import Anthropic from '@anthropic-ai/sdk'

const MAX_MESSAGES = 20   // max conversation history length
const MAX_MSG_LEN  = 600  // max characters per individual message

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
  if (!apiKey) return res.status(500).json({ error: 'NO_API_KEY' })

  const { messages, systemPrompt } = req.body || {}

  // ── Input validation ─────────────────────────────────────────────
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid request: messages must be a non-empty array' })
  }
  if (messages.length > MAX_MESSAGES) {
    return res.status(400).json({ error: `Too many messages: max ${MAX_MESSAGES}` })
  }
  if (typeof systemPrompt !== 'string') {
    return res.status(400).json({ error: 'Invalid request: systemPrompt must be a string' })
  }

  // Sanitise: enforce role whitelist + truncate oversized content
  const sanitised = messages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant'))
    .map(m => ({
      role:    m.role,
      content: String(m.content || '').slice(0, MAX_MSG_LEN),
    }))

  if (sanitised.length === 0) {
    return res.status(400).json({ error: 'No valid messages after sanitisation' })
  }

  // ── Stream response headers ──────────────────────────────────────
  res.setHeader('Content-Type',     'text/event-stream')
  res.setHeader('Cache-Control',    'no-cache, no-transform')
  res.setHeader('X-Accel-Buffering', 'no')

  try {
    const client = new Anthropic({ apiKey })

    const stream = client.messages.stream({
      model:      'claude-haiku-4-5',
      max_tokens: 900,
      system:     systemPrompt,
      messages:   sanitised,
    })

    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta?.type === 'text_delta' &&
        chunk.delta.text
      ) {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()

  } catch (err) {
    console.error('[chat api error]', err.message)

    const isRateLimit = err.status === 429 || /rate.?limit|overloaded/i.test(err.message || '')
    const isTimeout   = err.name === 'AbortError' || /timeout/i.test(err.message || '')

    if (!res.headersSent) {
      if (isRateLimit) {
        return res.status(429).json({ error: 'QUOTA_EXCEEDED', retryAfter: 30 })
      }
      return res.status(isTimeout ? 504 : 500).json({
        error: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      })
    } else {
      const msg = isRateLimit ? '老师很忙，请等一会儿再问我吧 😊'
                : isTimeout   ? '请求超时，请重试'
                :               '连接中断，请重试'
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`)
      res.end()
    }
  }
}
