import { useState, useMemo } from 'react'
import { saveMatchScore, addCoins } from '../utils/userStore'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}


const BATCH = 6

export default function VocabMatchGame({ vocabs, unitNum }) {
  const allBatches = useMemo(() => {
    const shuffled = shuffle([...vocabs])
    const out = []
    for (let i = 0; i < shuffled.length; i += BATCH) {
      out.push(shuffled.slice(i, i + BATCH))
    }
    return out
  }, [vocabs])

  const [batchIdx,   setBatchIdx]   = useState(0)
  const [matched,    setMatched]    = useState(new Set())   // ids fully matched
  const [selected,   setSelected]   = useState(null)        // word id chosen
  const [wrongPair,  setWrongPair]  = useState(null)        // {word, meaning}
  const [score,      setScore]      = useState(0)            // correct first-try taps
  const [attempts,   setAttempts]   = useState(0)
  const [done,       setDone]       = useState(false)

  const batch = allBatches[batchIdx] || []

  // Shuffle meanings once per batch (stable across re-renders inside same batch)
  const shuffledMeanings = useMemo(
    () => shuffle([...batch]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [batchIdx, allBatches]
  )

  /* ── Tap handlers ── */
  const handleWordTap = (id) => {
    if (matched.has(id) || wrongPair) return
    setSelected(prev => (prev === id ? null : id))
  }

  const handleMeaningTap = (id) => {
    if (matched.has(id) || wrongPair) return
    if (selected === null) return          // must pick word first
    setAttempts(a => a + 1)

    if (selected === id) {
      // ✅ Correct match
      addCoins(1)   // +1 per correct pair
      const next = new Set(matched)
      next.add(id)
      setMatched(next)
      setSelected(null)
      setScore(s => s + 1)

      if (next.size === batch.length) {
        setTimeout(() => {
          if (batchIdx + 1 >= allBatches.length) {
            const finalPct = (attempts + 1) > 0
              ? Math.round(((score + 1) / (attempts + 1)) * 100) : 100
            saveMatchScore(unitNum, finalPct)
            addCoins(5)   // +5 completion bonus
            setDone(true)
          } else {
            setBatchIdx(b => b + 1)
            setMatched(new Set())
            setSelected(null)
          }
        }, 700)
      }
    } else {
      // ❌ Wrong match — shake then reset
      setWrongPair({ word: selected, meaning: id })
      setTimeout(() => {
        setWrongPair(null)
        setSelected(null)
      }, 900)
    }
  }

  const handleRestart = () => {
    setBatchIdx(0)
    setMatched(new Set())
    setSelected(null)
    setWrongPair(null)
    setScore(0)
    setAttempts(0)
    setDone(false)
  }

  /* ── Results screen ── */
  if (done) {
    const pct    = attempts > 0 ? Math.round((score / attempts) * 100) : 100
    const emoji  = pct >= 90 ? '🏆' : pct >= 70 ? '🌟' : pct >= 50 ? '💪' : '📖'
    const praise = pct >= 90 ? '配对高手！' : pct >= 70 ? '表现出色！' : pct >= 50 ? '继续练习！' : '再接再厉！'
    const total  = allBatches.reduce((s, b) => s + b.length, 0)

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-5">
        <div className="text-6xl animate-pop">{emoji}</div>
        <h2 className="text-2xl font-black text-brick">配对完成！</h2>
        <p className="text-5xl font-black text-brick">
          {score}
          <span className="text-xl font-normal text-brick/50"> / {attempts} 次</span>
        </p>
        <p className="text-base text-brick/60">共配对 {total} 个词语</p>
        <p className="text-lg font-bold text-nanyang-teal">{praise}</p>
        <div className="w-full max-w-xs bg-cream-dark rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-nanyang-teal rounded-full transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-brick/50 text-sm">一次命中率 {pct}%</p>
        <button
          onClick={handleRestart}
          className="bg-brick text-cream px-8 py-3 rounded-lg font-bold text-base hover:bg-brick-mid transition-colors shadow-md"
        >
          再挑战一次 🔄
        </button>
      </div>
    )
  }

  /* ── Button style helpers ── */
  const wordClass = (id) => {
    const base = 'w-full py-4 px-2 rounded-xl font-black text-3xl border-2 transition-all duration-150 text-center leading-tight'
    if (matched.has(id))       return `${base} bg-nanyang-teal/15 border-nanyang-teal text-nanyang-teal cursor-default`
    if (wrongPair?.word === id) return `${base} bg-brick/10 border-brick text-brick animate-shake`
    if (selected === id)        return `${base} bg-gold/25 border-gold text-brick scale-105 shadow-md cursor-pointer`
    return `${base} bg-cream border-brick-mid/40 text-brick hover:border-brick hover:bg-cream-dark cursor-pointer`
  }

  const meaningClass = (id) => {
    const base = 'w-full px-3 py-3 rounded-xl text-lg border-2 transition-all duration-150 text-left leading-snug'
    if (matched.has(id))           return `${base} bg-nanyang-teal/15 border-nanyang-teal text-nanyang-teal cursor-default`
    if (wrongPair?.meaning === id) return `${base} bg-brick/10 border-brick text-brick animate-shake cursor-default`
    if (selected !== null)         return `${base} bg-cream border-brick-mid/40 text-brick hover:border-brick hover:bg-cream-dark cursor-pointer`
    return `${base} bg-cream/60 border-brick-mid/20 text-brick/40 cursor-not-allowed`
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">

      {/* ── Progress bar ── */}
      <div className="px-4 pt-3 pb-1 flex justify-between text-lg text-brick/60 shrink-0">
        <span>第 {batchIdx + 1} 组 / 共 {allBatches.length} 组</span>
        <span>已配对 <strong className="text-brick">{matched.size}/{batch.length}</strong></span>
      </div>
      <div className="mx-4 mb-4 bg-cream-dark h-1.5 rounded-full overflow-hidden shrink-0">
        <div
          className="h-full bg-gold rounded-full transition-all duration-500"
          style={{ width: `${(matched.size / batch.length) * 100}%` }}
        />
      </div>

      <div className="px-4 pb-6 flex flex-col gap-5">

        {/* ── Instruction ── */}
        <p className="text-center text-lg text-brick/50">
          {selected !== null
            ? '👇 现在点击对应的释义'
            : '👆 先点击一个词语开始配对'}
        </p>

        {/* ── Word buttons (3 per row) ── */}
        <div>
          <p className="text-base font-bold text-brick/40 uppercase tracking-wider mb-2">词语</p>
          <div className="grid grid-cols-3 gap-2">
            {batch.map(v => (
              <button key={v.id} onClick={() => handleWordTap(v.id)} className={wordClass(v.id)}>
                {matched.has(v.id) ? <span className="text-base">✓</span> : v.hanzi}
              </button>
            ))}
          </div>
        </div>

        {/* ── Meaning buttons (2 per row) ── */}
        <div>
          <p className="text-base font-bold text-brick/40 uppercase tracking-wider mb-2">释义</p>
          <div className="grid grid-cols-2 gap-2">
            {shuffledMeanings.map(v => (
              <button key={v.id} onClick={() => handleMeaningTap(v.id)} className={meaningClass(v.id)}>
                {matched.has(v.id) && <span className="text-nanyang-teal mr-1">✓</span>}
                {v.definition}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
