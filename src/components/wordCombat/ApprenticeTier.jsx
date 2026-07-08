import { useState, useMemo } from 'react'
import { speak } from '../../utils/speech'
import { addCoins, trackMissionProgress, saveCombatTier } from '../../utils/userStore'
import { nextQuestions, shuffle } from '../../utils/questionEngine'

const BATCH = 4
const MAX_HINTS = 2

export default function ApprenticeTier({ vocabs, unitNum, onBack }) {
  const batch = useMemo(() => nextQuestions(`appr_u${unitNum}`, vocabs, BATCH, { unitNum }), [vocabs, unitNum])
  const meanings = useMemo(() => shuffle([...batch]), [batch])

  const [matched, setMatched]   = useState(new Set())
  const [selected, setSelected] = useState(null)
  const [wrong, setWrong]       = useState(null)
  const [hintsLeft, setHints]   = useState(MAX_HINTS)
  const [hintedId, setHintedId] = useState(null)
  const [attempts, setAttempts] = useState(0)
  const [correct, setCorrect]   = useState(0)
  const [done, setDone]         = useState(false)

  const handleWord = (id) => {
    if (matched.has(id) || wrong) return
    setSelected(prev => prev === id ? null : id)
  }

  const handleMeaning = (id) => {
    if (matched.has(id) || wrong || selected === null) return
    setAttempts(a => a + 1)
    if (selected === id) {
      addCoins(1)
      trackMissionProgress('match:correct')
      const next = new Set(matched); next.add(id)
      setMatched(next)
      setSelected(null)
      setHintedId(null)
      setCorrect(c => c + 1)
      if (next.size === batch.length) {
        setTimeout(() => finish(correct + 1, attempts + 1), 500)
      }
    } else {
      setWrong({ word: selected, meaning: id })
      setTimeout(() => { setWrong(null); setSelected(null) }, 800)
    }
  }

  const useHint = () => {
    if (hintsLeft <= 0 || selected === null || matched.has(selected)) return
    setHints(h => h - 1)
    setHintedId(selected)
    const word = batch.find(v => v.id === selected)
    if (word) speak(word.hanzi)
  }

  const finish = (c, a) => {
    const score = a > 0 ? Math.round((c / a) * 100) : 100
    saveCombatTier(unitNum, 'apprentice', { score })
    addCoins(2)   // completion bonus
    trackMissionProgress('match:complete')
    setDone(true)
  }

  if (done) {
    const score = attempts > 0 ? Math.round((correct / attempts) * 100) : 100
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className="text-7xl animate-pop">🥋</div>
        <h2 className="text-3xl font-black text-emerald-700">学徒试炼通关！</h2>
        <p className="text-base text-brick/65">你已掌握基础，可解锁<strong className="text-amber-600"> 武者考验 ⚔️</strong></p>
        <div className="bg-cream-dark rounded-2xl px-6 py-4 flex flex-col items-center gap-1 border-2 border-emerald-500/40">
          <p className="text-sm text-brick/50">命中率</p>
          <p className="text-4xl font-black text-emerald-700">{score}%</p>
          <p className="text-xs text-brick/45">{correct} / {attempts} 次</p>
        </div>
        <p className="text-gold font-bold">+2 🪙 + 完成令牌</p>
        <button onClick={onBack} className="mt-2 bg-brick text-cream px-8 py-3 rounded-xl font-bold text-lg hover:bg-brick-mid transition-colors shadow-lg">
          返回斗争大厅
        </button>
      </div>
    )
  }

  const wordClass = (id) => {
    const base = 'w-full py-4 px-2 rounded-xl font-black text-2xl border-2 transition-all duration-150 text-center leading-tight'
    if (matched.has(id))    return `${base} bg-emerald-500/15 border-emerald-500 text-emerald-700 cursor-default`
    if (wrong?.word === id) return `${base} bg-brick/10 border-brick text-brick animate-shake`
    if (selected === id)    return `${base} bg-gold/25 border-gold text-brick scale-105 shadow-md`
    return                         `${base} bg-cream border-brick-mid/40 text-brick hover:border-brick`
  }
  const meaningClass = (id) => {
    const base = 'w-full px-3 py-3 rounded-xl text-base border-2 transition-all duration-150 text-left leading-snug'
    if (matched.has(id))       return `${base} bg-emerald-500/15 border-emerald-500 text-emerald-700 cursor-default`
    if (wrong?.meaning === id) return `${base} bg-brick/10 border-brick text-brick animate-shake`
    if (selected !== null)     return `${base} bg-cream border-brick-mid/40 text-brick hover:border-brick`
    return                            `${base} bg-cream/60 border-brick-mid/20 text-brick/40 cursor-not-allowed`
  }

  const hintWord = hintedId !== null ? batch.find(v => v.id === hintedId) : null

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">

      {/* Header */}
      <div className="bg-gradient-to-b from-emerald-800 to-emerald-600 px-4 pt-4 pb-4 shrink-0">
        <button onClick={onBack} className="text-cream/70 hover:text-cream text-sm font-bold mb-2">← 返回</button>
        <div className="flex items-center gap-3">
          <span className="text-4xl">🥋</span>
          <div>
            <p className="text-cream/70 text-xs tracking-widest">第 1 关 · 入门</p>
            <h2 className="text-xl font-black text-cream">学徒试炼</h2>
          </div>
        </div>
        <div className="flex justify-between items-center mt-3 text-cream/85 text-sm">
          <span>已配对 <strong className="text-cream">{matched.size}/{batch.length}</strong></span>
          <span>命中 <strong className="text-cream">{correct}/{attempts}</strong></span>
        </div>
        <div className="bg-black/30 h-2 rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${(matched.size / batch.length) * 100}%` }} />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 flex flex-col gap-4">

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-brick/55">
            {selected !== null ? '👇 现在点击对应的释义' : '👆 先点击一个词语'}
          </p>
          <button
            onClick={useHint}
            disabled={hintsLeft <= 0 || selected === null || matched.has(selected)}
            className="text-sm bg-gold/20 border border-gold/50 text-brick font-bold px-3 py-1.5 rounded-full hover:bg-gold/35 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            💡 求助 ({hintsLeft})
          </button>
        </div>

        {hintWord && (
          <div className="bg-gold/15 border-2 border-gold/40 rounded-xl p-3 animate-fadeIn">
            <p className="text-xs text-brick/55 tracking-widest mb-1">提示</p>
            <p className="text-brick text-base">
              <strong className="text-xl">{hintWord.hanzi}</strong> · <span className="text-brick/70">{hintWord.pinyin}</span>
            </p>
          </div>
        )}

        {/* Words */}
        <div>
          <p className="text-xs font-bold text-brick/40 uppercase tracking-wider mb-2">词语</p>
          <div className="grid grid-cols-2 gap-2">
            {batch.map(v => (
              <button key={v.id} onClick={() => handleWord(v.id)} className={wordClass(v.id)}>
                {matched.has(v.id) ? '✓' : v.hanzi}
              </button>
            ))}
          </div>
        </div>

        {/* Meanings */}
        <div>
          <p className="text-xs font-bold text-brick/40 uppercase tracking-wider mb-2">释义</p>
          <div className="grid grid-cols-1 gap-2">
            {meanings.map(v => (
              <button key={v.id} onClick={() => handleMeaning(v.id)} className={meaningClass(v.id)}>
                {matched.has(v.id) && <span className="text-emerald-700 mr-1">✓</span>}
                {v.definition}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
