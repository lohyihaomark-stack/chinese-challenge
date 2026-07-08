// POST { password } → { token } (valid for today's calendar date)
// Token is an HMAC so it can't be forged without knowing the password.

import { createHmac } from 'crypto'

export function makeToken(password) {
  const today = new Date().toISOString().slice(0, 10)
  return createHmac('sha256', password).update(`teacher:${today}`).digest('hex')
}

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' })

  const { password } = req.body || {}
  const correct = (process.env.TEACHER_PASSWORD || '').trim()

  if (!correct)                              return res.status(503).json({ error: 'not_configured' })
  if (!password || password.trim() !== correct) return res.status(401).json({ error: 'wrong' })

  return res.status(200).json({ token: makeToken(correct) })
}
