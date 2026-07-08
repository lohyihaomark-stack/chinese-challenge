/* ── Global (class-wide) Boss configuration ──────────── */

export const GLOBAL_BOSS_MAX_HP = 15000

/** 6-boss rotation, cycles every 6 weeks based on ISO week number. */
export const BOSS_ROSTER = [
  { id: 'dragon',  name: '词海巨龙',   emoji: '🐉', sub: '吞噬词语的远古巨兽',     gradient: 'linear-gradient(135deg,#4a0e00,#8B2500)' },
  { id: 'ghost',   name: '词典之灵',   emoji: '👻', sub: '附身于古老字典的幽灵',   gradient: 'linear-gradient(135deg,#2d0045,#6b21a8)' },
  { id: 'demon',   name: '汉字魔王',   emoji: '👹', sub: '让文字颠倒错乱的魔君',   gradient: 'linear-gradient(135deg,#7c2d12,#EA580C)' },
  { id: 'fox',     name: '九尾词狐',   emoji: '🦊', sub: '九条尾巴各藏一个谜语',   gradient: 'linear-gradient(135deg,#78350f,#D97706)' },
  { id: 'titan',   name: '语言守卫',   emoji: '🗿', sub: '古老石像，沉默却强大',   gradient: 'linear-gradient(135deg,#1c1917,#57534e)' },
  { id: 'phoenix', name: '凤凰诗仙',   emoji: '🔥', sub: '从灰烬中重生的诗之凤凰', gradient: 'linear-gradient(135deg,#831843,#DB2777)' },
]

/** ISO 8601 week key, e.g. "2026-W19" — same key Mon→Sun. */
export function getWeekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(((date - yearStart) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

/** Pick this week's boss from the roster. */
export function getCurrentBoss(weekKey = getWeekKey()) {
  const wn = parseInt(weekKey.slice(-2), 10) || 0
  return BOSS_ROSTER[wn % BOSS_ROSTER.length]
}

/** Days remaining in current ISO week (Mon→Sun). */
export function daysLeftInWeek(d = new Date()) {
  const day = d.getDay() || 7  // Mon=1...Sun=7
  return 8 - day  // Mon: 7, Tue: 6, ..., Sun: 1
}

/** Fire-and-forget POST to /api/boss-hit. Dispatches `vocab_boss_hit` on success. */
export function applyBossDamage(name, damage) {
  if (!name || !damage || damage < 1) return
  fetch('/api/boss-hit', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name, damage }),
  })
    .then(r => r.json())
    .then(d => {
      if (d?.available) {
        window.dispatchEvent(new CustomEvent('vocab_boss_hit', { detail: d }))
      }
    })
    .catch(() => {})
}
