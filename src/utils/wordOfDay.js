/* ── Word of the Day picker ──────────────────────────
   Deterministic by date: the same date returns the same
   word regardless of how many times it's called. */

export const WORD_OF_DAY_REWARD = 3

function strHash(s) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

/** Pick today's word, flattened across all units.
 *  Returns: { unitNum, unitTitle, id, hanzi, pinyin, definition, ... } */
export function pickWordOfTheDay(units, dateStr) {
  if (!units?.length) return null
  const all = units.flatMap(u =>
    (u.vocabs || []).map(v => ({
      unitNum: u.unit,
      unitTitle: u.title,
      ...v,
    }))
  )
  if (!all.length) return null
  const idx = strHash(dateStr) % all.length
  return all[idx]
}
