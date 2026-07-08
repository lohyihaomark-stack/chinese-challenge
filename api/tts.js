// Proxy Google Translate TTS to avoid CORS.
// GET /api/tts?text=勤奋
// Returns audio/mpeg — cached at CDN for 24 h so identical words hit Google once.

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' })

  const text = (req.query.text || '').trim().slice(0, 200)
  if (!text) return res.status(400).json({ error: 'no text' })

  const url =
    `https://translate.google.com/translate_tts` +
    `?ie=UTF-8&q=${encodeURIComponent(text)}&tl=zh-CN&client=tw-ob&ttsspeed=0.8`

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Referer':    'https://translate.google.com/',
        'Accept':     'audio/mpeg, audio/*',
      },
    })

    if (!upstream.ok) {
      console.error('[tts] Google returned', upstream.status)
      return res.status(502).json({ error: 'upstream_error' })
    }

    const buffer = Buffer.from(await upstream.arrayBuffer())

    // Cache at CDN for 24 h — same word always sounds identical
    res.setHeader('Content-Type',  'audio/mpeg')
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400')
    res.setHeader('Content-Length', buffer.length)
    res.send(buffer)

  } catch (err) {
    console.error('[tts]', err.message)
    res.status(502).json({ error: 'fetch_failed' })
  }
}
