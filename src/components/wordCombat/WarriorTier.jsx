import { useState, useEffect, useMemo, useRef } from 'react'
import { speak } from '../../utils/speech'
import { addCoins, trackMissionProgress, saveCombatTier } from '../../utils/userStore'
import { shuffle, buildHanziOptions, pickCloze } from '../../utils/questionEngine'

const TIME_LIMIT      = 60
const WRONG_PENALTY   = 5    // seconds lost per wrong
const MAX_WRONG       = 3
const COMBO_BONUS_3   = 3
const COMBO_BONUS_5   = 6

export default function WarriorTier({ vocabs, unitNum, onBack }) {
  const questions = useMemo(
    () => shuffle(vocabs.filter(v => v.sentence)).map(v => ({ ...v, _cloze: pickCloze(v) })),
    [vocabs]
  )

  const [idx,        setIdx]        = useState(0)
  const [selected,   setSelected]   = useState(null)
  const [timeLeft,   setTimeLeft]   = useState(TIME_LIMIT)
  const [combo,      setCombo]      = useState(0)
  const [bestCombo,  setBestCombo]  = useState(0)
  const [correct,    setCorrect]    = useState(0)
  const [wrongCount, setWrong]      = useState(0)
  const [gameState,  setGameState]  = useState('playing')  // 'playing'|'victory'|'defeat'
  const [comboFlash, setComboFlash] = useState(null)        // for combo popup
  const flashCounter = useRef(0)

  const q = questions[idx % questions.length]
  const options = useMemo(() => q ? buildHanziOptions(q, vocabs, 4) : [], [idx, vocabs])

  /* ── Timer ── */
  useEffect(() => {
    if (gameState !== 'playing') return
    if (timeLeft <= 0) { finishVictory(); return }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, gameState])

  const finishVictory = () => {
    const score = correct * 10 + bestCombo * 3
    saveCombatTier(unitNum, 'warrior', { score, bestCombo })
    addCoins(5)
    if (wrongCount === 0) addCoins(2)
    trackMissionProgress('match:complete')
    setGameState('victory')
  }
  const finishDefeat = () => {
    setGameState('defeat')
  }

  const handleSelect = (opt) => {
    if (selected !== null || gameState !== 'playing') return
    setSelected(opt)
    if (opt === q.hanzi) {
      speak(q.hanzi)
      addCoins(1)
      trackMissionProgress('boss:correct')
      setCorrect(c => c + 1)
      setCombo(prev => {
        const next = prev + 1
        if (next > bestCombo) setBestCombo(next)
        if (next === 3) {
          addCoins(COMBO_BONUS_3)
          flashCounter.current++
          setComboFlash({ id: flashCounter.current, text: '连击 x3 🔥', bonus: COMBO_BONUS_3 })
          setTimeout(() => setComboFlash(null), 1200)
        } else if (next === 5) {
          addCoins(COMBO_BONUS_5)
          flashCounter.current++
          setComboFlash({ id: flashCounter.current, text: '完美连击 x5 ⚡', bonus: COMBO_BONUS_5 })
          setTimeout(() => setComboFlash(null), 1400)
        } else if (next > 5 && next % 3 === 0) {
          addCoins(COMBO_BONUS_5)
          flashCounter.current++
          setComboFlash({ id: flashCounter.current, text: `神级连击 x${next} 💥`, bonus: COMBO_BONUS_5 })
          setTimeout(() => setComboFlash(null), 1400)
        }
        return next
      })
      setTimeout(() => {
        setSelected(null)
        setIdx(i => i + 1)
      }, 450)
    } else {
      setCombo(0)
      setWrong(prev => {
        const next = prev + 1
        if (next >= MAX_WRONG) {
          setTimeout(() => finishDefeat(), 500)
        }
        return next
      })
      setTimeLeft(s => Math.max(0, s - WRONG_PENALTY))
      setTimeout(() => {
        setSelected(null)
        setIdx(i => i + 1)
      }, 700)
    }
  }

  /* ── Victory ── */
  if (gameState === 'victory') {
    const perfect = wrongCount === 0
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="text-7xl animate-pop">⚔️</div>
        <h2 className="text-3xl font-black text-amber-700">武者考验通关！</h2>
        <p className="text-base text-brick/65">你已掌握速度与精度，可解锁<strong className="text-purple-700"> 宗师挑战 👑</strong></p>
        <div className="bg-cream-dark rounded-2xl px-6 py-4 flex flex-col items-center gap-1 border-2 border-amber-500/40">
          <p className="text-sm text-brick/50">命中 / 最高连击</p>
          <p className="text-3xl font-black text-amber-700">{correct} <span className="text-brick/40 text-lg">命中</span></p>
          <p className="text-2xl font-black text-brick">连击 x{bestCombo} 🔥</p>
        </div>
        {perfect && (
          <p className="text-gold font-black text-lg px-4 py-2 rounded-full bg-gold/10 border border-gold/40 animate-glow">
            ⚡ 完美无伤！+2 🪙 奖励 ⚡
          </p>
        )}
        <p className="text-gold font-bold">+5 🪙 · 解锁 1.5x 伤害加成</p>
        <button onClick={onBack} className="mt-2 bg-brick text-cream px-8 py-3 rounded-xl font-bold text-lg hover:bg-brick-mid transition-colors shadow-lg">
          返回斗争大厅
        </button>
      </div>
    )
  }

  /* ── Defeat ── */
  if (gameState === 'defeat') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="text-7xl animate-pop">💢</div>
        <h2 className="text-3xl font-black text-brick">挑战失败</h2>
        <p className="text-brick/70">连续错误超过 {MAX_WRONG} 次</p>
        <div className="bg-cream-dark rounded-2xl px-6 py-4 flex flex-col items-center gap-1 border-2 border-brick/20">
          <p className="text-3xl font-black text-brick">{correct} <span className="text-brick/40 text-base">命中</span></p>
          <p className="text-base text-brick/55">最高连击 x{bestCombo}</p>
        </div>
        <p className="text-brick/55 text-sm">再来一次，速度与冷静缺一不可</p>
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

  /* ── Playing ── */
  if (!q) {
    return (
      <div className="flex-1 flex items-center justify-center text-brick/40 p-8 text-center">
        此单元暂无战斗题目
      </div>
    )
  }
  const parts = (q._cloze ?? q.sentence).split('___')
  const answered = selected !== null
  const isCorrect = selected === q.hanzi
  const timeLow = timeLeft <= 10

  const optClass = (opt) => {
    const base = 'flex-1 min-w-[calc(50%-6px)] text-center px-3 py-3 rounded-xl border-2 font-bold text-xl transition-all duration-150'
    if (!answered)        return `${base} bg-cream border-brick-mid/40 text-brick hover:border-brick hover:bg-cream-dark cursor-pointer`
    if (opt === q.hanzi)  return `${base} bg-emerald-500/15 border-emerald-500 text-emerald-700`
    if (opt === selected) return `${base} bg-brick/10 border-brick text-brick animate-shake`
    return                       `${base} bg-cream/60 border-brick-mid/20 text-brick/30`
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">

      {/* Header */}
      <div className="bg-gradient-to-b from-amber-800 to-amber-600 px-4 pt-3 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <button onClick={onBack} className="text-cream/70 hover:text-cream text-sm font-bold">← 退出</button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚔️</span>
            <span className="text-cream font-black">武者考验</span>
          </div>
          <div className="text-cream/70 text-sm">{idx} 题</div>
        </div>

        {/* Timer + Wrongs */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className={`font-bold ${timeLow ? 'text-red-300 animate-pulse' : 'text-cream/80'}`}>⏱ {timeLeft}s</span>
              <span className="text-cream/70">命中 {correct}</span>
            </div>
            <div className="bg-black/40 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${timeLow ? 'bg-red-400' : 'bg-gold'}`}
                style={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: MAX_WRONG }).map((_, i) => (
              <span key={i} className={`text-xl ${i < MAX_WRONG - wrongCount ? '' : 'grayscale opacity-25'}`}>❤️</span>
            ))}
          </div>
        </div>

        {/* Combo display */}
        {combo >= 2 && (
          <div className="mt-2 text-center">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-black ${
              combo >= 5 ? 'bg-gold text-brick animate-pulse2' : 'bg-cream/20 text-gold border border-gold/40'
            }`}>
              🔥 连击 x{combo}
            </span>
          </div>
        )}
      </div>

      {/* Combo flash overlay */}
      {comboFlash && (
        <div className="fixed top-32 left-1/2 -translate-x-1/2 z-[55] pointer-events-none animate-pop">
          <div className="bg-gradient-to-br from-gold to-[#B8851E] text-cream font-black px-5 py-3 rounded-2xl shadow-2xl border-2 border-cream/40 text-xl">
            {comboFlash.text} <span className="text-cream/90 text-sm">+{comboFlash.bonus} 🪙</span>
          </div>
        </div>
      )}

      {/* Question */}
      <div className="px-4 py-4 flex flex-col gap-3">
        <p className="text-sm text-brick/40 uppercase tracking-wider">填入正确词语</p>
        <div className="tile-card">
          <div className="relative z-10 p-4">
            <p className="text-xl font-semibold text-brick leading-relaxed">
              {parts[0]}
              {answered ? (
                <span className={`inline mx-1 px-1.5 rounded font-black ${
                  isCorrect ? 'text-emerald-700 bg-emerald-500/10' : 'text-brick bg-brick/10'
                }`}>{q.hanzi}</span>
              ) : (
                <span className="inline-block mx-1 px-4 border-b-2 border-brick text-brick/20 font-black align-bottom">＿＿</span>
              )}
              {parts[1] || ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {options.map(opt => (
            <button key={opt} onClick={() => handleSelect(opt)} className={optClass(opt)}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
