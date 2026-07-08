/* ── Daily mission templates ──────────────────────────
   Each day, 3 missions are picked deterministically from the date:
   one easy, one medium, one hard. Same date → same missions
   (so a class on the same day sees the same set). */

export const MISSION_POOL = [
  { id: 'match_complete',   tier: 'easy', target: 1,  reward: 8,  icon: '🔗', text: '完成 1 局词义配对' },
  { id: 'chat_msg_3',       tier: 'easy', target: 3,  reward: 8,  icon: '📚', text: '和词语老师对话 3 次' },
  { id: 'boss_correct_10',  tier: 'easy', target: 10, reward: 8,  icon: '⚔️', text: '词语斗争答对 10 题' },

  { id: 'match_correct_15', tier: 'med',  target: 15, reward: 10, icon: '🎯', text: '词义配对答对 15 对' },
  { id: 'boss_complete',    tier: 'med',  target: 1,  reward: 12, icon: '🐉', text: '完成 1 局词语斗争' },
  { id: 'duel_correct_3',   tier: 'med',  target: 3,  reward: 10, icon: '⚡', text: '急速对决答对 3 次' },

  { id: 'boss_perfect',     tier: 'hard', target: 1,  reward: 22, icon: '🛡️', text: '无伤通关一次词语斗争' },
  { id: 'duel_correct_5',   tier: 'hard', target: 5,  reward: 20, icon: '💥', text: '急速对决答对 5 次' },
]

export const ALL_3_BONUS = 25

/** Maps mission id → game event types that increment its progress. */
export const MISSION_EVENTS = {
  match_complete:   ['match:complete'],
  match_correct_15: ['match:correct'],
  boss_complete:    ['boss:complete'],
  boss_correct_10:  ['boss:correct'],
  boss_perfect:     ['boss:perfect'],
  duel_correct_3:   ['duel:correct'],
  duel_correct_5:   ['duel:correct'],
  chat_msg_3:       ['chat:msg'],
}

/* ── Seeded RNG (FNV-1a hash + LCG) ─────────────────── */
function strHash(s) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}
function seedRand(seedNum) {
  let s = seedNum >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}
function seededShuffle(arr, seedStr) {
  const rand = seedRand(strHash(seedStr))
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* Game mode a mission belongs to (id prefix): match | chat | boss | duel */
function category(m) { return m ? m.id.split('_')[0] : null }

/* ── Generate today's missions ──────────────────────── */
export function generateDailyMissions(dateStr) {
  const shuffled = seededShuffle(MISSION_POOL, dateStr)
  const easy = shuffled.find(m => m.tier === 'easy')
  // Prefer a different game mode than easy so the day's set isn't one-note,
  // falling back to any med if no other mode is available.
  const med  = shuffled.find(m => m.tier === 'med'  && m.id !== easy?.id && category(m) !== category(easy))
       || shuffled.find(m => m.tier === 'med' && m.id !== easy?.id)
  // Prefer a mode different from BOTH easy and med, then loosen the constraints.
  const hard = shuffled.find(m => m.tier === 'hard' && m.id !== easy?.id && m.id !== med?.id && category(m) !== category(easy) && category(m) !== category(med))
       || shuffled.find(m => m.tier === 'hard' && m.id !== easy?.id && m.id !== med?.id)
       // fallback if some tier missing — pick another med
       || shuffled.find(m => m.tier === 'med' && m.id !== easy?.id && m.id !== med?.id)

  return [easy, med, hard].filter(Boolean).map(m => ({
    id:       m.id,
    text:     m.text,
    icon:     m.icon,
    target:   m.target,
    reward:   m.reward,
    progress: 0,
    done:     false,
  }))
}

/** Convenience: get the static template for a given mission id. */
export function missionTemplate(id) {
  return MISSION_POOL.find(m => m.id === id) ?? null
}
