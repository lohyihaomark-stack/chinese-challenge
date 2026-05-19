// POST { name, data } — saves a student's full profile snapshot to Redis.
// Called on login and on page hide so the teacher dashboard always has fresh data.

const TTL = 60 * 24 * 60 * 60  // 60 days

function getRedisCreds() {
  const url   = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '')
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''
  return { url, token }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' })

  const { name, data } = req.body || {}
  const cleanName = (name || '').trim().slice(0, 30)
  if (!cleanName || !data) return res.status(400).json({ error: 'bad_input' })

  const { url, token } = getRedisCreds()
  if (!url || !token) return res.status(200).json({ ok: false })

  try {
    const payload = JSON.stringify({ ...data, name: cleanName, lastSeen: Date.now() })
    const resp = await fetch(`${url}/pipeline`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['SET',    `student:${cleanName}`, payload],
        ['EXPIRE', `student:${cleanName}`, TTL],
        ['SADD',   'students:index',       cleanName],
        ['EXPIRE', 'students:index',       TTL],
      ]),
    })
    if (!resp.ok) return res.status(200).json({ ok: false })
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[sync-progress]', err.message)
    return res.status(200).json({ ok: false })
  }
}
