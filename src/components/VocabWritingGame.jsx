import { useState, useEffect, useRef } from 'react'
import { addXP, trackMissionProgress, trackWordResult } from '../utils/userStore'
import { nextQuestions } from '../utils/questionEngine'

const MAX_QUESTIONS = 15
const XP_CORRECT    = 20
const XP_PARTIAL    = 8

const VERDICT_CONFIG = {
  correct: { emoji: '✅', label: '正确！',   color: '#06d6a0', xp: XP_CORRECT, bg: 'rgba(6,214,160,0.1)',  border: 'rgba(6,214,160,0.35)' },
  partial: { emoji: '🟡', label: '部分正确', color: '#ffd60a', xp: XP_PARTIAL, bg: 'rgba(255,214,10,0.1)', border: 'rgba(255,214,10,0.35)' },
  wrong:   { emoji: '❌', label: '再加油！', color: '#f72585', xp: 0,          bg: 'rgba(247,37,133,0.08)', border: 'rgba(247,37,133,0.3)'  },
}

export default function VocabWritingGame({ vocabs, unitNum }) {
  const questions   = useRef(nextQuestions(`writing_u${unitNum}`, vocabs, MAX_QUESTIONS, { unitNum }))
  const [idx,       setIdx]       = useState(0)
  const [answer,    setAnswer]    = useState('')
  const [loading,   setLoading]   = useState(false)
  const [result,    setResult]    = useState(null)
  const [scores,    setScores]    = useState([])
  const [done,      setDone]      = useState(false)
  const [totalXP,   setTotalXP]   = useState(0)
  const textareaRef = useRef(null)

  const q     = questions.current[idx]
  const total = questions.current.length

  useEffect(() => {
    if (!result && textareaRef.current) textareaRef.current.focus()
  }, [idx, result])

  const submit = async () => {
    const trimmed = answer.trim()
    if (!trimmed || loading) return
    setLoading(true)

    try {
      const resp = await fetch('/api/check-meaning', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hanzi:         q.hanzi,
          pinyin:        q.pinyin,
          definition:    q.definition,
          studentAnswer: trimmed,
        }),
      })
      const data = await resp.json()
      const cfg  = VERDICT_CONFIG[data.verdict] || VERDICT_CONFIG.partial

      if (cfg.xp > 0) {
        addXP(cfg.xp, 'writing_game')
        setTotalXP(prev => prev + cfg.xp)
      }
      trackWordResult(unitNum, q.id, data.verdict === 'correct')
      setResult({ verdict: data.verdict, feedback: data.feedback, cfg })
      setScores(prev => [...prev, data.verdict])
      trackMissionProgress('vocab_xp', 1)
    } catch {
      setResult({ verdict: 'partial', feedback: 'AI 暂时无法连接，请稍后再试。', cfg: VERDICT_CONFIG.partial })
      setScores(prev => [...prev, 'partial'])
    } finally {
      setLoading(false)
    }
  }

  const next = () => {
    if (idx + 1 >= total) {
      setDone(true)
    } else {
      setIdx(i => i + 1)
      setAnswer('')
      setResult(null)
    }
  }

  const restart = () => {
    questions.current = nextQuestions(`writing_u${unitNum}`, vocabs, MAX_QUESTIONS, { unitNum })
    setIdx(0); setAnswer(''); setResult(null)
    setScores([]); setTotalXP(0); setDone(false)
  }

  /* ── Results screen ──────────────────────────────────────── */
  if (done) {
    const correct = scores.filter(s => s === 'correct').length
    const partial = scores.filter(s => s === 'partial').length
    const wrong   = scores.filter(s => s === 'wrong').length
    const pct     = Math.round(((correct + partial * 0.5) / total) * 100)

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 overflow-y-auto [&>*]:shrink-0">
        <div className="glass-card w-full max-w-sm p-6 flex flex-col items-center gap-4">

          <div className="text-6xl animate-bounceIn">
            {pct >= 80 ? '🏆' : pct >= 50 ? '🌟' : '📖'}
          </div>

          <h2 className="text-2xl font-black" style={{ color: '#00d4ff', textShadow: '0 0 12px rgba(0,212,255,0.5)' }}>
            测试完成！
          </h2>

          <div className="w-full text-center">
            <p className="text-4xl font-black mb-1"
               style={{ color: pct >= 80 ? '#06d6a0' : pct >= 50 ? '#ffd60a' : '#f72585' }}>
              {pct}%
            </p>
            <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full transition-all duration-1000"
                   style={{
                     width: `${pct}%`,
                     background: pct >= 80
                       ? 'linear-gradient(90deg,#06d6a0,#00d4ff)'
                       : pct >= 50
                       ? 'linear-gradient(90deg,#ffd60a,#f97316)'
                       : 'linear-gradient(90deg,#f72585,#ff6b35)',
                   }} />
            </div>
          </div>

          <div className="flex gap-6 text-center">
            <div>
              <p className="text-2xl font-black" style={{ color: '#06d6a0' }}>{correct}</p>
              <p className="text-xs font-mono" style={{ color: 'rgba(0,212,255,0.5)' }}>正确</p>
            </div>
            <div>
              <p className="text-2xl font-black" style={{ color: '#ffd60a' }}>{partial}</p>
              <p className="text-xs font-mono" style={{ color: 'rgba(0,212,255,0.5)' }}>部分</p>
            </div>
            <div>
              <p className="text-2xl font-black" style={{ color: '#f72585' }}>{wrong}</p>
              <p className="text-xs font-mono" style={{ color: 'rgba(0,212,255,0.5)' }}>错误</p>
            </div>
          </div>

          <div className="px-4 py-2 rounded-full font-black text-base"
               style={{ background: 'rgba(255,214,10,0.12)', border: '1px solid rgba(255,214,10,0.3)', color: '#ffd60a' }}>
            +{totalXP} XP 已获得 ✨
          </div>

          <button onClick={restart} className="neon-cta w-full">
            再来一次 🔄
          </button>
        </div>
      </div>
    )
  }

  /* ── Question screen ─────────────────────────────────────── */
  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* Progress bar */}
      <div className="shrink-0 px-4 pt-3 pb-1">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-mono" style={{ color: 'rgba(0,212,255,0.5)' }}>
            第 {idx + 1} / {total} 题
          </span>
          <div className="flex gap-1.5">
            {scores.map((s, i) => (
              <span key={i} className="text-sm">
                {s === 'correct' ? '✅' : s === 'partial' ? '🟡' : '❌'}
              </span>
            ))}
          </div>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,212,255,0.1)' }}>
          <div className="h-full rounded-full transition-all duration-500"
               style={{ width: `${(idx / total) * 100}%`, background: 'linear-gradient(90deg,#00d4ff,#9b5de5)' }} />
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto p-4 gap-4 [&>*]:shrink-0">
        <div className="glass-card w-full max-w-md p-6 flex flex-col items-center gap-3">

          {/* Word */}
          <div className="text-center">
            <p className="text-6xl font-black leading-tight"
               style={{ color: '#e8f4ff', textShadow: '0 0 30px rgba(0,212,255,0.4)' }}>
              {q.hanzi}
            </p>
            <p className="text-lg font-semibold mt-1"
               style={{ color: '#00d4ff', textShadow: '0 0 8px rgba(0,212,255,0.4)' }}>
              {q.pinyin}
            </p>
          </div>

          <div className="w-full h-px" style={{ background: 'rgba(0,212,255,0.12)' }} />

          <p className="text-sm font-semibold" style={{ color: 'rgba(140,200,240,0.7)' }}>
            ✍️ 用华文写出这个词语的意思：
          </p>

          <textarea
            ref={textareaRef}
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
            disabled={!!result || loading}
            placeholder="在这里输入释义…"
            rows={3}
            maxLength={200}
            className="w-full cyber-input resize-none text-base leading-relaxed"
            style={{ fontFamily: 'inherit' }}
          />

          <div className="flex w-full justify-between items-center">
            <span className="text-xs font-mono" style={{ color: 'rgba(0,212,255,0.3)' }}>
              {answer.length}/200
            </span>
            {!result && (
              <button
                onClick={submit}
                disabled={!answer.trim() || loading}
                className="neon-cta px-6 py-2 text-sm disabled:opacity-40"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 rounded-full animate-spin"
                          style={{ borderColor: 'rgba(0,212,255,0.6)', borderTopColor: 'transparent' }} />
                    AI 批改中…
                  </span>
                ) : '提交 →'}
              </button>
            )}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="w-full max-w-md animate-fadeIn flex flex-col gap-3">

            <div className="rounded-2xl p-4 flex items-center gap-3"
                 style={{ background: result.cfg.bg, border: `1px solid ${result.cfg.border}` }}>
              <span className="text-3xl">{result.cfg.emoji}</span>
              <div className="flex-1">
                <p className="font-black text-lg leading-tight" style={{ color: result.cfg.color }}>
                  {result.cfg.label}
                  {result.cfg.xp > 0 && (
                    <span className="ml-2 text-sm font-mono" style={{ color: '#ffd60a' }}>
                      +{result.cfg.xp} XP
                    </span>
                  )}
                </p>
                {result.feedback && (
                  <p className="text-sm mt-0.5 leading-snug" style={{ color: 'rgba(220,240,255,0.8)' }}>
                    {result.feedback}
                  </p>
                )}
              </div>
            </div>

            {/* Reference definition */}
            <div className="glass-card px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider mb-1"
                 style={{ color: 'rgba(0,212,255,0.4)' }}>参考释义</p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(220,240,255,0.85)' }}>
                {q.definition}
              </p>
            </div>

            <button onClick={next} className="neon-cta w-full">
              {idx + 1 >= total ? '查看结果 🏆' : '下一题 →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
