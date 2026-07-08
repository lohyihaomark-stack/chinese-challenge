// Tracks one login per student per day. Stored as a Redis Set keyed by date.
// Uses Upstash Redis REST API (Vercel KV uses the same wire protocol).
// Gracefully no-ops if the Redis env vars aren't set yet.

function getRedisCreds() {
  const url   = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '')
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''
  return { url, token }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' })

  const { name } = req.body || {}
  const cleanName = (name || '').trim().slice(0, 30)
  if (!cleanName) return res.status(400).json({ error: 'no_name' })

  const { url, token } = getRedisCreds()
  if (!url || !token) {
    return res.status(200).json({ available: false, count: 0 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const key   = `login:${today}`

  try {
    // Single pipelined call: add to set, set 48h TTL, return new size.
    const resp = await fetch(`${url}/pipeline`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['SADD',   key, cleanName],
        ['EXPIRE', key, 172800],
        ['SCARD',  key],
      ]),
    })
    if (!resp.ok) {
      console.error('[login-track]', `HTTP ${resp.status}`)
      return res.status(200).json({ available: false, count: 0 })
    }
    const data  = await resp.json()
    const count = data?.[2]?.result ?? 0
    return res.status(200).json({ available: true, date: today, count })
  } catch (err) {
    console.error('[login-track]', err.message)
    return res.status(200).json({ available: false, count: 0 })
  }
}
