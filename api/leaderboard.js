// Returns top 5 students ranked by total XP from the Redis sorted set.
// XP_LEVELS duplicated here (can't import frontend utils in API routes).

const LEADERBOARD_KEY = 'leaderboard:xp'

const XP_LEVELS = [
  { level:  1, xp:      0, title: '初学者',   emoji: '🌱', color: '#9CA3AF' },
  { level:  2, xp:    150, title: '学徒',     emoji: '📖', color: '#60A5FA' },
  { level:  3, xp:    400, title: '学者',     emoji: '🎓', color: '#34D399' },
  { level:  4, xp:    800, title: '达人',     emoji: '⭐', color: '#FBBF24' },
  { level:  5, xp:   1500, title: '高手',     emoji: '🔥', color: '#F97316' },
  { level:  6, xp:   2500, title: '宗师',     emoji: '💎', color: '#C084FC' },
  { level:  7, xp:   4000, title: '大师',     emoji: '👑', color: '#FBBF24' },
  { level:  8, xp:   6000, title: '文童',     emoji: '🖊️', color: '#67E8F9' },
  { level:  9, xp:   8500, title: '墨客',     emoji: '🖋️', color: '#2DD4BF' },
  { level: 10, xp:  11500, title: '书生',     emoji: '📚', color: '#86EFAC' },
  { level: 11, xp:  15000, title: '儒生',     emoji: '🏮', color: '#FCA5A5' },
  { level: 12, xp:  19000, title: '才子',     emoji: '✨', color: '#FDE68A' },
  { level: 13, xp:  23500, title: '文士',     emoji: '📜', color: '#D4A574' },
  { level: 14, xp:  28500, title: '秀才',     emoji: '🌸', color: '#F9A8D4' },
  { level: 15, xp:  34000, title: '举人',     emoji: '🎑', color: '#7DD3FC' },
  { level: 16, xp:  40000, title: '进士',     emoji: '🏅', color: '#A78BFA' },
  { level: 17, xp:  46500, title: '翰林',     emoji: '🌺', color: '#F472B6' },
  { level: 18, xp:  53500, title: '状元',     emoji: '🥇', color: '#FFD700' },
  { level: 19, xp:  61000, title: '文豪',     emoji: '📰', color: '#93C5FD' },
  { level: 20, xp:  69000, title: '诗仙',     emoji: '🌙', color: '#E2E8F0' },
  { level: 21, xp:  77500, title: '词圣',     emoji: '🌊', color: '#38BDF8' },
  { level: 22, xp:  86500, title: '语灵',     emoji: '💫', color: '#A5F3FC' },
  { level: 23, xp:  96000, title: '字魂',     emoji: '🌀', color: '#818CF8' },
  { level: 24, xp: 106000, title: '词神',     emoji: '🌟', color: '#FCD34D' },
  { level: 25, xp: 116500, title: '文曲星',   emoji: '🔮', color: '#FB923C' },
  { level: 26, xp: 127500, title: '语惊四座', emoji: '💥', color: '#F87171' },
  { level: 27, xp: 139000, title: '才高八斗', emoji: '🎯', color: '#4ADE80' },
  { level: 28, xp: 151000, title: '出口成章', emoji: '📝', color: '#FB7185' },
  { level: 29, xp: 163500, title: '博古通今', emoji: '🏛️', color: '#94A3B8' },
  { level: 30, xp: 176500, title: '学富五车', emoji: '🚀', color: '#FDE047' },
  { level: 31, xp: 190000, title: '满腹经纶', emoji: '📡', color: '#C4B5FD' },
  { level: 32, xp: 204000, title: '经天纬地', emoji: '🌍', color: '#6EE7B7' },
  { level: 33, xp: 218500, title: '文武双全', emoji: '⚔️', color: '#FCA5A5' },
  { level: 34, xp: 233500, title: '文坛霸主', emoji: '👊', color: '#FF6B6B' },
  { level: 35, xp: 249000, title: '语言之王', emoji: '👁️', color: '#00D4FF' },
  { level: 36, xp: 265000, title: '词锋无敌', emoji: '🗡️', color: '#FF4757' },
  { level: 37, xp: 281500, title: '文心剑胆', emoji: '🛡️', color: '#7C3AED' },
  { level: 38, xp: 298500, title: '百世文宗', emoji: '🏯', color: '#D97706' },
  { level: 39, xp: 316000, title: '千古文豪', emoji: '🌠', color: '#0EA5E9' },
  { level: 40, xp: 334000, title: '华语守护', emoji: '🛡️', color: '#10B981' },
  { level: 41, xp: 352500, title: '文明之光', emoji: '🌟', color: '#F59E0B' },
  { level: 42, xp: 371500, title: '语言宗圣', emoji: '✨', color: '#EC4899' },
  { level: 43, xp: 391000, title: '华文至尊', emoji: '💎', color: '#8B5CF6' },
  { level: 44, xp: 411000, title: '词语传说', emoji: '🏆', color: '#F97316' },
  { level: 45, xp: 431500, title: '永恒文神', emoji: '👑', color: '#EF4444' },
  { level: 46, xp: 452500, title: '文化龙魂', emoji: '🐉', color: '#22D3EE' },
  { level: 47, xp: 474000, title: '语破苍穹', emoji: '⚡', color: '#FCD34D' },
  { level: 48, xp: 496000, title: '文道通神', emoji: '🌈', color: '#A855F7' },
  { level: 49, xp: 518500, title: '万古不朽', emoji: '🌌', color: '#06B6D4' },
  { level: 50, xp: 541500, title: '词语宝典传人', emoji: '🌟', color: '#FFD700' },
]

function getLevelFromXP(xp) {
  let lvl = XP_LEVELS[0]
  for (const l of XP_LEVELS) { if (xp >= l.xp) lvl = l }
  return lvl
}

function getRedisCreds() {
  const url   = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '')
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ''
  return { url, token }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' })

  const { url, token } = getRedisCreds()
  if (!url || !token) return res.status(200).json({ available: false, entries: [] })

  try {
    // ZREVRANGE returns members highest-score first; WITHSCORES gives alternating [name, score, ...]
    const resp = await fetch(
      `${url}/zrevrange/${encodeURIComponent(LEADERBOARD_KEY)}/0/4/withscores`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!resp.ok) {
      console.error('[leaderboard] HTTP', resp.status)
      return res.status(200).json({ available: false, entries: [] })
    }

    const data = await resp.json()
    const raw  = Array.isArray(data?.result) ? data.result : []

    // Parse alternating [name, score, name, score, ...]
    const entries = []
    for (let i = 0; i < raw.length; i += 2) {
      const name  = String(raw[i])
      const xp    = parseInt(raw[i + 1], 10) || 0
      const level = getLevelFromXP(xp)
      entries.push({ name, xp, level: level.level, emoji: level.emoji, title: level.title, color: level.color })
    }

    return res.status(200).json({ available: true, entries })
  } catch (err) {
    console.error('[leaderboard]', err.message)
    return res.status(200).json({ available: false, entries: [] })
  }
}
