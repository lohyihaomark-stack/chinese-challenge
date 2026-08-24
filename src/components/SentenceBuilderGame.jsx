import { useState, useRef, useEffect } from 'react'
import { addXP, addCoins, trackWordResult, trackModeUse } from '../utils/userStore'
import { nextQuestions } from '../utils/questionEngine'
import { speak } from '../utils/speech'

const MAX_QUESTIONS = 8

const VERDICT = {
  correct: { emoji: '✅', label: '写得好！', color: '#06d6a0', xp: 25, coins: 5,
             bg: 'rgba(6,214,160,0.1)',  border: 'rgba(6,214,160,0.4)' },
  partial: { emoji: '🟡', label: '接近了',   color: '#ffd60a', xp: 12, coins: 2,
             bg: 'rgba(255,214,10,0.1)', border: 'rgba(255,214,10,0.4)' },
  wrong:   { emoji: '📝', label: '再试试',   color: '#f72585', xp: 3,  coins: 0,
             bg: 'rgba(247,37,133,0.08)', border: 'rgba(247,37,133,0.35)' },
}

/* ── Tone-coloured pinyin ── */
const TONE_COLORS = { 1: '#f87171', 2: '#fbbf24', 3: '#4ade80', 4: '#60a5fa', 0: 'rgba(200,220,255,0.55)' }
function getTone(s) {
  if (/[āēīōūǖĀĒĪŌŪǕ]/.test(s)) return 1
  if (/[áéíóúǘÁÉÍÓÚǗ]/.test(s)) return 2
  if (/[ǎěǐǒǔǚǍĚǏǑǓǙ]/.test(s)) return 3
  if (/[àèìòùǜÀÈÌÒÙǛ]/.test(s)) return 4
  return 0
}
function TonedPinyin({ pinyin }) {
  const syls = (pinyin || '').split(' ')
  return (
    <span className="font-bold tracking-wider">
      {syls.map((s, i) => (
        <span key={i} style={{ color: TONE_COLORS[getTone(s)] }}>{s}{i < syls.length - 1 ? ' ' : ''}</span>
      ))}
    </span>
  )
}

