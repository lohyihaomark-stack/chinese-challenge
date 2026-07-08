// Apply damage from one student to this week's global boss.
// Atomic: SET NX initialises HP on first hit of a new week,
// DECRBY applies damage, HINCRBY tracks per-student contribution.
// Rate limit: each student may hit once every 4 seconds (cooldown via Redis NX key).

const MAX_HP      = 15000
const COOLDOWN_S  = 4     // seconds between allowed hits per student
const MAX_DAMAGE  = 200   // cap per hit to prevent client-side manipulation

function getRedisCreds() {
  const url   = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '')
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''
  return { url, token }
}

function getWeekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(((date - yearStart) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' })

  const { name, damage } = req.body || {}
  const cleanName = (name || '').trim().slice(0, 30)
  const dmg = Math.max(0, Math.min(MAX_DAMAGE, parseInt(damage, 10) || 0))
  if (!cleanName || dmg < 1) return res.status(400).json({ error: 'bad_input' })

  const { url, token } = getRedisCreds()
  if (!url || !token) return res.status(200).json({ available: false })

  const week        = getWeekKey()
  const hpKey       = `boss:${week}:hp`
  const hitsKey     = `boss:${week}:hits`
  const cooldownKey = `boss:cooldown:${cleanName}`

  try {
    // ── Step 1: Check + set cooldown atomically (SET NX EX) ──────────
    // If cooldownKey already exists → student is on cooldown → reject
    const cdResp = await fetch(`${url}/pipeline`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['SET', cooldownKey, '1', 'EX', COOLDOWN_S, 'NX'],
      ]),
    })

    if (!cdResp.ok) {
      console.error('[boss-hit] cooldown check HTTP', cdResp.status)
      return res.status(200).json({ available: false })
    }

    const cdData = await cdResp.json()
    const cdSet  = cdData?.[0]?.result  // "OK" if key was newly set, null if already existed

    if (cdSet === null) {
      // Key already existed — student is on cooldown
      return res.status(429).json({ error: 'cooldown', retryAfter: COOLDOWN_S })
    }

    // ── Step 2: Apply damage ─────────────────────────────────────────
    const dmgResp = await fetch(`${url}/pipeline`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['SET',     hpKey,   String(MAX_HP), 'NX'],  // init HP if new week
        ['DECRBY',  hpKey,   dmg],
        ['HINCRBY', hitsKey, cleanName, dmg],
        ['EXPIRE',  hpKey,   1209600],  // 14-day TTL
        ['EXPIRE',  hitsKey, 1209600],
      ]),
    })

    if (!dmgResp.ok) {
      console.error('[boss-hit] damage pipeline HTTP', dmgResp.status)
      return res.status(200).json({ available: false })
    }

    const data      = await dmgResp.json()
    const newHpRaw  = parseInt(data?.[1]?.result, 10)
    const yourTotal = parseInt(data?.[2]?.result, 10) || dmg
    const hp        = Math.max(0, newHpRaw)
    const defeated  = hp <= 0

    return res.status(200).json({
      available: true,
      week,
      hp,
      maxHp: MAX_HP,
      defeated,
      yourDamage: yourTotal,
      hitDealt:   dmg,
    })

  } catch (err) {
    console.error('[boss-hit]', err.message)
    return res.status(200).json({ available: false })
  }
}
