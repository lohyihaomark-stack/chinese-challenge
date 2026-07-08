import { useState, useMemo, useRef } from 'react'
import { saveMatchScore, addCoins, trackMissionProgress, getCurrentName } from '../utils/userStore'
import { applyBossDamage } from '../utils/globalBoss'

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
  // Build batches once per mount with a fresh shuffle (ref avoids stale useMemo)
  const allBatches = useRef(null)
  if (!allBatches.current) {
    const shuffled = shuffle([...vocabs])
    const out = []
    for (let i = 0; i < shuffled.length; i += BATCH) out.push(shuffled.slice(i, i + BATCH))
    allBatches.current = out
  }

  const [batchIdx,  setBatchIdx]  = useState(0)
  const [matched,   setMatched]   = useState(new Set())
  const [selected,  setSelected]  = useState(null)
  const [wrongPair, setWrongPair] = useState(null)
  const [score,     setScore]     = useState(0)
  const [attempts,  setAttempts]  = useState(0)
  const [done,      setDone]      = useState(false)

  const batch = allBatches.current[batchIdx] || []

  const shuffledMeanings = useMemo(
    () => shuffle([...batch]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [batchIdx]
  )

  /* ── Tap handlers ── */
  const handleWordTap = (id) => {
    if (matched.has(id) || wrongPair) return
    setSelected(prev => (prev === id ? null : id))
  }

  const handleMeaningTap = (id) => {
    if (matched.has(id) || wrongPair) return
    if (selected === null) return
    setAttempts(a => a + 1)

    if (selected === id) {
      addCoins(1)
      trackMissionProgress('match:correct')
      const next = new Set(matched)
      next.add(id)
      setMatched(next)
      setSelected(null)
      setScore(s => s + 1)

      if (next.size === batch.length) {
        applyBossDamage(getCurrentName(), Math.ceil(batch.length / 3))
        setTimeout(() => {
          if (batchIdx + 1 >= allBatches.current.length) {
            const finalPct = (attempts + 1) > 0
              ? Math.round(((score + 1) / (attempts + 1)) * 100) : 100
            saveMatchScore(unitNum, finalPct)
            addCoins(2)
            trackMissionProgress('match:complete')
            setDone(true)
          } else {
            setBatchIdx(b => b + 1)
            setMatched(new Set())
            setSelected(null)
          }
        }, 700)
      }
    } else {
      setWrongPair({ word: selected, meaning: id })
      setTimeout(() => { setWrongPair(null); setSelected(null) }, 900)
    }
  }

  const handleRestart = () => {
    // Reshuffle on restart so the order is different
    const reshuffled = shuffle([...vocabs])
    const newBatches = []
    for (let i = 0; i < reshuffled.length; i += BATCH) newBatches.push(reshuffled.slice(i, i + BATCH))
    allBatches.current = newBatches
    setBatchIdx(0); setMatched(new Set()); setSelected(null)
    setWrongPair(null); setScore(0); setAttempts(0); setDone(false)
  }

  /* ── Results screen ── */
  if (done) {
    const pct    = attempts > 0 ? Math.round((score / attempts) * 100) : 100
    const emoji  = pct >= 90 ? '🏆' : pct >= 70 ? '🌟' : pct >= 50 ? '💪' : '📖'
    const praise = pct >= 90 ? '配对高手！' : pct >= 70 ? '表现出色！' : pct >= 50 ? '继续练习！' : '再接再厉！'
    const total  = allBatches.current.reduce((s, b) => s + b.length, 0)
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-5"
           style={{ background: 'rgba(7,13,26,0.8)' }}>
        <div style={{ fontSize: '5rem' }}>{emoji}</div>
        <h2 style={{ color: '#00d4ff', fontWeight: 900, fontSize: '1.8rem', textShadow: '0 0 20px rgba(0,212,255,0.6)' }}>
          配对完成！
        </h2>
        <p style={{ color: '#ffd60a', fontWeight: 900, fontSize: '3rem' }}>
          {score}
          <span style={{ color: 'rgba(255,214,10,0.5)', fontWeight: 400, fontSize: '1.2rem' }}> / {attempts} 次</span>
        </p>
        <p style={{ color: 'rgba(168,216,240,0.55)', fontSize: '1rem' }}>共配对 {total} 个词语</p>
        <p style={{ color: '#06d6a0', fontWeight: 700, fontSize: '1.1rem' }}>{praise}</p>
        <div style={{ width: '100%', maxWidth: 280, background: 'rgba(255,255,255,0.06)', borderRadius: 999, height: 10, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#06d6a0,#00d4ff)', borderRadius: 999, transition: 'width 1s ease' }} />
        </div>
        <p style={{ color: 'rgba(168,216,240,0.4)', fontSize: '0.9rem' }}>一次命中率 {pct}%</p>
        <button onClick={handleRestart}
          style={{ background: 'linear-gradient(135deg,#9b5de5,#00d4ff)', color: '#fff', fontWeight: 900, fontSize: '1rem', padding: '12px 32px', borderRadius: 12, border: 'none', cursor: 'pointer', boxShadow: '0 0 20px rgba(155,93,229,0.4)' }}>
          再挑战一次 🔄
        </button>
      </div>
    )
  }

  /* ── Word button style ── */
  const wordStyle = (id) => {
    const base = {
      width: '100%', padding: '14px 6px', borderRadius: 14,
      fontWeight: 900, fontSize: '1.5rem', border: '2px solid',
      transition: 'all 0.15s', cursor: 'pointer', textAlign: 'center', lineHeight: 1.2,
    }
    if (matched.has(id))        return { ...base, background: 'rgba(6,214,160,0.12)', borderColor: '#06d6a0', color: '#06d6a0', cursor: 'default' }
    if (wrongPair?.word === id) return { ...base, background: 'rgba(247,37,133,0.1)',  borderColor: '#f72585', color: '#f72585' }
    if (selected === id)        return { ...base, background: 'rgba(155,93,229,0.25)', borderColor: '#9b5de5', color: '#e0b8ff', transform: 'scale(1.05)', boxShadow: '0 0 16px rgba(155,93,229,0.5)' }
    return { ...base, background: 'rgba(0,212,255,0.05)', borderColor: 'rgba(0,212,255,0.2)', color: '#a8d8f0' }
  }

  /* ── Meaning button style ── */
  const meaningStyle = (id) => {
    const base = {
      width: '100%', padding: '12px 14px', borderRadius: 12, fontSize: '0.95rem',
      border: '2px solid', transition: 'all 0.15s', textAlign: 'left', lineHeight: 1.45, cursor: 'pointer',
    }
    if (matched.has(id))           return { ...base, background: 'rgba(6,214,160,0.1)',   borderColor: '#06d6a0', color: '#06d6a0', cursor: 'default' }
    if (wrongPair?.meaning === id) return { ...base, background: 'rgba(247,37,133,0.1)',  borderColor: '#f72585', color: '#f72585', cursor: 'default' }
    if (selected !== null)         return { ...base, background: 'rgba(0,212,255,0.06)',  borderColor: 'rgba(0,212,255,0.3)', color: '#c8e8ff' }
    return { ...base, background: 'rgba(0,212,255,0.03)', borderColor: 'rgba(0,212,255,0.1)', color: 'rgba(168,216,240,0.35)', cursor: 'not-allowed' }
  }

  const batchPct = matched.size / (batch.length || 1)

  return (
    <div className="flex-1 flex flex-col overflow-y-auto" style={{ background: 'rgba(7,13,26,0.8)' }}>

      {/* ── Progress ── */}
      <div style={{ padding: '12px 16px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ color: 'rgba(168,216,240,0.5)', fontSize: '0.9rem' }}>
          第 {batchIdx + 1} 组 / 共 {allBatches.current.length} 组
        </span>
        <span style={{ color: 'rgba(168,216,240,0.5)', fontSize: '0.9rem' }}>
          已配对 <strong style={{ color: '#00d4ff' }}>{matched.size}/{batch.length}</strong>
        </span>
      </div>
      <div style={{ margin: '0 16px 12px', height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${batchPct * 100}%`, background: 'linear-gradient(90deg,#9b5de5,#00d4ff)', borderRadius: 999, transition: 'width 0.5s ease' }} />
      </div>

      <div style={{ padding: '0 14px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Instruction ── */}
        <p style={{ textAlign: 'center', color: selected !== null ? '#ffd60a' : 'rgba(168,216,240,0.45)', fontSize: '0.95rem', fontWeight: 600 }}>
          {selected !== null ? '👇 点击对应的释义' : '👆 先点击词语，再点击释义配对'}
        </p>

        {/* ── Words ── */}
        <div>
          <p style={{ color: '#9b5de5', fontWeight: 900, fontSize: '0.8rem', letterSpacing: '0.15em', marginBottom: 8, textTransform: 'uppercase' }}>
            📝 词语
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {batch.map(v => (
              <button key={v.id} onClick={() => handleWordTap(v.id)} style={wordStyle(v.id)}>
                {matched.has(v.id) ? <span style={{ fontSize: '1rem' }}>✓</span> : v.hanzi}
              </button>
            ))}
          </div>
        </div>

        {/* ── Meanings ── */}
        <div>
          <p style={{ color: '#06d6a0', fontWeight: 900, fontSize: '0.8rem', letterSpacing: '0.15em', marginBottom: 8, textTransform: 'uppercase' }}>
            📖 释义
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {shuffledMeanings.map(v => (
              <button key={v.id} onClick={() => handleMeaningTap(v.id)} style={meaningStyle(v.id)}>
                {matched.has(v.id) && <span style={{ color: '#06d6a0', marginRight: 4 }}>✓</span>}
                {v.definition}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
