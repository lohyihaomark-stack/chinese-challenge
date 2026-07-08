import { useState, useMemo } from 'react'
import { addXP, trackWordResult, getDueReviews } from '../utils/userStore'
import { buildHanziOptions, pickCloze } from '../utils/questionEngine'
import { speak } from '../utils/speech'

const XP_CORRECT = 8
const XP_WRONG   = 2

/* Build the day's deck once: cloze question when the word has a blanked
   sentence, otherwise definition → word. Distractors come from the same
   unit so they stay confusable. */
function buildDeck(units) {
  const due = getDueReviews(units)
  return due.map(d => {
    const unitVocabs = units.find(u => u.unit === d.unitNum)?.vocabs || []
    const cloze = d.vocab.sentence?.includes('___') && Math.random() < 0.7
      ? pickCloze(d.vocab)
      : null
    return {
      vocab:   d.vocab,
      unitNum: d.unitNum,
      cloze,
      options: buildHanziOptions(d.vocab, unitVocabs, 4),
    }
  })
}

export default function ReviewModal({ units, onClose }) {
  const [deck]     = useState(() => buildDeck(units))
  const [idx,      setIdx]      = useState(0)
  const [selected, setSelected] = useState(null)
  const [results,  setResults]  = useState([])
  const [totalXP,  setTotalXP]  = useState(0)

  const q    = deck[idx]
  const done = deck.length > 0 && idx >= deck.length

  const handleSelect = (opt) => {
    if (selected !== null || !q) return
    setSelected(opt)
    const correct = opt === q.vocab.hanzi
    if (correct) speak(q.vocab.hanzi)
    const xp = correct ? XP_CORRECT : XP_WRONG
    addXP(xp, 'review')
    setTotalXP(t => t + xp)
    trackWordResult(q.unitNum, q.vocab.id, correct)
    setResults(r => [...r, correct])
  }

  const next = () => { setSelected(null); setIdx(i => i + 1) }

  const optStyle = (opt) => {
    const base = {
      width: '100%', padding: '13px 14px', borderRadius: 14, fontWeight: 900,
      fontSize: '1.25rem', textAlign: 'center', cursor: selected ? 'default' : 'pointer',
      transition: 'all 0.15s', border: '2px solid',
    }
    if (selected === null)
      return { ...base, background: 'rgba(0,212,255,0.06)', borderColor: 'rgba(0,212,255,0.3)', color: '#c8e8ff' }
    if (opt === q.vocab.hanzi)
      return { ...base, background: 'rgba(6,214,160,0.15)', borderColor: '#06d6a0', color: '#06d6a0' }
    if (opt === selected)
      return { ...base, background: 'rgba(247,37,133,0.12)', borderColor: '#f72585', color: '#f72585' }
    return { ...base, background: 'rgba(0,212,255,0.02)', borderColor: 'rgba(0,212,255,0.1)', color: 'rgba(168,216,240,0.3)' }
  }

  const correctN = results.filter(Boolean).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'rgba(7,13,26,0.97)',
          border: '1px solid rgba(0,212,255,0.25)',
          boxShadow: '0 0 60px rgba(0,212,255,0.12), 0 24px 64px rgba(0,0,0,0.7)',
          maxHeight: '92vh',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #070d1a 0%, #0d1f3a 50%, #070d1a 100%)',
          borderBottom: '1px solid rgba(0,212,255,0.2)',
          padding: '12px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <p style={{ color: '#06d6a0', fontWeight: 900, fontSize: '1.3rem', textShadow: '0 0 12px rgba(6,214,160,0.6)' }}>
              📖 今日复习
            </p>
            <p style={{ color: 'rgba(0,212,255,0.45)', fontSize: '12px', fontFamily: 'monospace' }}>
              温故而知新 · 复习答错和久未见的词
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ color: 'rgba(0,212,255,0.6)', fontSize: '2.2rem', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}
          >×</button>
        </div>

        <div className="overflow-y-auto p-5 flex flex-col gap-4" style={{ minHeight: 300 }}>

          {/* Empty deck */}
          {deck.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div style={{ fontSize: '4rem' }}>🌱</div>
              <p style={{ color: '#06d6a0', fontWeight: 900, fontSize: '1.2rem' }}>暂时没有需要复习的词！</p>
              <p style={{ color: 'rgba(168,216,240,0.6)', fontSize: '0.95rem', lineHeight: 1.7 }}>
                先去玩游戏，答错的词语会自动<br />出现在这里，明天来复习吧。
              </p>
              <button onClick={onClose} className="neon-cta mt-2 px-8">知道了</button>
            </div>
          )}

          {/* Finished */}
          {done && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div style={{ fontSize: '4rem' }}>{correctN === deck.length ? '🏆' : correctN >= deck.length / 2 ? '🌟' : '💪'}</div>
              <p style={{ color: '#06d6a0', fontWeight: 900, fontSize: '1.4rem', textShadow: '0 0 12px rgba(6,214,160,0.5)' }}>
                复习完成！
              </p>
              <p style={{ color: '#ffd60a', fontWeight: 900, fontSize: '2.4rem' }}>
                {correctN} <span style={{ fontSize: '1.1rem', color: 'rgba(255,214,10,0.5)' }}>/ {deck.length} 记住了</span>
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {deck.map((d, i) => (
                  <span key={i} style={{
                    padding: '4px 10px', borderRadius: 999, fontSize: '0.9rem', fontWeight: 900,
                    background: results[i] ? 'rgba(6,214,160,0.1)' : 'rgba(247,37,133,0.1)',
                    border: `1px solid ${results[i] ? 'rgba(6,214,160,0.4)' : 'rgba(247,37,133,0.4)'}`,
                    color: results[i] ? '#06d6a0' : '#f72585',
                  }}>
                    {results[i] ? '✓' : '✗'} {d.vocab.hanzi}
                  </span>
                ))}
              </div>
              <p style={{ color: 'rgba(168,216,240,0.55)', fontSize: '0.85rem' }}>
                答错的词明天还会再出现，直到你记住为止 💪
              </p>
              <div className="px-4 py-2 rounded-full font-black"
                   style={{ background: 'rgba(255,214,10,0.12)', border: '1px solid rgba(255,214,10,0.3)', color: '#ffd60a' }}>
                +{totalXP} XP ✨
              </div>
              <button onClick={onClose} className="neon-cta w-full max-w-xs">完成</button>
            </div>
          )}

          {/* Question */}
          {q && !done && (
            <>
              <div className="flex justify-between items-center">
                <span style={{ color: 'rgba(0,212,255,0.5)', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                  第 {idx + 1} / {deck.length} 题 · 单元{['一','二','三','四','五','六'][q.unitNum - 1]}
                </span>
                <span style={{ display: 'flex', gap: 4 }}>
                  {results.map((r, i) => <span key={i} style={{ fontSize: '0.85rem' }}>{r ? '✅' : '❌'}</span>)}
                </span>
              </div>

              <div style={{
                background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.2)',
                borderRadius: 16, padding: '18px 16px',
              }}>
                {q.cloze ? (
                  <>
                    <p style={{ color: 'rgba(0,212,255,0.5)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>
                      选出正确的词语填空
                    </p>
                    <p style={{ color: '#e8f4ff', fontSize: '1.15rem', lineHeight: 1.8 }}>
                      {q.cloze.split('___')[0]}
                      <span style={{
                        display: 'inline-block', minWidth: 56, margin: '0 4px',
                        borderBottom: '2px solid rgba(0,212,255,0.6)', textAlign: 'center',
                        color: selected ? (selected === q.vocab.hanzi ? '#06d6a0' : '#f72585') : 'transparent',
                        fontWeight: 900,
                      }}>
                        {selected ? q.vocab.hanzi : '＿＿'}
                      </span>
                      {q.cloze.split('___')[1] || ''}
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ color: 'rgba(0,212,255,0.5)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>
                      根据释义选出正确的词语
                    </p>
                    <p style={{ color: '#e8f4ff', fontSize: '1.05rem', lineHeight: 1.7 }}>{q.vocab.definition}</p>
                  </>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {q.options.map(opt => (
                  <button key={opt} onClick={() => handleSelect(opt)} style={optStyle(opt)}>{opt}</button>
                ))}
              </div>

              {selected !== null && (
                <div className="flex items-center justify-between gap-3 animate-fadeIn">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      color: selected === q.vocab.hanzi ? '#06d6a0' : '#f72585',
                      fontWeight: 900, fontSize: '1rem',
                    }}>
                      {selected === q.vocab.hanzi ? `✅ 正确！+${XP_CORRECT} XP` : `❌ 是「${q.vocab.hanzi}」（${q.vocab.pinyin}）`}
                    </p>
                    <p style={{ color: 'rgba(168,216,240,0.65)', fontSize: '0.85rem', lineHeight: 1.5, marginTop: 2 }}>
                      {q.vocab.definition}
                    </p>
                  </div>
                  <button
                    onClick={next}
                    className="shrink-0 px-5 py-2 rounded-xl font-black text-sm"
                    style={{
                      background: 'rgba(6,214,160,0.15)', border: '1.5px solid #06d6a0',
                      color: '#06d6a0', cursor: 'pointer',
                    }}
                  >
                    {idx + 1 >= deck.length ? '查看结果 →' : '下一题 →'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
