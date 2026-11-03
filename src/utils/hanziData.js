/* Stroke-order data loader for hanzi-writer.
 *
 * School networks sometimes block one CDN but not another, so we race through
 * two hosts before giving up, and cache results in memory for the session.
 * Callers get null on total failure and are expected to show a fallback — a
 * blank 田字格 with a dead play button is worse than an honest message. */

const CDNS = [
  (c) => `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(c)}.json`,
  (c) => `https://unpkg.com/hanzi-writer-data@2.0/${encodeURIComponent(c)}.json`,
]

const TIMEOUT_MS = 6000

const cache   = new Map()   // char → data
const failed  = new Set()   // chars known unreachable this session

async function fetchFrom(url) {
  const ctrl  = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) return null
    const data = await res.json()
    return data?.strokes?.length ? data : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Resolve stroke data for one character, or null if every source failed. */
export async function getCharData(char) {
  if (cache.has(char))  return cache.get(char)
  if (failed.has(char)) return null

  for (const build of CDNS) {
    const data = await fetchFrom(build(char))
    if (data) { cache.set(char, data); return data }
  }
  failed.add(char)
  return null
}

/** hanzi-writer's `charDataLoader` signature. `onFail` fires when no CDN served
 *  the character, so the UI can replace the empty grid with an explanation. */
export function charDataLoader(onFail) {
  return (char, onComplete) => {
    getCharData(char).then(data => {
      if (!data) onFail?.(char)
      onComplete(data)
    })
  }
}