export default function SentenceBuilderGame({ vocabs, unitNum }) {
  const questions = useRef(nextQuestions(`sentence_u${unitNum}`, vocabs, MAX_QUESTIONS, { unitNum }))
  const [idx,      setIdx]      = useState(0)
  const [text,     setText]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [history,  setHistory]  = useState([])
  const [done,     setDone]     = useState(false)
  const [totalXP,  setTotalXP]  = useState(0)
  const inputRef = useRef(null)

  const q     = questions.current[idx]
  const total = questions.current.length

  useEffect(() => { if (!result && inputRef.current) inputRef.current.focus() }, [idx, result])

  const submit = async () => {
    const sentence = text.trim()
    if (!sentence || loading) return
    setLoading(true)
    trackModeUse('sentence')
    try {
      const resp = await fetch('/api/check-sentence', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hanzi:      q.hanzi,
          pinyin:     q.pinyin,
          definition: q.definition,
          example:    q.example,
          studentSentence: sentence,
        }),
      })
      const data = await resp.json()
      const cfg  = VERDICT[data.verdict] || VERDICT.partial

      addXP(cfg.xp, 'sentence_writing')
      if (cfg.coins > 0) addCoins(cfg.coins)
      setTotalXP(p => p + cfg.xp)
      trackWordResult(unitNum, q.id, data.verdict === 'correct')

      setResult({ verdict: data.verdict, feedback: data.feedback, suggestion: data.suggestion, cfg })
      setHistory(h => [...h, { hanzi: q.hanzi, sentence, verdict: data.verdict }])
    } catch {
      const cfg = VERDICT.partial
      setResult({ verdict: 'partial', feedback: 'AI 老师暂时无法连接，请稍后再试。', suggestion: '', cfg })
      setHistory(h => [...h, { hanzi: q.hanzi, sentence, verdict: 'partial' }])
    } finally {
      setLoading(false)
    }
  }

  const next = () => {
    if (idx + 1 >= total) { setDone(true); return }
    setIdx(i => i + 1); setText(''); setResult(null)
  }

  const restart = () => {
    questions.current = nextQuestions(`sentence_u${unitNum}`, vocabs, MAX_QUESTIONS, { unitNum })
    setIdx(0); setText(''); setResult(null); setHistory([]); setTotalXP(0); setDone(false)
  }

  /* ── Results screen ────────────────────────────────────── */
  if (done) {
    const good    = history.filter(h => h.verdict === 'correct').length
    const partial = history.filter(h => h.verdict === 'partial').length
    const pct     = Math.round(((good + partial * 0.5) / total) * 100)
    return (
      <div className="flex-1 overflow-y-auto p-5 flex flex-col items-center gap-5 [&>*]:shrink-0">
        <div className="glass-card w-full max-w-lg p-6 flex flex-col items-center gap-4">
          <div className="text-6xl animate-bounceIn">{pct >= 80 ? '🏆' : pct >= 50 ? '🌟' : '📖'}</div>
          <h2 className="text-2xl font-black" style={{ color: '#00d4ff', textShadow: '0 0 12px rgba(0,212,255,0.5)' }}>
            造句练习完成！
          </h2>
          <p className="text-4xl font-black" style={{ color: pct >= 80 ? '#06d6a0' : pct >= 50 ? '#ffd60a' : '#f72585' }}>
            {pct}%
          </p>
          <div className="flex gap-8 text-center">
            <div>
              <p className="text-2xl font-black" style={{ color: '#06d6a0' }}>{good}</p>
              <p className="text-xs font-mono" style={{ color: 'rgba(0,212,255,0.5)' }}>写得好</p>
            </div>
            <div>
              <p className="text-2xl font-black" style={{ color: '#ffd60a' }}>{partial}</p>
              <p className="text-xs font-mono" style={{ color: 'rgba(0,212,255,0.5)' }}>接近了</p>
            </div>
            <div>
              <p className="text-2xl font-black" style={{ color: '#f72585' }}>{total - good - partial}</p>
              <p className="text-xs font-mono" style={{ color: 'rgba(0,212,255,0.5)' }}>再试试</p>
            </div>
          </div>
          <div className="px-4 py-2 rounded-full font-black text-base"
               style={{ background: 'rgba(255,214,10,0.12)', border: '1px solid rgba(255,214,10,0.3)', color: '#ffd60a' }}>
            +{totalXP} XP 已获得 ✨
          </div>
        </div>

        {/* Their sentences */}
        <div className="glass-card w-full max-w-lg p-5 flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(0,212,255,0.45)' }}>
            你写的句子
          </p>
          {history.map((h, i) => {
            const c = VERDICT[h.verdict]
            return (
              <div key={i} className="rounded-xl p-3" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                <p className="text-sm font-black mb-1" style={{ color: c.color }}>{c.emoji} {h.hanzi}</p>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(220,240,255,0.85)' }}>{h.sentence}</p>
              </div>
            )
          })}
        </div>

        <button onClick={restart} className="neon-cta w-full max-w-lg">再练一次 🔄</button>
      </div>
    )
  }

  if (!q) return null

  /* ── Question screen ───────────────────────────────────── */
  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* Progress */}
      <div className="shrink-0 px-4 pt-3 pb-1">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-mono" style={{ color: 'rgba(0,212,255,0.5)' }}>
            第 {idx + 1} / {total} 题
          </span>
          <div className="flex gap-1.5 flex-wrap justify-end">
            {history.map((h, i) => (
              <span key={i} className="text-sm">{VERDICT[h.verdict].emoji}</span>
            ))}
          </div>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,212,255,0.1)' }}>
          <div className="h-full rounded-full transition-all duration-500"
               style={{ width: `${(idx / total) * 100}%`, background: 'linear-gradient(90deg,#00d4ff,#9b5de5)' }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-4 [&>*]:shrink-0">

        {/* Word card */}
        <div className="glass-card w-full max-w-lg p-5 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <span className="text-5xl font-black leading-tight"
                  style={{ color: '#e8f4ff', textShadow: '0 0 24px rgba(0,212,255,0.4)' }}>
              {q.hanzi}
            </span>
            <button onClick={() => speak(q.hanzi)}
                    className="text-2xl hover:scale-125 transition-transform shrink-0"
                    aria-label={`朗读 ${q.hanzi}`}>🔊</button>
          </div>
          <TonedPinyin pinyin={q.pinyin} />
          <div className="w-full text-center">
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(0,212,255,0.45)' }}>释义</p>
            <p className="text-base leading-relaxed" style={{ color: 'rgba(220,240,255,0.9)' }}>{q.definition}</p>
          </div>
          {q.collocations?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center">
              {q.collocations.map((c, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(255,214,10,0.08)', border: '1px solid rgba(255,214,10,0.28)', color: 'rgba(255,214,10,0.85)' }}>
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Writing area */}
        <div className="glass-card w-full max-w-lg p-5 flex flex-col gap-3">
          <p className="text-sm font-semibold text-center" style={{ color: 'rgba(0,212,255,0.7)' }}>
            🖊️ 用「<span style={{ color: '#ffd60a', fontWeight: 900 }}>{q.hanzi}</span>」写一个完整的句子
          </p>
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
            disabled={!!result || loading}
            placeholder={`例如：我今天…（句子里要用到「${q.hanzi}」）`}
            rows={3}
            maxLength={200}
            className="w-full cyber-input resize-none text-base leading-relaxed"
            style={{ fontFamily: 'inherit', textAlign: 'left' }}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono" style={{ color: 'rgba(0,212,255,0.3)' }}>{text.length}/200</span>
            {!result && (
              <button onClick={submit} disabled={!text.trim() || loading}
                      className="neon-cta px-6 py-2 text-sm disabled:opacity-40">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 rounded-full animate-spin"
                          style={{ borderColor: 'rgba(0,212,255,0.6)', borderTopColor: 'transparent' }} />
                    AI 老师批改中…
                  </span>
                ) : '提交给老师 →'}
              </button>
            )}
          </div>
        </div>

        {/* AI feedback */}
        {result && (
          <div className="w-full max-w-lg flex flex-col gap-3 animate-fadeIn">

            <div className="rounded-2xl p-4 flex items-start gap-3"
                 style={{ background: result.cfg.bg, border: `1px solid ${result.cfg.border}` }}>
              <span className="text-3xl shrink-0">{result.cfg.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-black text-lg leading-tight" style={{ color: result.cfg.color }}>
                  {result.cfg.label}
                  <span className="ml-2 text-sm font-mono" style={{ color: '#ffd60a' }}>
                    +{result.cfg.xp} XP{result.cfg.coins > 0 ? ` · +${result.cfg.coins} 🪙` : ''}
                  </span>
                </p>
                {result.feedback && (
                  <p className="text-sm mt-1 leading-relaxed" style={{ color: 'rgba(220,240,255,0.85)' }}>
                    {result.feedback}
                  </p>
                )}
              </div>
            </div>

            {result.suggestion && (
              <div className="glass-card px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(6,214,160,0.55)' }}>
                  💡 老师的建议
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(220,240,255,0.88)' }}>
                  {result.suggestion}
                </p>
              </div>
            )}

            <div className="glass-card px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(0,212,255,0.4)' }}>
                📖 参考例句
              </p>
              <p className="text-sm leading-relaxed italic" style={{ color: 'rgba(200,230,255,0.75)' }}>
                {q.example}
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
