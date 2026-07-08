// Returns today's logged-in students (count + name list).

function getRedisCreds() {
  const url   = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '')
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''
  return { url, token }
}

export default async function handler(req, res) {
  const { url, token } = getRedisCreds()
  if (!url || !token) {
    return res.status(200).json({ available: false, count: 0, names: [], date: null })
  }

  const today = new Date().toISOString().slice(0, 10)
  const key   = `login:${today}`

  try {
    const resp = await fetch(`${url}/smembers/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!resp.ok) {
      console.error('[login-stats]', `HTTP ${resp.status}`)
      return res.status(200).json({ available: false, count: 0, names: [], date: today })
    }
    const data  = await resp.json()
    const names = Array.isArray(data?.result) ? data.result : []
    return res.status(200).json({
      available: true,
      date: today,
      count: names.length,
      names: names.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')),
    })
  } catch (err) {
    console.error('[login-stats]', err.message)
    return res.status(200).json({ available: false, count: 0, names: [], date: today })
  }
}
