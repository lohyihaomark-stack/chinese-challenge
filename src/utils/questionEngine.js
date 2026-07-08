/* ══════════════════════════════════════════════════════════
   Shared question-generation engine
   ──────────────────────────────────────────────────────────
   Three jobs, used by every game mode:

   1. clozeVariants / pickCloze — derive a SECOND cloze sentence
      from each word's `example` (a different teacher-written
      sentence) on top of its blanked `sentence`, so replaying a
      word can show a different sentence.

   2. buildHanziOptions / buildDefinitionOptions — pick MCQ
      distractors by similarity (shared characters, same length,
      overlapping definition keywords) instead of pure random, so
      wrong options are plausible near-misses, not giveaways.

   3. nextQuestions — module-level per-mode cycle queue that walks
      the whole pool before repeating and shows never-seen words
      first, so each replay favours new questions.
   ══════════════════════════════════════════════════════════ */

import { getSeenIds } from './userStore'

const HANZI = /[一-鿿]/

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ── Cloze variants ──────────────────────────────────────── */

/** Blank the word out of its `example` sentence to make a second cloze.
 *  Returns null if the word isn't a clean single occurrence. */
export function deriveClozeFromExample(example, hanzi) {
  if (!example || !hanzi) return null
  const first = example.indexOf(hanzi)
  if (first < 0) return null
  if (example.indexOf(hanzi, first + hanzi.length) >= 0) return null // appears >1×
  if (example.replace(hanzi, '').length < 4) return null             // too short without word
  return example.slice(0, first) + '___' + example.slice(first + hanzi.length)
}

/** All cloze sentences available for a word (1–2). */
export function clozeVariants(vocab) {
  const out = []
  if (vocab.sentence && vocab.sentence.includes('___')) out.push(vocab.sentence)
  const derived = deriveClozeFromExample(vocab.example, vocab.hanzi)
  if (derived && derived !== vocab.sentence) out.push(derived)
  return out.length ? out : [vocab.sentence].filter(Boolean)
}

/** Pick one cloze variant at random (varies the question across plays). */
export function pickCloze(vocab) {
  const v = clozeVariants(vocab)
  return v[Math.floor(Math.random() * v.length)] || vocab.sentence
}

/* ── Smart distractors ───────────────────────────────────── */

// Common, non-discriminative chars stripped before comparing definitions.
const STOP = new Set('的了着过地得们和与或在是不也都很就这那有人事物样子形容指比喻表示一个'.split(''))

function charSet(s) { return new Set([...(s || '')].filter(c => HANZI.test(c))) }
function defSet(def) { return new Set([...(def || '')].filter(c => HANZI.test(c) && !STOP.has(c))) }
function overlap(aSet, bSet) { let n = 0; for (const c of aSet) if (bSet.has(c)) n++; return n }

/** Rank `pool` by how confusable each item is with `correct`, then pick a
 *  randomised slice of the top band so distractors are hard but still vary.
 *  `field` selects what string to return ('hanzi' or 'definition'). */
function rankedDistractors(correct, pool, n, field) {
  const cands = pool.filter(v =>
    v.id !== correct.id &&
    v.hanzi !== correct.hanzi &&
    v.definition !== correct.definition
  )
  if (cands.length <= n) return shuffle(cands).map(v => v[field])

  const cLen   = [...correct.hanzi].length
  const cChars = charSet(correct.hanzi)
  const cDef   = defSet(correct.definition)

  const scored = cands.map(v => {
    let s = 0
    if ([...v.hanzi].length === cLen) s += 3
    s += 2.0 * overlap(charSet(v.hanzi), cChars)
    s += 1.5 * overlap(defSet(v.definition), cDef)
    s += Math.random() * 1.5 // jitter → options differ between plays
    return { v, s }
  }).sort((a, b) => b.s - a.s)

  const band = scored.slice(0, Math.min(scored.length, n + 5))
  // de-dupe by the chosen field (different words can share a definition)
  const seen = new Set()
  const out = []
  for (const { v } of shuffle(band)) {
    const val = v[field]
    if (seen.has(val)) continue
    seen.add(val); out.push(val)
    if (out.length >= n) break
  }
  return out
}

/** 4 (default) word options for a sentence/definition question. */
export function buildHanziOptions(correct, pool, total = 4) {
  const opts = new Set([correct.hanzi])
  for (const h of rankedDistractors(correct, pool, total + 2, 'hanzi')) {
    if (opts.size >= total) break
    opts.add(h)
  }
  if (opts.size < total) for (const v of shuffle(pool)) {
    if (opts.size >= total) break
    if (v.hanzi) opts.add(v.hanzi)
  }
  return shuffle([...opts])
}

/** 4 (default) definition options for a listening / word question. */
export function buildDefinitionOptions(correct, pool, total = 4) {
  const opts = new Set([correct.definition])
  for (const d of rankedDistractors(correct, pool, total + 2, 'definition')) {
    if (opts.size >= total) break
    opts.add(d)
  }
  if (opts.size < total) for (const v of shuffle(pool)) {
    if (opts.size >= total) break
    if (v.definition) opts.add(v.definition)
  }
  return shuffle([...opts])
}

/* ── Cross-session cycle selection ───────────────────────── */

const _queues = new Map()

function refill(pool, unitNum) {
  let seen = null
  try { seen = unitNum != null ? getSeenIds(unitNum) : null } catch { seen = null }
  if (!seen || seen.size === 0) return shuffle(pool)
  // Never-seen words first so fresh questions surface earlier.
  const fresh = [], old = []
  for (const v of pool) (seen.has(String(v.id)) ? old : fresh).push(v)
  return [...shuffle(fresh), ...shuffle(old)]
}

/** Return `count` items from `pool`, walking the whole pool before any
 *  repeat (per `key`). Keeps a module-level queue so consecutive plays in
 *  the same browser session keep surfacing new words. */
export function nextQuestions(key, pool, count, { unitNum } = {}) {
  if (!pool || pool.length === 0) return []
  if (pool.length <= count) return shuffle(pool).slice(0, count)

  let q = _queues.get(key)
  if (!q || q.length === 0) q = refill(pool, unitNum)

  const out = []
  const used = new Set()
  let guard = 0
  while (out.length < count && guard < pool.length * 3) {
    guard++
    if (q.length === 0) q = refill(pool, unitNum)
    const item = q.shift()
    if (used.has(item.id)) continue
    used.add(item.id)
    out.push(item)
  }
  _queues.set(key, q)
  return out
}
