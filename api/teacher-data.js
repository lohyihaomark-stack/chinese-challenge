// GET /api/teacher-data — returns all student snapshots from Redis.

function getRedisCreds() {
  const url   = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '')
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''
  return { url, token }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' })

  const { url, token: redisTok } = getRedisCreds()
  if (!url) return res.status(500).json({ error: 'no_redis' })

  try {
    // Get all tracked student names from the index set
    const setRes = await fetch(`${url}/smembers/students:index`, {
      headers: { Authorization: `Bearer ${redisTok}` },
    })
    const setData = await setRes.json()
    const names   = setData.result || []

    if (names.length === 0) return res.status(200).json({ students: [] })

    // Batch-GET all student records in one pipeline call
    const pipeline = names.map(n => ['GET', `student:${n}`])
    const dataRes  = await fetch(`${url}/pipeline`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${redisTok}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(pipeline),
    })
    const dataArr = await dataRes.json()

    const students = dataArr
      .map(r => { try { return r.result ? JSON.parse(r.result) : null } catch { return null } })
      .filter(Boolean)

    return res.status(200).json({ students })
  } catch (err) {
    console.error('[teacher-data]', err.message)
    return res.status(500).json({ error: 'redis_error' })
  }
}
