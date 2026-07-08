import { useState, useEffect, useMemo, useRef } from 'react'
import { speak } from '../../utils/speech'
import { addCoins, trackMissionProgress, saveCombatTier } from '../../utils/userStore'
import { buildHanziOptions, buildDefinitionOptions } from '../../utils/questionEngine'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const PHASE_A_COUNT = 3   // 听音辨义
const PHASE_B_COUNT = 3   // 看句填词
const PHASE_C_COUNT = 2   // 默写补字
const PHASE_A_TIME  = 10
const PHASE_B_TIME  = 12
const PHASE_C_TIME  = 18

/* ── Helpers ───────────────────────────────────────────── */

// Similarity-ranked distractors so wrong options are plausible near-misses.
function pickDefinitionOptions(correct, pool) {
  return buildDefinitionOptions(correct, pool, 4)
}
function pickHanziOptions(correct, pool) {
  return buildHanziOptions(correct, pool, 4)
}

// Build character order puzzle: take the hanzi, split into chars, add 1-2 distractors
function makeCharPuzzle(correct, pool) {
  const chars = Array.from(correct.hanzi)
  // collect random extra chars from other words
  const otherChars = []
  shuffle(pool).forEach(v => {
    if (v.id === correct.id) return
    Array.from(v.hanzi).forEach(c => {
      if (!chars.includes(c) && !otherChars.includes(c)) otherChars.push(c)
    })
  })
  const distractorCount = chars.length >= 4 ? 1 : 2
  const distractors = otherChars.slice(0, distractorCount)
  return shuffle([...chars, ...distractors])
}

