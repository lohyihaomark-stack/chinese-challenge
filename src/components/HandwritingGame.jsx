import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import HanziWriter from 'hanzi-writer'
import { addXP, trackMissionProgress, trackWordResult } from '../utils/userStore'
import { nextQuestions } from '../utils/questionEngine'
import { speak } from '../utils/speech'

const MAX_QUESTIONS = 15
const XP_CORRECT   = 15
const XP_PRACTICED =  5
const HANZI_RE     = /[一-鿿㐀-䶿]/

/* ── Tone-colour pinyin ──────────────────────────────── */
const TONE_COLORS = {
  1: '#f87171', 2: '#fbbf24', 3: '#4ade80', 4: '#60a5fa',
  0: 'rgba(200,220,255,0.55)',
}
function getTone(s) {
  if (/[āēīōūǖĀĒĪŌŪǕ]/.test(s)) return 1
  if (/[áéíóúǘÁÉÍÓÚǗ]/.test(s)) return 2
  if (/[ǎěǐǒǔǚǍĚǏǑǓǙ]/.test(s)) return 3
  if (/[àèìòùǜÀÈÌÒÙǛ]/.test(s)) return 4
  return 0
}
function TonedPinyin({ pinyin }) {
  const syls = pinyin.split(' ')
  return (
    <span className="text-xl font-bold tracking-wider">
      {syls.map((s, i) => (
        <span key={i} style={{ color: TONE_COLORS[getTone(s)] }}>
          {s}{i < syls.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  )
}

/* ── HanziWriter data loader ─────────────────────────── */
function loadCharData(char, cb) {
  fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${char}.json`)
    .then(r => r.json()).then(cb).catch(() => cb(null))
}

/* ── Animated stroke-order reveal ───────────────────── */
function CharReveal({ char }) {
  const divRef    = useRef(null)
  const writerRef = useRef(null)
  useEffect(() => {
    if (!divRef.current) return
    divRef.current.innerHTML = ''
    writerRef.current = HanziWriter.create(divRef.current, char, {
      width: 120, height: 120, padding: 8,
      showOutline: true,
      strokeColor:  '#8B2500',
      outlineColor: '#d4a070',
      charDataLoader: loadCharData,
    })
    const t = setTimeout(() => writerRef.current?.animateCharacter(), 300)
    return () => clearTimeout(t)
  }, [char])

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        ref={divRef}
        style={{
          width: 120, height: 120,
          background: '#fff', borderRadius: 10,
          border: '2px solid rgba(6,214,160,0.5)',
          boxShadow: '0 0 14px rgba(6,214,160,0.2)',
        }}
      />
      <button
        onClick={() => writerRef.current?.animateCharacter()}
        className="text-xs font-bold px-3 py-1 rounded-full transition-all active:scale-95"
        style={{
          background: 'rgba(6,214,160,0.12)',
          border: '1px solid rgba(6,214,160,0.4)',
          color: '#06d6a0',
        }}
      >
        ▶ 重播
      </button>
    </div>
  )
}

/* ── 田字格 drawing canvas (exposes capture() via ref) ── */
const CharCanvas = forwardRef(function CharCanvas({ size, questionIdx, charIdx }, ref) {
  const canvasRef = useRef(null)
  const painting  = useRef(false)
  const lastPt    = useRef(null)
  const dpr       = (typeof window !== 'undefined' && window.devicePixelRatio) || 1

  /* Expose capture() to parent so it can snapshot the drawing */
  useImperativeHandle(ref, () => ({
    capture: () => canvasRef.current?.toDataURL('image/png') ?? null,
  }))

  const drawGrid = (ctx) => {
    const w = size, h = size
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#fdf8f0'
    ctx.fillRect(0, 0, w, h)
    // Outer border
    ctx.strokeStyle = 'rgba(90,40,8,0.7)'
    ctx.lineWidth = 2
    ctx.strokeRect(1.5, 1.5, w - 3, h - 3)
    // Faint diagonals
    ctx.save()
    ctx.strokeStyle = 'rgba(160,100,40,0.12)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(5, 5);     ctx.lineTo(w - 5, h - 5); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(w - 5, 5); ctx.lineTo(5, h - 5);     ctx.stroke()
    ctx.restore()
    // Centre cross dashed
    ctx.save()
    ctx.strokeStyle = 'rgba(180,40,20,0.35)'
    ctx.lineWidth = 1
    const dash = Math.max(4, Math.round(size / 28))
    ctx.setLineDash([dash, dash])
    ctx.beginPath(); ctx.moveTo(w / 2, 4); ctx.lineTo(w / 2, h - 4); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(4, h / 2); ctx.lineTo(w - 4, h / 2); ctx.stroke()
    ctx.restore()
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width  = size * dpr
    canvas.height = size * dpr
    canvas.style.width  = `${size}px`
    canvas.style.height = `${size}px`
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    drawGrid(ctx)
  }, [questionIdx, charIdx, size]) // eslint-disable-line react-hooks/exhaustive-deps

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const src  = e.touches ? e.touches[0] : e
    return { x: src.clientX - rect.left, y: src.clientY - rect.top }
  }
  const startPaint = (e) => {
    e.preventDefault()
    painting.current = true
    lastPt.current = getPos(e)
  }
  const doPaint = (e) => {
    e.preventDefault()
    if (!painting.current || !lastPt.current) return
    const pos = getPos(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(lastPt.current.x, lastPt.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1a0a00'
    ctx.lineWidth   = size >= 140 ? 3.5 : 3
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.stroke()
    lastPt.current = pos
  }
  const endPaint = () => { painting.current = false; lastPt.current = null }
  const clear    = () => {
    const ctx = canvasRef.current.getContext('2d')
    drawGrid(ctx)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        style={{
          cursor: 'crosshair', borderRadius: 10, touchAction: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.18), 0 0 0 1.5px rgba(0,212,255,0.15)',
        }}
        onMouseDown={startPaint} onMouseMove={doPaint}
        onMouseUp={endPaint}     onMouseLeave={endPaint}
        onTouchStart={startPaint} onTouchMove={doPaint} onTouchEnd={endPaint}
      />
      <button
        onClick={clear}
        className="text-xs font-semibold px-3 py-1 rounded-full transition-all active:scale-95"
        style={{
          background: 'rgba(247,37,133,0.1)',
          border: '1px solid rgba(247,37,133,0.3)',
          color: '#f72585',
        }}
      >
        🗑️ 清除
      </button>
    </div>
  )
})

/* ══════════════════════════════════════
   Main HandwritingGame component
   ══════════════════════════════════════ */
export default function HandwritingGame({ vocabs, unitNum }) {
  const questions   = useRef(nextQuestions(`hand_u${unitNum}`, vocabs, MAX_QUESTIONS, { unitNum }))
  const charRefs    = useRef([])    // refs to each CharCanvas — for snapshot
  const [idx,          setIdx]          = useState(0)
  const [phase,        setPhase]        = useState('draw')   // 'draw' | 'reveal'
  const [drawnImages,  setDrawnImages]  = useState([])       // captured dataURLs
  const [scores,       setScores]       = useState([])
  const [done,         setDone]         = useState(false)
  const [totalXP,      setTotalXP]      = useState(0)

  const q     = questions.current[idx]
  const total = questions.current.length
  const chars = q ? [...q.hanzi].filter(c => HANZI_RE.test(c)) : []

  const canvasSize =
    chars.length <= 1 ? 200 :
    chars.length === 2 ? 170 :
    chars.length === 3 ? 145 :
    chars.length === 4 ? 125 : 110

  /* Snapshot all canvases, then show reveal */
  const handleReveal = () => {
    const imgs = charRefs.current.map(r => r?.capture() ?? null)
    setDrawnImages(imgs)
    setPhase('reveal')
  }

  const handleMark = (isCorrect) => {
    const xp = isCorrect ? XP_CORRECT : XP_PRACTICED
    addXP(xp, 'handwriting')
    setTotalXP(prev => prev + xp)
    trackWordResult(unitNum, q.id, isCorrect)
    setScores(prev => [...prev, isCorrect ? 'correct' : 'practiced'])
    trackMissionProgress('vocab_xp', 1)
    // Reset for next question
    charRefs.current = []
    setDrawnImages([])
    if (idx + 1 >= total) {
      setDone(true)
    } else {
      setIdx(i => i + 1)
      setPhase('draw')
    }
  }

  const restart = () => {
    questions.current = nextQuestions(`hand_u${unitNum}`, vocabs, MAX_QUESTIONS, { unitNum })
    charRefs.current  = []
    setIdx(0); setPhase('draw'); setDrawnImages([])
    setScores([]); setTotalXP(0); setDone(false)
  }

  /* ── Results screen ──────────────────────────────────── */
  if (done) {
    const correct   = scores.filter(s => s === 'correct').length
    const practiced = scores.filter(s => s === 'practiced').length
    const pct       = Math.round((correct / total) * 100)
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 overflow-y-auto [&>*]:shrink-0">
        <div className="glass-card w-full max-w-sm p-6 flex flex-col items-center gap-4">
          <div className="text-6xl animate-bounceIn">
            {pct >= 80 ? '🏆' : pct >= 50 ? '✍️' : '📖'}
          </div>
          <h2 className="text-2xl font-black"
              style={{ color: '#00d4ff', textShadow: '0 0 12px rgba(0,212,255,0.5)' }}>
            练习完成！
          </h2>
          <div className="w-full text-center">
            <p className="text-4xl font-black mb-1"
               style={{ color: pct >= 80 ? '#06d6a0' : pct >= 50 ? '#ffd60a' : '#f72585' }}>
              {pct}%
            </p>
            <div className="w-full h-3 rounded-full overflow-hidden"
                 style={{ background: 'rgba(255,255,255,0.08)' }}>
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
          <div className="flex gap-8 text-center">
            <div>
              <p className="text-2xl font-black" style={{ color: '#06d6a0' }}>{correct}</p>
              <p className="text-xs font-mono" style={{ color: 'rgba(0,212,255,0.5)' }}>写对了</p>
            </div>
            <div>
              <p className="text-2xl font-black" style={{ color: '#ffd60a' }}>{practiced}</p>
              <p className="text-xs font-mono" style={{ color: 'rgba(0,212,255,0.5)' }}>需练习</p>
            </div>
          </div>
          <div className="px-4 py-2 rounded-full font-black text-base"
               style={{
                 background: 'rgba(255,214,10,0.12)',
                 border: '1px solid rgba(255,214,10,0.3)',
                 color: '#ffd60a',
               }}>
            +{totalXP} XP 已获得 ✨
          </div>
          <button onClick={restart} className="neon-cta w-full">再练一次 🔄</button>
        </div>
      </div>
    )
  }

  /* ── Main game screen ────────────────────────────────── */
  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* Progress bar */}
      <div className="shrink-0 px-4 pt-3 pb-1">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-mono" style={{ color: 'rgba(0,212,255,0.5)' }}>
            第 {idx + 1} / {total} 题
          </span>
          <div className="flex gap-1.5 flex-wrap justify-end">
            {scores.map((s, i) => (
              <span key={i} className="text-sm">{s === 'correct' ? '✅' : '📝'}</span>
            ))}
          </div>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden"
             style={{ background: 'rgba(0,212,255,0.1)' }}>
          <div className="h-full rounded-full transition-all duration-500"
               style={{
                 width: `${(idx / total) * 100}%`,
                 background: 'linear-gradient(90deg,#00d4ff,#9b5de5)',
               }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-5 [&>*]:shrink-0">

        {/* ── Prompt: pinyin + definition ── */}
        <div className="glass-card w-full max-w-lg p-5 flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <TonedPinyin pinyin={q.pinyin} />
            <button
              onClick={() => speak(q.hanzi)}
              className="text-2xl hover:scale-125 transition-transform shrink-0"
              aria-label={`朗读 ${q.hanzi}`}
            >🔊</button>
          </div>
          <div className="w-full text-center">
            <p className="text-xs font-bold uppercase tracking-wider mb-1"
               style={{ color: 'rgba(0,212,255,0.5)' }}>释义</p>
            <p className="text-base leading-relaxed"
               style={{ color: 'rgba(220,240,255,0.92)' }}>
              {q.definition}
            </p>
          </div>
          <p className="text-xs font-mono" style={{ color: 'rgba(0,212,255,0.4)' }}>
            提示：共 {chars.length} 个汉字
          </p>
        </div>

        {/* ══════════ DRAW PHASE ══════════ */}
        {phase === 'draw' && (
          <>
            <p className="text-sm font-semibold text-center"
               style={{ color: 'rgba(0,212,255,0.65)' }}>
              ✍️ 根据拼音和释义，在田字格里写出这个词语
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              {chars.map((_, i) => (
                <CharCanvas
                  key={`${idx}-${i}`}
                  ref={el => { charRefs.current[i] = el }}
                  size={canvasSize}
                  questionIdx={idx}
                  charIdx={i}
                />
              ))}
            </div>

            <button
              onClick={handleReveal}
              className="neon-cta w-full max-w-lg py-3 text-base font-black"
            >
              查看答案 →
            </button>
          </>
        )}

        {/* ══════════ REVEAL PHASE — side-by-side comparison ══════════ */}
        {phase === 'reveal' && (
          <>
            {/* Column headers */}
            <div className="w-full max-w-lg flex justify-around px-4">
              <span className="text-sm font-black"
                    style={{ color: 'rgba(155,93,229,0.85)' }}>✏️ 你写的</span>
              <span className="text-sm font-black"
                    style={{ color: 'rgba(6,214,160,0.85)' }}>✅ 正确答案</span>
            </div>

            {/* Per-character comparison rows */}
            <div className="glass-card w-full max-w-lg p-5 flex flex-col gap-6">
              {chars.map((char, i) => (
                <div key={i} className="flex items-center justify-around gap-3">

                  {/* ── Student's drawing ── */}
                  <div className="flex flex-col items-center gap-1.5">
                    {drawnImages[i]
                      ? (
                        <img
                          src={drawnImages[i]}
                          alt="你写的"
                          style={{
                            width: 120, height: 120,
                            borderRadius: 10,
                            border: '2px solid rgba(155,93,229,0.5)',
                            boxShadow: '0 0 14px rgba(155,93,229,0.2)',
                          }}
                        />
                      )
                      : (
                        <div style={{
                          width: 120, height: 120, borderRadius: 10,
                          background: 'rgba(255,255,255,0.04)',
                          border: '2px solid rgba(155,93,229,0.25)',
                        }} />
                      )
                    }
                    <span className="text-xs font-semibold"
                          style={{ color: 'rgba(155,93,229,0.75)' }}>
                      你写的
                    </span>
                  </div>

                  {/* ── Divider arrow ── */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <span className="text-xl" style={{ color: 'rgba(255,255,255,0.2)' }}>→</span>
                    <span className="text-2xl font-black"
                          style={{ color: '#e8f4ff', textShadow: '0 0 12px rgba(0,212,255,0.4)' }}>
                      {char}
                    </span>
                  </div>

                  {/* ── Correct answer with stroke animation ── */}
                  <div className="flex flex-col items-center gap-1.5">
                    <CharReveal char={char} />
                    <span className="text-xs font-semibold"
                          style={{ color: 'rgba(6,214,160,0.75)' }}>
                      正确答案
                    </span>
                  </div>

                </div>
              ))}

              {/* Full word + collocations */}
              <div className="border-t pt-4 flex flex-col items-center gap-3"
                   style={{ borderColor: 'rgba(0,212,255,0.1)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-black"
                        style={{ color: '#e8f4ff', textShadow: '0 0 20px rgba(0,212,255,0.4)' }}>
                    {q.hanzi}
                  </span>
                  <button onClick={() => speak(q.hanzi)}
                          className="text-xl hover:scale-125 transition-transform"
                          aria-label="朗读">🔊</button>
                </div>
                {q.collocations?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {q.collocations.map((c, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              background: 'rgba(255,214,10,0.08)',
                              border: '1px solid rgba(255,214,10,0.25)',
                              color: 'rgba(255,214,10,0.8)',
                            }}>
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Self-mark */}
            <div className="w-full max-w-lg flex flex-col gap-3">
              <p className="text-center text-sm font-semibold"
                 style={{ color: 'rgba(0,212,255,0.55)' }}>
                对比一下，你写对了吗？
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleMark(false)}
                  className="flex-1 py-4 rounded-2xl font-black text-base transition-all active:scale-95 flex flex-col items-center gap-0.5"
                  style={{
                    background: 'rgba(247,37,133,0.13)',
                    border: '1.5px solid rgba(247,37,133,0.4)',
                    color: '#f72585',
                  }}
                >
                  <span>📝 需要练习</span>
                  <span className="text-xs font-mono opacity-60">+{XP_PRACTICED} XP</span>
                </button>
                <button
                  onClick={() => handleMark(true)}
                  className="flex-1 py-4 rounded-2xl font-black text-base transition-all active:scale-95 flex flex-col items-center gap-0.5"
                  style={{
                    background: 'rgba(6,214,160,0.13)',
                    border: '1.5px solid rgba(6,214,160,0.4)',
                    color: '#06d6a0',
                  }}
                >
                  <span>✅ 写对了！</span>
                  <span className="text-xs font-mono opacity-60">+{XP_CORRECT} XP</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
