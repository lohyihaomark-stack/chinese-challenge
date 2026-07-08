// Returns this week's global boss state + leaderboard.

const MAX_HP = 15000

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
  const { url, token } = getRedisCreds()
  if (!url || !token) return res.status(200).json({ available: false })

  const week    = getWeekKey()
  const hpKey   = `boss:${week}:hp`
  const hitsKey = `boss:${week}:hits`

  try {
    const resp = await fetch(`${url}/pipeline`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['GET',     hpKey],
        ['HGETALL', hitsKey],
      ]),
    })
    if (!resp.ok) {
      console.error('[boss-stats]', `HTTP ${resp.status}`)
      return res.status(200).json({ available: false })
    }
    const data = await resp.json()
    const hpRaw = data?.[0]?.result
    const hp = Math.max(0, hpRaw !== null && hpRaw !== undefined ? parseInt(hpRaw, 10) : MAX_HP)

    // HGETALL returns: ["name1","val1","name2","val2",...] in Upstash REST
    const hits = data?.[1]?.result || []
    const leaderboard = []
    if (Array.isArray(hits)) {
      for (let i = 0; i < hits.length; i += 2) {
        leaderboard.push({ name: hits[i], damage: parseInt(hits[i + 1], 10) || 0 })
      }
    } else if (hits && typeof hits === 'object') {
      // Some clients return as object
      for (const [name, val] of Object.entries(hits)) {
        leaderboard.push({ name, damage: parseInt(val, 10) || 0 })
      }
    }
    leaderboard.sort((a, b) => b.damage - a.damage)

    return res.status(200).json({
      available: true,
      week,
      hp,
      maxHp: MAX_HP,
      defeated: hp <= 0,
      leaderboard,
      totalContributors: leaderboard.length,
    })
  } catch (err) {
    console.error('[boss-stats]', err.message)
    return res.status(200).json({ available: false })
  }
}