/* ── Component ─────────────────────────────────────────── */
export default function GrandmasterTier({ vocabs, unitNum, onBack }) {

  // Pick question sets up-front for stability
  const setA = useMemo(() => shuffle([...vocabs]).slice(0, PHASE_A_COUNT), [vocabs])
  const setB = useMemo(() => shuffle(vocabs.filter(v => v.sentence)).slice(0, PHASE_B_COUNT), [vocabs])
  const setC = useMemo(() => shuffle(vocabs.filter(v => Array.from(v.hanzi).length >= 2)).slice(0, PHASE_C_COUNT), [vocabs])

  const [phase, setPhase]       = useState('intro')   // 'intro' | 'A' | 'B' | 'C' | 'victory' | 'defeat'
  const [qIdx,  setQIdx]        = useState(0)
  const [scoreA, setScoreA]     = useState(0)
  const [scoreB, setScoreB]     = useState(0)
  const [scoreC, setScoreC]     = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [phaseTransition, setPT]= useState(null)

  /* ── Phase transition helper ── */
  const advancePhase = (next) => {
    setPT(next)
    setTimeout(() => {
      setPhase(next)
      setQIdx(0)
      setPT(null)
    }, 1500)
  }

  const onPhaseDone = (which) => {
    if (which === 'A') advancePhase('B')
    else if (which === 'B') advancePhase('C')
    else finalize()
  }

  const finalize = () => {
    const total = scoreA + scoreB + scoreC
    const max = PHASE_A_COUNT + PHASE_B_COUNT + PHASE_C_COUNT
    if (total >= Math.ceil(max * 0.5)) {
      saveCombatTier(unitNum, 'grandmaster', { score: total })
      addCoins(10)
      if (mistakes === 0) addCoins(6)
      trackMissionProgress('boss:perfect')
      trackMissionProgress('match:complete')
      setPhase('victory')
    } else {
      setPhase('defeat')
    }
  }

  /* ── Intro ── */
  if (phase === 'intro') {
    return (
      <div className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-b from-purple-900 via-purple-800 to-purple-950 text-cream p-6 [&>*]:shrink-0">
        <button onClick={onBack} className="text-cream/70 hover:text-cream text-sm font-bold mb-4 self-start">← 退出</button>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
          <div className="text-7xl animate-pop">👑</div>
          <p className="text-gold text-xs tracking-widest">✦ 最高试炼 ✦</p>
          <h2 className="text-3xl font-black">宗师挑战</h2>
          <p className="text-cream/85 text-base max-w-md">
            听音、辨意、默字 —— 三阶段总试炼。
          </p>
          <div className="flex flex-col gap-2 max-w-sm w-full mt-2">
            <div className="bg-cream/10 border border-cream/25 rounded-xl px-4 py-3 backdrop-blur">
              <p className="text-gold font-black">🎧 第一关：听音辨义</p>
              <p className="text-cream/75 text-sm">听词语朗读，选出正确释义（{PHASE_A_COUNT} 题，{PHASE_A_TIME}s 每题）</p>
            </div>
            <div className="bg-cream/10 border border-cream/25 rounded-xl px-4 py-3 backdrop-blur">
              <p className="text-gold font-black">📖 第二关：看句填词</p>
              <p className="text-cream/75 text-sm">阅读句子，选出最合适的词语（{PHASE_B_COUNT} 题，{PHASE_B_TIME}s 每题）</p>
            </div>
            <div className="bg-cream/10 border border-cream/25 rounded-xl px-4 py-3 backdrop-blur">
              <p className="text-gold font-black">✍️ 第三关：默写补字</p>
              <p className="text-cream/75 text-sm">按顺序点击汉字组成词语（{PHASE_C_COUNT} 题，{PHASE_C_TIME}s 每题）</p>
            </div>
          </div>
          <p className="text-cream/55 text-sm mt-2">通过即获得 <strong className="text-gold">2x 伤害加成</strong></p>
          <button
            onClick={() => advancePhase('A')}
            className="mt-3 bg-gradient-to-br from-gold to-amber-600 text-brick px-10 py-3 rounded-2xl font-black text-lg shadow-2xl hover:scale-105 active:scale-100 transition-all border-2 border-cream/40"
          >
            开始试炼 ⚔️
          </button>
        </div>
      </div>
    )
  }

  /* ── Phase transition card ── */
  if (phaseTransition) {
    const label = phaseTransition === 'A' ? '🎧 第一关 · 听音辨义'
                : phaseTransition === 'B' ? '📖 第二关 · 看句填词'
                : '✍️ 第三关 · 默写补字'
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-purple-900 to-purple-950 text-cream">
        <div className="text-center animate-pop">
          <p className="text-gold text-sm tracking-widest mb-2">下一阶段</p>
          <h2 className="text-3xl font-black">{label}</h2>
          <p className="text-cream/60 text-sm mt-3">准备...</p>
        </div>
      </div>
    )
  }

  /* ── Victory ── */
  if (phase === 'victory') {
    const total = scoreA + scoreB + scoreC
    const max = PHASE_A_COUNT + PHASE_B_COUNT + PHASE_C_COUNT
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4 bg-gradient-to-b from-purple-900 to-purple-950 text-cream">
        <div className="text-7xl animate-pop">👑</div>
        <h2 className="text-3xl font-black text-gold">宗师试炼通关！</h2>
        <p className="text-cream/80">你已达到宗师之境，可对魔王造成 <strong className="text-gold">2x 伤害</strong></p>
        <div className="bg-cream/10 border-2 border-gold/40 rounded-2xl px-6 py-4 backdrop-blur flex flex-col items-center gap-1">
          <p className="text-sm text-cream/60">总分</p>
          <p className="text-4xl font-black text-gold">{total} / {max}</p>
          <div className="flex gap-3 text-sm mt-2">
            <span>🎧 {scoreA}/{PHASE_A_COUNT}</span>
            <span>📖 {scoreB}/{PHASE_B_COUNT}</span>
            <span>✍️ {scoreC}/{PHASE_C_COUNT}</span>
          </div>
        </div>
        {mistakes === 0 && (
          <p className="text-gold font-black text-lg px-4 py-2 rounded-full bg-gold/15 border border-gold/40 animate-glow">
            ⚡ 完美宗师！+6 🪙 奖励 ⚡
          </p>
        )}
        <p className="text-gold font-bold">+10 🪙 · 解锁 2x 伤害加成</p>
        <button onClick={onBack} className="mt-2 bg-gold text-brick px-8 py-3 rounded-xl font-black text-lg hover:scale-105 transition-all shadow-lg">
          返回斗争大厅
        </button>
      </div>
    )
  }

  /* ── Defeat ── */
  if (phase === 'defeat') {
    const total = scoreA + scoreB + scoreC
    const max = PHASE_A_COUNT + PHASE_B_COUNT + PHASE_C_COUNT
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="text-7xl animate-pop">💀</div>
        <h2 className="text-3xl font-black text-brick">试炼失败</h2>
        <p className="text-brick/65">未达到通关线（{Math.ceil(max * 0.5)}/{max} 题）</p>
        <p className="text-base text-brick/55">你的成绩：{total} / {max}</p>
        <p className="text-brick/55 text-sm">回到词汇表多复习一下，再来挑战！</p>
        <div className="flex gap-2 mt-2">
          <button onClick={onBack} className="bg-cream-dark text-brick px-6 py-3 rounded-xl font-bold hover:bg-cream-dark/70">
            返回大厅
          </button>
          <button onClick={() => window.location.reload()} className="bg-brick text-cream px-6 py-3 rounded-xl font-bold hover:bg-brick-mid">
            再战 ⚔️
          </button>
        </div>
      </div>
    )
  }

  /* ── Phase rendering ── */
  const phaseTotal = phase === 'A' ? PHASE_A_COUNT : phase === 'B' ? PHASE_B_COUNT : PHASE_C_COUNT

  const onPhaseAnswer = (correct) => {
    if (!correct) setMistakes(m => m + 1)
    if (phase === 'A' && correct) setScoreA(s => s + 1)
    if (phase === 'B' && correct) setScoreB(s => s + 1)
    if (phase === 'C' && correct) setScoreC(s => s + 1)
    if (correct) addCoins(1)

    if (qIdx + 1 >= phaseTotal) {
      setTimeout(() => onPhaseDone(phase), 800)
    } else {
      setTimeout(() => setQIdx(i => i + 1), 800)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-purple-900 to-purple-950 text-cream">

      {/* Header */}
      <div className="px-4 py-3 shrink-0 flex items-center justify-between border-b border-cream/15">
        <button onClick={onBack} className="text-cream/70 hover:text-cream text-sm font-bold">← 退出</button>
        <div className="text-center">
          <p className="text-gold text-xs tracking-widest">宗师挑战</p>
          <p className="text-cream font-black">
            {phase === 'A' && '🎧 听音辨义'}
            {phase === 'B' && '📖 看句填词'}
            {phase === 'C' && '✍️ 默写补字'}
          </p>
        </div>
        <div className="text-cream/70 text-sm">{qIdx + 1}/{phaseTotal}</div>
      </div>

      {/* Phase body */}
      <div className="flex-1 overflow-y-auto p-4">
        {phase === 'A' && (
          <ListeningPhase key={`A-${qIdx}`} vocab={setA[qIdx]} pool={vocabs} timeLimit={PHASE_A_TIME} onAnswer={onPhaseAnswer} />
        )}
        {phase === 'B' && (
          <ClozePhase key={`B-${qIdx}`} vocab={setB[qIdx]} pool={vocabs} timeLimit={PHASE_B_TIME} onAnswer={onPhaseAnswer} />
        )}
        {phase === 'C' && (
          <CharOrderPhase key={`C-${qIdx}`} vocab={setC[qIdx]} pool={vocabs} timeLimit={PHASE_C_TIME} onAnswer={onPhaseAnswer} />
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   PHASE A — Listening Discrimination
   ══════════════════════════════════════════════════════════ */
function ListeningPhase({ vocab, pool, timeLimit, onAnswer }) {
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [selected, setSelected] = useState(null)
  const options = useMemo(() => vocab ? pickDefinitionOptions(vocab, pool) : [], [vocab])
  const answeredRef = useRef(false)

  // Auto-speak on mount
  useEffect(() => {
    if (vocab) {
      const t = setTimeout(() => speak(vocab.hanzi), 250)
      return () => clearTimeout(t)
    }
  }, [vocab])

  useEffect(() => {
    if (answeredRef.current) return
    if (timeLeft <= 0) {
      answeredRef.current = true
      setSelected('__timeout__')
      onAnswer(false)
      return
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft])

  const handle = (def) => {
    if (answeredRef.current) return
    answeredRef.current = true
    setSelected(def)
    onAnswer(def === vocab.definition)
  }

  if (!vocab) return null

  const optClass = (def) => {
    const base = 'w-full text-left px-3 py-3 rounded-xl border-2 transition-all'
    if (!selected)               return `${base} bg-cream/10 border-cream/25 text-cream hover:bg-cream/20 cursor-pointer`
    if (def === vocab.definition)return `${base} bg-emerald-500/25 border-emerald-400 text-cream`
    if (def === selected)        return `${base} bg-red-500/25 border-red-400 text-cream animate-shake`
    return                              `${base} bg-cream/5 border-cream/15 text-cream/40`
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Timer */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className={`font-bold ${timeLeft <= 3 ? 'text-red-300 animate-pulse' : 'text-cream/80'}`}>⏱ {timeLeft}s</span>
        </div>
        <div className="bg-black/40 h-2 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${timeLeft <= 3 ? 'bg-red-400' : 'bg-gold'}`}
               style={{ width: `${(timeLeft / timeLimit) * 100}%` }} />
        </div>
      </div>

      <div className="bg-cream/10 border-2 border-gold/40 rounded-2xl p-6 backdrop-blur text-center">
        <p className="text-gold text-xs tracking-widest mb-2">点击播放词语</p>
        <button onClick={() => speak(vocab.hanzi)} className="text-7xl hover:scale-110 transition-transform">
          🔊
        </button>
        <p className="text-cream/60 text-sm mt-2">选出正确的释义</p>
        {selected && (
          <p className="text-cream font-black text-2xl mt-3 animate-fadeIn">{vocab.hanzi} · {vocab.pinyin}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {options.map(def => (
          <button key={def} onClick={() => handle(def)} className={optClass(def)}>
            {def}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   PHASE B — Sentence Cloze
   ══════════════════════════════════════════════════════════ */
function ClozePhase({ vocab, pool, timeLimit, onAnswer }) {
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [selected, setSelected] = useState(null)
  const options = useMemo(() => vocab ? pickHanziOptions(vocab, pool) : [], [vocab])
  const answeredRef = useRef(false)

  useEffect(() => {
    if (answeredRef.current) return
    if (timeLeft <= 0) {
      answeredRef.current = true
      setSelected('__timeout__')
      onAnswer(false)
      return
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft])

  const handle = (h) => {
    if (answeredRef.current) return
    answeredRef.current = true
    setSelected(h)
    if (h === vocab.hanzi) speak(h)
    onAnswer(h === vocab.hanzi)
  }

  if (!vocab) return null
  const parts = vocab.sentence.split('___')

  const optClass = (h) => {
    const base = 'flex-1 min-w-[calc(50%-6px)] text-center px-3 py-3 rounded-xl border-2 font-bold text-xl transition-all'
    if (!selected)           return `${base} bg-cream/10 border-cream/25 text-cream hover:bg-cream/20 cursor-pointer`
    if (h === vocab.hanzi)   return `${base} bg-emerald-500/25 border-emerald-400 text-cream`
    if (h === selected)      return `${base} bg-red-500/25 border-red-400 text-cream animate-shake`
    return                          `${base} bg-cream/5 border-cream/15 text-cream/40`
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className={`font-bold ${timeLeft <= 3 ? 'text-red-300 animate-pulse' : 'text-cream/80'}`}>⏱ {timeLeft}s</span>
        </div>
        <div className="bg-black/40 h-2 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${timeLeft <= 3 ? 'bg-red-400' : 'bg-gold'}`}
               style={{ width: `${(timeLeft / timeLimit) * 100}%` }} />
        </div>
      </div>

      <div className="bg-cream/10 border-2 border-gold/40 rounded-2xl p-4 backdrop-blur">
        <p className="text-gold text-xs tracking-widest mb-2">填入正确词语</p>
        <p className="text-cream text-lg leading-relaxed">
          {parts[0]}
          {selected ? (
            <span className={`inline mx-1 px-1.5 rounded font-black ${
              selected === vocab.hanzi ? 'text-emerald-300 bg-emerald-500/20' : 'text-red-300 bg-red-500/20'
            }`}>{vocab.hanzi}</span>
          ) : (
            <span className="inline-block mx-1 px-4 border-b-2 border-cream/60 text-cream/30 font-black align-bottom">＿＿</span>
          )}
          {parts[1] || ''}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {options.map(h => (
          <button key={h} onClick={() => handle(h)} className={optClass(h)}>{h}</button>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   PHASE C — Character Order Puzzle
   ══════════════════════════════════════════════════════════ */
function CharOrderPhase({ vocab, pool, timeLimit, onAnswer }) {
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [tiles, setTiles] = useState(() => vocab ? makeCharPuzzle(vocab, pool).map((c, i) => ({ char: c, key: i, used: false })) : [])
  const [picked, setPicked] = useState([])  // array of tile keys
  const [done, setDone] = useState(false)
  const answeredRef = useRef(false)

  useEffect(() => {
    if (answeredRef.current) return
    if (timeLeft <= 0) {
      answeredRef.current = true
      setDone(true)
      onAnswer(false)
      return
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft])

  if (!vocab) return null
  const targetChars = Array.from(vocab.hanzi)
  const pickedStr = picked.map(k => tiles.find(t => t.key === k)?.char || '').join('')

  const tapTile = (key) => {
    if (done || answeredRef.current) return
    const tile = tiles.find(t => t.key === key)
    if (!tile || tile.used) return
    const newPicked = [...picked, key]
    setTiles(ts => ts.map(t => t.key === key ? { ...t, used: true } : t))
    setPicked(newPicked)

    // Check if full word
    if (newPicked.length === targetChars.length) {
      const built = newPicked.map(k => tiles.find(t => t.key === k)?.char || '').join('')
      // Update built string from new state
      const correct = built === vocab.hanzi
      answeredRef.current = true
      setDone(true)
      if (correct) speak(vocab.hanzi)
      setTimeout(() => onAnswer(correct), 600)
    }
  }

  const undo = () => {
    if (done || picked.length === 0) return
    const last = picked[picked.length - 1]
    setPicked(p => p.slice(0, -1))
    setTiles(ts => ts.map(t => t.key === last ? { ...t, used: false } : t))
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className={`font-bold ${timeLeft <= 4 ? 'text-red-300 animate-pulse' : 'text-cream/80'}`}>⏱ {timeLeft}s</span>
        </div>
        <div className="bg-black/40 h-2 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${timeLeft <= 4 ? 'bg-red-400' : 'bg-gold'}`}
               style={{ width: `${(timeLeft / timeLimit) * 100}%` }} />
        </div>
      </div>

      {/* Definition prompt */}
      <div className="bg-cream/10 border-2 border-gold/40 rounded-2xl p-4 backdrop-blur">
        <p className="text-gold text-xs tracking-widest mb-2">根据释义，按顺序点击汉字</p>
        <p className="text-cream/95 text-base leading-relaxed">{vocab.definition}</p>
        <p className="text-cream/55 text-xs mt-2">拼音提示：{vocab.pinyin}</p>
      </div>

      {/* Answer slots */}
      <div className="flex justify-center gap-2">
        {targetChars.map((_, i) => {
          const tileKey = picked[i]
          const ch = tileKey != null ? tiles.find(t => t.key === tileKey)?.char : null
          const isCorrect = done && ch && pickedStr === vocab.hanzi
          const isWrong   = done && pickedStr !== vocab.hanzi
          return (
            <div key={i} className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl font-black border-2 transition-all ${
              isCorrect ? 'bg-emerald-500/30 border-emerald-400 text-cream' :
              isWrong && ch ? 'bg-red-500/30 border-red-400 text-cream animate-shake' :
              ch ? 'bg-gold/25 border-gold text-cream' :
              'bg-cream/5 border-cream/20 text-cream/30'
            }`}>
              {ch || '＿'}
            </div>
          )
        })}
      </div>

      {/* Tile bank */}
      <div className="flex flex-wrap justify-center gap-2 mt-2">
        {tiles.map(t => (
          <button
            key={t.key}
            onClick={() => tapTile(t.key)}
            disabled={t.used || done}
            className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black border-2 transition-all ${
              t.used
                ? 'bg-cream/5 border-cream/10 text-cream/20 cursor-default'
                : 'bg-cream/15 border-cream/40 text-cream hover:bg-cream/25 hover:scale-105 active:scale-95'
            }`}
          >
            {t.char}
          </button>
        ))}
      </div>

      {/* Undo */}
      <div className="flex justify-center">
        <button
          onClick={undo}
          disabled={picked.length === 0 || done}
          className="text-cream/70 hover:text-cream border border-cream/30 rounded-full px-4 py-1.5 text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← 撤销
        </button>
      </div>

      {done && (
        <p className={`text-center font-black text-lg animate-fadeIn ${pickedStr === vocab.hanzi ? 'text-emerald-300' : 'text-red-300'}`}>
          {pickedStr === vocab.hanzi ? '✓ 正确！' : `✗ 答案是「${vocab.hanzi}」`}
        </p>
      )}
    </div>
  )
}
