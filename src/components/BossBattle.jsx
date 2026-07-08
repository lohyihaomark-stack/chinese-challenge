import { useState, useMemo, useEffect, useRef } from 'react'
import { speak } from '../utils/speech'
import { saveBossScore, addCoins, trackMissionProgress, getCurrentName, getCombatDamageMultiplier } from '../utils/userStore'
import { applyBossDamage } from '../utils/globalBoss'
import { nextQuestions, pickCloze, buildHanziOptions } from '../utils/questionEngine'

/* Pick 15 fresh cloze questions (cycles the unit before repeating) and
   choose a sentence variant for each. */
function buildBossQuestions(vocabs, unitNum) {
  const picked = nextQuestions(`boss_u${unitNum}`, vocabs.filter(v => v.sentence), 15, { unitNum })
  return picked.map(v => ({ ...v, _cloze: pickCloze(v) }))
}

/* ── Boss roster ─────────────────────────────────────── */
const BOSS = {
  1: {
    name:   '词汇魔王',
    phase1: '🐲',
    phase2: '😤',
    phase3: '😡',
    hurt:   '💢',
    color:  'from-[#4a0e00] to-[#8B2500]',
    barColor: 'bg-red-400',
    barLow:   'bg-orange-400',
  },
  2: {
    name:   '年兽',
    phase1: '👹',
    phase2: '😤',
    phase3: '🤬',
    hurt:   '💢',
    color:  'from-[#2d0045] to-[#6b21a8]',
    barColor: 'bg-purple-400',
    barLow:   'bg-pink-400',
  },
  3: {
    name:   '词语狮王',
    phase1: '🦁',
    phase2: '😾',
    phase3: '🙀',
    hurt:   '💢',
    color:  'from-[#1a3a00] to-[#1A6B5A]',
    barColor: 'bg-emerald-400',
    barLow:   'bg-yellow-400',
  },
  4: {
    name:   '习惯魔君',
    phase1: '🧙',
    phase2: '😤',
    phase3: '😡',
    hurt:   '💢',
    color:  'from-[#1a1a4e] to-[#1E3A8A]',
    barColor: 'bg-blue-400',
    barLow:   'bg-cyan-400',
  },
  5: {
    name:   '创新领主',
    phase1: '🤖',
    phase2: '😤',
    phase3: '🤬',
    hurt:   '💢',
    color:  'from-[#004d40] to-[#0F766E]',
    barColor: 'bg-teal-400',
    barLow:   'bg-green-400',
  },
  6: {
    name:   '贡献之神',
    phase1: '⚡',
    phase2: '😤',
    phase3: '😡',
    hurt:   '💢',
    color:  'from-[#4d3800] to-[#92400E]',
    barColor: 'bg-amber-400',
    barLow:   'bg-red-400',
  },
}

const PLAYER_MAX_HP = 2   // reduced from 3 — less forgiving
const TIMER_S       = 12  // seconds per question

