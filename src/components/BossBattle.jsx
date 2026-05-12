import { useState, useMemo } from 'react'
import { speak } from '../utils/speech'
import { saveBossScore, addCoins } from '../utils/userStore'

/* ── Helpers ─────────────────────────────────────────── */
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeOptions(correct, all) {
  const pool = all.filter(w => w.id !== correct.id && w.hanzi !== correct.hanzi)
  return shuffle([correct.hanzi, ...shuffle(pool).slice(0, 3).map(w => w.hanzi)])
}

/* ── Boss roster ─────────────────────────────────────── */
const BOSS = {
  1: {
    name:   '词汇魔王',
    phase1: '🐲',   // high HP
    phase2: '😤',   // medium HP
    phase3: '😡',   // low HP
    hurt:   '💢',   // just got hit
    color:  'from-[#4a0e00] to-[#8B2500]',
    barColor: 'bg-red-400',
    barLow:   'bg-orange-400',
  },
  2: {
    name:   '年　　兽',
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
}

const PLAYER_MAX_HP = 3

/* ── Component ───────────────────────────────────────── */
export default function BossBattle({ vocabs, unitNum }) {
  const questions = useMemo(
    () => shuffle(vocabs.filter(v => v.sentence)).slice(0, 15),
    [vocabs]
  )

  const boss       = BOSS[unitNum] || BOSS[1]
  const bossMaxHP  = questions.length

  const [idx,          setIdx]          = useState(0)
  const [selected,     setSelected]     = useState(null)
  const [playerHP,     setPlayerHP]     = useState(PLAYER_MAX_HP)
  const [correctCount, setCorrectCount] = useState(0)
  const [bossDamaged,  setBossDamaged]  = useState(false)
  const [playerHit,    setPlayerHit]    = useState(false)
  const [gameState,    setGameState]    = useState('playing')  // 'playing'|'victory'|'defeat'

  const q        = questions[idx]
  const options  = useMemo(() => (q ? makeOptions(q, vocabs) : []), [idx, vocabs])
  const answered   = selected !== null
  const isCorrect  = selected === q?.hanzi
  const bossHP     = bossMaxHP - correctCount
  const bossHPPct  = Math.max(0, (bossHP / bossMaxHP) * 100)
  const bossPhase  = bossHPPct > 60 ? 'phase1' : bossHPPct > 25 ? 'phase2' : 'phase3'
  const bossEmoji  = bossDamaged ? boss.hurt : boss[bossPhase]

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
      addCoins(2)   // +2 per correct answer
      // ✅ Correct — damage boss
      setBossDamaged(true)
      setTimeout(() => setBossDamaged(false), 650)
      setCorrectCount(c => c + 1)
    } else {
      // ❌ Wrong — player takes damage
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
      addCoins(mistakes === 0 ? 40 : 15)  // perfect=40, normal=15
      setGameState('victory')
    } else {
      setIdx(i => i + 1)
      setSelected(null)
    }
  }

  const handleRestart = () => {
    setIdx(0)
    setSelected(null)
    setPlayerHP(PLAYER_MAX_HP)
    setCorrectCount(0)
    setBossDamaged(false)
    setPlayerHit(false)
    setGameState('playing')
  }

  /* ── Victory screen ────────────────────────────────── */
  if (gameState === 'victory') {
    const perfect  = playerHP === PLAYER_MAX_HP
    const mistakes = PLAYER_MAX_HP - playerHP
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="text-7xl animate-pop">🏆</div>
        <h2 className="text-3xl font-black text-brick">BOSS 已击败！</h2>
        <div className={`text-8xl transition-all duration-300 ${bossDamaged ? 'animate-shake' : ''}`}>
          😵
        </div>
        <p className="text-xl font-bold text-nanyang-teal">{boss.name} 倒下了！</p>

        <div className="flex gap-2 items-center text-2xl mt-1">
          {Array.from({ length: PLAYER_MAX_HP }).map((_, i) => (
            <span key={i} className={i < playerHP ? '' : 'grayscale opacity-30'}>
              ❤️
            </span>
          ))}
          <span className="text-base text-brick/50 ml-1">
            {perfect ? '无伤通关！' : `失去 ${mistakes} 条命`}
          </span>
        </div>

        {perfect && (
          <p className="text-gold font-black text-lg animate-pop">⚡ 完美无伤！大师级！</p>
        )}

        <button
          onClick={handleRestart}
          className="mt-2 bg-brick text-cream px-8 py-3 rounded-xl font-bold text-lg hover:bg-brick-mid transition-colors shadow-lg"
        >
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
            <span>造成伤害</span>
            <span>{dmgPct}%</span>
          </div>
          <div className="bg-cream-dark rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-brick-light rounded-full transition-all duration-1000"
              style={{ width: `${dmgPct}%` }}
            />
          </div>
        </div>

        <p className="text-brick/50 text-sm">答对 {correctCount} / {bossMaxHP} 题</p>

        <button
          onClick={handleRestart}
          className="mt-2 bg-brick text-cream px-8 py-3 rounded-xl font-bold text-lg hover:bg-brick-mid transition-colors shadow-lg"
        >
          重新挑战 🔄
        </button>
      </div>
    )
  }

  /* ── Battle screen ─────────────────────────────────── */
  const parts = q.sentence.split('___')

  const optClass = (opt) => {
    const base = 'flex-1 min-w-[calc(50%-6px)] text-left px-4 py-3 rounded-xl border-2 font-bold text-xl transition-all duration-150'
    if (!answered)           return `${base} bg-cream border-brick-mid/40 text-brick hover:border-brick hover:bg-cream-dark cursor-pointer`
    if (opt === q.hanzi)     return `${base} bg-nanyang-teal/15 border-nanyang-teal text-nanyang-teal cursor-default`
    if (opt === selected)    return `${base} bg-brick/10 border-brick text-brick animate-shake cursor-default`
    return                          `${base} bg-cream/60 border-brick-mid/20 text-brick/30 cursor-default`
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">

      {/* ══ BOSS ZONE ══════════════════════════════════════ */}
      <div className={`bg-gradient-to-b ${boss.color} px-4 pt-4 pb-5 shrink-0`}>

        {/* Boss name + HP bar */}
        <div className="mb-3">
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-cream font-black text-xl tracking-wide">{boss.name}</span>
            <span className="text-cream/60 text-base">{bossHP} / {bossMaxHP} HP</span>
          </div>
          <div className="bg-black/40 rounded-full h-4 overflow-hidden border border-white/10">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                bossHPPct > 40 ? boss.barColor : boss.barLow
              }`}
              style={{ width: `${bossHPPct}%` }}
            />
          </div>
        </div>

        {/* Boss sprite */}
        <div
          className={`text-center py-1 select-none transition-transform ${
            bossDamaged ? 'animate-shake' : ''
          }`}
        >
          <div className="text-8xl leading-none drop-shadow-lg">{bossEmoji}</div>
        </div>

        {/* Player HP row */}
        <div
          className={`flex items-center justify-between mt-3 ${
            playerHit ? 'animate-shake' : ''
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-cream/50 text-sm mr-1">HP</span>
            {Array.from({ length: PLAYER_MAX_HP }).map((_, i) => (
              <span
                key={i}
                className={`text-2xl transition-all duration-300 ${
                  i < playerHP ? '' : 'grayscale opacity-25'
                }`}
              >
                ❤️
              </span>
            ))}
          </div>
          <span className="text-cream/50 text-base">
            题 {idx + 1} / {questions.length}
          </span>
        </div>
      </div>

      {/* ══ QUESTION ZONE ══════════════════════════════════ */}
      <div className="px-4 py-4 flex flex-col gap-3">

        {/* Sentence card */}
        <div className="tile-card">
          <div className="relative z-10 p-4">
            <p className="text-sm text-brick/40 uppercase tracking-wider mb-2">
              选出正确词语，攻击 BOSS！
            </p>
            <p className="text-2xl font-semibold text-brick leading-relaxed">
              {parts[0]}
              {answered ? (
                <span className={`inline mx-1 px-1.5 rounded font-black text-2xl ${
                  isCorrect
                    ? 'text-nanyang-teal bg-nanyang-teal/10'
                    : 'text-brick-mid bg-brick/10'
                }`}>
                  {q.hanzi}
                </span>
              ) : (
                <span className="inline-block mx-1 px-4 border-b-2 border-brick text-brick/20 font-black align-bottom">
                  ＿＿
                </span>
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
                {answered && opt === q.hanzi   && <span className="text-nanyang-teal">✓</span>}
                {answered && opt === selected  && opt !== q.hanzi && <span className="text-brick">✗</span>}
                {opt}
              </span>
            </button>
          ))}
        </div>

        {/* Feedback card */}
        {answered && (
          <div className={`rounded-xl p-4 border-2 animate-fadeIn ${
            isCorrect
              ? 'bg-nanyang-teal/8 border-nanyang-teal'
              : 'bg-brick/5 border-brick-mid'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-lg mb-1 ${
                  isCorrect ? 'text-nanyang-teal' : 'text-brick'
                }`}>
                  {isCorrect
                    ? `⚔️ 命中！${boss.name} 受到伤害！`
                    : `🛡️ 受击！正确答案：${q.hanzi}（${q.pinyin}）`}
                </p>
                <p className="text-brick/80 text-base leading-relaxed">{q.definition}</p>
              </div>
              <button
                onClick={() => speak(q.hanzi)}
                className="text-xl hover:scale-125 transition-transform shrink-0"
              >
                🔊
              </button>
            </div>
          </div>
        )}

        {/* Next / End button */}
        {answered && (
          <button
            onClick={handleNext}
            className="w-full py-3 rounded-xl font-bold text-lg transition-colors shadow animate-fadeIn bg-brick text-cream hover:bg-brick-mid"
          >
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
