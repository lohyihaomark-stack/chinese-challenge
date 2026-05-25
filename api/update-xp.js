// Store a student's current total XP in a Redis sorted set.
// Called on login and whenever XP is gained (debounced client-side).
// The sorted set allows O(log N) top-N queries for the leaderboard.
//
// GET  ?name=<name>  → { xp: <number> }  (read current stored XP)
// POST { name, xp }  → { ok: true }      (write XP — only if higher)

const LEADERBOARD_KEY = 'leaderboard:xp'
const TTL_SECONDS     = 30 * 24 * 60 * 60  // 30-day TTL — keeps data fresh

function getRedisCreds() {
  const url   = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '')
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''
  return { url, token }
}

export default async function handler(req, res) {
  const { url, token } = getRedisCreds()
  if (!url || !token) return res.status(200).json({ ok: false, xp: 0 })

  // ── GET: return stored XP for a given student ──────────────
  if (req.method === 'GET') {
    const name = ((req.query?.name) || '').trim().slice(0, 30)
    if (!name) return res.status(400).json({ error: 'bad_input' })
    try {
      const resp = await fetch(
        `${url}/zscore/${encodeURIComponent(LEADERBOARD_KEY)}/${encodeURIComponent(name)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!resp.ok) return res.status(200).json({ xp: 0 })
      const data = await resp.json()
      const xp   = parseInt(data?.result, 10) || 0
      return res.status(200).json({ xp })
    } catch (err) {
      console.error('[update-xp GET]', err.message)
      return res.status(200).json({ xp: 0 })
    }
  }

  // ── POST: store XP (only if higher than current) ──────────
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' })

  const { name, xp } = req.body || {}
  const cleanName = (name || '').trim().slice(0, 30)
  const xpVal     = Math.max(0, Math.min(999999, parseInt(xp, 10) || 0))

  if (!cleanName) return res.status(400).json({ error: 'bad_input' })

  try {
    const resp = await fetch(`${url}/pipeline`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['ZADD', LEADERBOARD_KEY, 'GT', xpVal, cleanName],  // GT = only update if higher
        ['EXPIRE', LEADERBOARD_KEY, TTL_SECONDS],
      ]),
    })
    if (!resp.ok) {
      console.error('[update-xp] HTTP', resp.status)
      return res.status(200).json({ ok: false })
    }
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[update-xp]', err.message)
    return res.status(200).json({ ok: false })
  }
}