/* ── Component ───────────────────────────────────────── */
export default function BossBattle({ vocabs, unitNum }) {
  const [questions, setQuestions] = useState(() => buildBossQuestions(vocabs, unitNum))

  const boss      = BOSS[unitNum] || BOSS[1]
  const bossMaxHP = questions.length

  const [idx,          setIdx]          = useState(0)
  const [selected,     setSelected]     = useState(null)
  const [timedOut,     setTimedOut]     = useState(false)
  const [timeLeft,     setTimeLeft]     = useState(TIMER_S)
  const [playerHP,     setPlayerHP]     = useState(PLAYER_MAX_HP)
  const [correctCount, setCorrectCount] = useState(0)
  const [bossDamaged,  setBossDamaged]  = useState(false)
  const [playerHit,    setPlayerHit]    = useState(false)
  const [gameState,    setGameState]    = useState('playing')
  const timerRef = useRef(null)

  const q       = questions[idx]
  const options = useMemo(() => (q ? buildHanziOptions(q, vocabs, 4) : []), [idx, questions])

  const answered  = selected !== null || timedOut
  const isCorrect = selected === q?.hanzi

  const bossHP    = bossMaxHP - correctCount
  const bossHPPct = Math.max(0, (bossHP / bossMaxHP) * 100)
  const bossPhase = bossHPPct > 60 ? 'phase1' : bossHPPct > 25 ? 'phase2' : 'phase3'
  const bossEmoji = bossDamaged ? boss.hurt : boss[bossPhase]

  /* ── Timer: start/reset each new question ── */
  useEffect(() => {
    if (gameState !== 'playing' || !q) return
    setTimeLeft(TIMER_S)
    setTimedOut(false)
    clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          // Timeout — counts as a wrong answer
          setTimedOut(true)
          setPlayerHit(true)
          setTimeout(() => setPlayerHit(false), 650)
          setPlayerHP(hp => hp - 1)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, gameState])

  /* ── Stop timer the moment an option is tapped ── */
  useEffect(() => {
    if (selected !== null) clearInterval(timerRef.current)
  }, [selected])

  /* ── Cleanup on unmount ── */
  useEffect(() => () => clearInterval(timerRef.current), [])

  /* ── No questions guard ── */
  if (!q && gameState === 'playing') {
    return (
      <div className="flex-1 flex items-center justify-center text-brick/40 text-sm p-8 text-center">
        此单元暂无战斗题目
      </div>
    )
  }

  /* ── Interaction handlers ── */
  const handleSelect = (opt) => {
    if (answered) return
    setSelected(opt)

    if (opt === q.hanzi) {
      speak(q.hanzi)
      addCoins(1)
      trackMissionProgress('boss:correct')
      setBossDamaged(true)
      setTimeout(() => setBossDamaged(false), 650)
      setCorrectCount(c => c + 1)
    } else {
      setPlayerHit(true)
      setTimeout(() => setPlayerHit(false), 650)
      setPlayerHP(hp => hp - 1)
    }
  }

  const handleNext = () => {
    if (playerHP <= 0) {
      setGameState('defeat')
    } else if (idx + 1 >= questions.length) {
      const mistakes = PLAYER_MAX_HP - playerHP
      saveBossScore(unitNum, mistakes)
      addCoins(mistakes === 0 ? 18 : 6)
      trackMissionProgress('boss:complete')
      if (mistakes === 0) trackMissionProgress('boss:perfect')
      const mult = getCombatDamageMultiplier(unitNum)
      applyBossDamage(getCurrentName(), Math.round(correctCount * 2 * mult))
      setGameState('victory')
    } else {
      setIdx(i => i + 1)
      setSelected(null)
      setTimedOut(false)
    }
  }

  const handleRestart = () => {
    setQuestions(buildBossQuestions(vocabs, unitNum))   // fresh words + sentences each replay
    setIdx(0); setSelected(null); setTimedOut(false)
    setPlayerHP(PLAYER_MAX_HP); setCorrectCount(0)
    setBossDamaged(false); setPlayerHit(false)
    setGameState('playing')
  }

  /* ── Timer colour ── */
  const timerPct   = (timeLeft / TIMER_S) * 100
  const timerColor = timeLeft <= 3 ? '#f72585' : timeLeft <= 6 ? '#ffd60a' : '#06d6a0'

  /* ── Victory screen ────────────────────────────────── */
  if (gameState === 'victory') {
    const perfect  = playerHP === PLAYER_MAX_HP
    const mistakes = PLAYER_MAX_HP - playerHP
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {['🎉','⭐','🎊','✨','💫','🪙','🏆','🎉','⭐','🎊','✨','💫'].map((c, i) => {
            const angle  = (i / 12) * Math.PI * 2
            const radius = 110 + (i % 3) * 30
            return (
              <span key={i} className="absolute text-2xl animate-confettiPop"
                style={{ '--cx': `${Math.cos(angle) * radius}px`, '--cy': `${Math.sin(angle) * radius}px`, animationDelay: `${i * 40}ms` }}>
                {c}
              </span>
            )
          })}
        </div>

        <div className="text-7xl animate-pop relative z-10">🏆</div>
        <h2 className="text-3xl font-black text-brick relative z-10">BOSS 已击败！</h2>
        <div className="text-8xl relative z-10">😵</div>
        <p className="text-xl font-bold text-nanyang-teal relative z-10">{boss.name} 倒下了！</p>

        <div className="flex gap-2 items-center text-2xl mt-1 relative z-10">
          {Array.from({ length: PLAYER_MAX_HP }).map((_, i) => (
            <span key={i} className={i < playerHP ? '' : 'grayscale opacity-30'}>❤️</span>
          ))}
          <span className="text-base text-brick/50 ml-1">
            {perfect ? '无伤通关！' : `失去 ${mistakes} 条命`}
          </span>
        </div>

        {perfect && (
          <p className="text-gold font-black text-lg animate-pop relative z-10 px-4 py-2 rounded-full bg-gold/10 border border-gold/40 animate-glow">
            ⚡ 完美无伤！大师级！⚡
          </p>
        )}

        <button onClick={handleRestart}
          className="mt-2 bg-brick text-cream px-8 py-3 rounded-xl font-bold text-lg hover:bg-brick-mid transition-all shadow-lg active:scale-95 relative z-10">
          再战一次 ⚔️
        </button>
      </div>
    )
  }

  /* ── Defeat screen ─────────────────────────────────── */
  if (gameState === 'defeat') {
    const dmgPct = Math.round((correctCount / bossMaxHP) * 100)
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="text-7xl animate-pop">💀</div>
        <h2 className="text-3xl font-black text-brick">你被击倒了…</h2>
        <div className="text-8xl">{boss[bossPhase]}</div>
        <p className="text-lg font-bold text-brick/60">
          {boss.name} 还剩 <span className="text-brick font-black">{bossHP}/{bossMaxHP} HP</span>
        </p>

        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-brick/50 mb-1">
            <span>造成伤害</span><span>{dmgPct}%</span>
          </div>
          <div className="bg-cream-dark rounded-full h-3 overflow-hidden">
            <div className="h-full bg-brick-light rounded-full transition-all duration-1000" style={{ width: `${dmgPct}%` }} />
          </div>
        </div>

        <p className="text-brick/50 text-sm">答对 {correctCount} / {bossMaxHP} 题</p>

        <button onClick={handleRestart}
          className="mt-2 bg-brick text-cream px-8 py-3 rounded-xl font-bold text-lg hover:bg-brick-mid transition-colors shadow-lg">
          重新挑战 🔄
        </button>
      </div>
    )
  }

  /* ── Battle screen ─────────────────────────────────── */
  const parts = (q._cloze ?? q.sentence).split('___')

  const optClass = (opt) => {
    const base = 'flex-1 min-w-[calc(50%-6px)] text-left px-4 py-3 rounded-xl border-2 font-bold text-xl transition-all duration-150'
    if (!answered)             return `${base} bg-cream border-brick-mid/40 text-brick hover:border-brick hover:bg-cream-dark cursor-pointer`
    if (opt === q.hanzi)       return `${base} bg-nanyang-teal/15 border-nanyang-teal text-nanyang-teal cursor-default`
    if (opt === selected && !timedOut) return `${base} bg-brick/10 border-brick text-brick animate-shake cursor-default`
    return                            `${base} bg-cream/60 border-brick-mid/20 text-brick/30 cursor-default`
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">

      {/* ══ BOSS ZONE ══════════════════════════════════════ */}
      <div className={`bg-gradient-to-b ${boss.color} px-4 pt-4 pb-3 shrink-0`}>

        {/* Boss name + HP bar */}
        <div className="mb-3">
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-cream font-black text-xl tracking-wide">{boss.name}</span>
            <span className="text-cream/60 text-base">{bossHP} / {bossMaxHP} HP</span>
          </div>
          <div className="bg-black/40 rounded-full h-4 overflow-hidden border border-white/10">
            <div className={`h-full rounded-full transition-all duration-500 ${bossHPPct > 40 ? boss.barColor : boss.barLow}`}
                 style={{ width: `${bossHPPct}%` }} />
          </div>
        </div>

        {/* Boss sprite */}
        <div className={`text-center py-1 select-none ${bossDamaged ? 'animate-shake' : ''}`}>
          <div className="text-8xl leading-none drop-shadow-lg">{bossEmoji}</div>
        </div>

        {/* Player HP + question counter */}
        <div className={`flex items-center justify-between mt-3 ${playerHit ? 'animate-shake' : ''}`}>
          <div className="flex items-center gap-1.5">
            <span className="text-cream/50 text-sm mr-1">HP</span>
            {Array.from({ length: PLAYER_MAX_HP }).map((_, i) => (
              <span key={i} className={`text-2xl transition-all duration-300 ${i < playerHP ? '' : 'grayscale opacity-25'}`}>❤️</span>
            ))}
          </div>
          <span className="text-cream/50 text-base">题 {idx + 1} / {questions.length}</span>
        </div>
      </div>

      {/* ══ TIMER BAR ══════════════════════════════════════ */}
      {!answered && (
        <div className="shrink-0 px-4 pt-3 pb-1">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-mono font-bold" style={{ color: timerColor }}>
              ⏱ {timeLeft}s
            </span>
            <span className="text-xs text-brick/30">选出正确词语！</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.12)' }}>
            <div className="h-full rounded-full transition-all duration-1000 ease-linear"
                 style={{ width: `${timerPct}%`, background: timerColor, boxShadow: timeLeft <= 3 ? `0 0 8px ${timerColor}` : 'none' }} />
          </div>
        </div>
      )}

      {/* ══ QUESTION ZONE ══════════════════════════════════ */}
      <div className="px-4 py-3 flex flex-col gap-3">

        {/* Sentence card */}
        <div className="tile-card">
          <div className="relative z-10 p-4">
            {answered && (
              <p className="text-sm text-brick/40 uppercase tracking-wider mb-2">
                {timedOut ? '⏰ 时间到！' : isCorrect ? '⚔️ 命中！' : '🛡️ 受击！'}
              </p>
            )}
            <p className="text-2xl font-semibold text-brick leading-relaxed">
              {parts[0]}
              {answered ? (
                <span className={`inline mx-1 px-1.5 rounded font-black text-2xl ${
                  isCorrect ? 'text-nanyang-teal bg-nanyang-teal/10' : 'text-brick-mid bg-brick/10'
                }`}>
                  {q.hanzi}
                </span>
              ) : (
                <span className="inline-block mx-1 px-4 border-b-2 border-brick text-brick/20 font-black align-bottom">＿＿</span>
              )}
              {parts[1] || ''}
            </p>
          </div>
        </div>

        {/* Option buttons */}
        <div className="flex flex-wrap gap-2">
          {options.map(opt => (
            <button key={opt} onClick={() => handleSelect(opt)} className={optClass(opt)}>
              <span className="flex items-center gap-2">
                {answered && opt === q.hanzi && <span className="text-nanyang-teal">✓</span>}
                {answered && opt === selected && opt !== q.hanzi && !timedOut && <span className="text-brick">✗</span>}
                {opt}
              </span>
            </button>
          ))}
        </div>

        {/* Feedback card */}
        {answered && (
          <div className={`rounded-xl p-4 border-2 animate-fadeIn ${
            isCorrect ? 'bg-nanyang-teal/8 border-nanyang-teal' : 'bg-brick/5 border-brick-mid'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-lg mb-1 ${isCorrect ? 'text-nanyang-teal' : 'text-brick'}`}>
                  {timedOut
                    ? `⏰ 时间到！正确答案：${q.hanzi}（${q.pinyin}）`
                    : isCorrect
                      ? `⚔️ 命中！${boss.name} 受到伤害！`
                      : `🛡️ 受击！正确答案：${q.hanzi}（${q.pinyin}）`}
                </p>
                <p className="text-brick/80 text-base leading-relaxed">{q.definition}</p>
              </div>
              <button onClick={() => speak(q.hanzi)} className="text-xl hover:scale-125 transition-transform shrink-0">
                🔊
              </button>
            </div>
          </div>
        )}

        {/* Next / End button */}
        {answered && (
          <button onClick={handleNext}
            className="w-full py-3 rounded-xl font-bold text-lg transition-colors shadow animate-fadeIn bg-brick text-cream hover:bg-brick-mid">
            {playerHP <= 0
              ? '查看结果 💀'
              : idx + 1 >= questions.length
                ? '决出胜负 🏆'
                : '继续战斗 ⚔️'}
          </button>
        )}
      </div>
    </div>
  )
}
