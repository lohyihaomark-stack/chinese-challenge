// Direct HTTP to Gemini API — no SDK needed, Node 18+ fetch built-in

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Strip BOM / whitespace that PowerShell sometimes injects
  const apiKey = (process.env.GEMINI_API_KEY || '').replace(/^﻿/, '').trim()
  if (!apiKey) return res.status(500).json({ error: 'NO_API_KEY' })

  const { messages, systemPrompt } = req.body
  if (!messages?.length) return res.status(400).json({ error: 'Invalid request' })

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('X-Accel-Buffering', 'no')

  try {
    // gemini-2.5-flash: latest, works on free tier
    const model   = 'gemini-2.5-flash'
    const url     = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`

    const contents = messages.map(m => ({
      role:  m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const geminiRes = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 900 },
      }),
    })

    if (!geminiRes.ok) {
      const errBody = await geminiRes.json().catch(() => ({}))
      throw new Error(errBody?.error?.message || `HTTP ${geminiRes.status}`)
    }

    // Proxy Gemini SSE → our SSE, extracting text deltas
    const reader  = geminiRes.body.getReader()
    const decoder = new TextDecoder()
    let buffer    = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() // keep incomplete last line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (!payload || payload === '[DONE]') continue
        try {
          const chunk = JSON.parse(payload)
          const text  = chunk.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`)
        } catch { /* skip malformed */ }
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()

  } catch (err) {
    console.error('[chat api error]', err.message)
    if (!res.headersSent) {
      res.status(500).json({ error: '连接失败，请稍后再试' })
    } else {
      res.write(`data: ${JSON.stringify({ error: '连接失败，请稍后再试' })}\n\n`)
      res.end()
    }
  }
}
