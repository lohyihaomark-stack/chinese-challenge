import { useState, useMemo } from 'react'
import { speak } from '../utils/speech'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeOptions(correct, all) {
  const pool = all.filter(w => w.id !== correct.id && w.hanzi !== correct.hanzi)
  return shuffle([correct.hanzi, ...shuffle(pool).slice(0, 3).map(w => w.hanzi)])
}

export default function FillBlankGame({ vocabs }) {
  const questions = useMemo(() => shuffle(vocabs.filter(v => v.sentence)), [vocabs])

  const [idx,      setIdx]      = useState(0)
  const [selected, setSelected] = useState(null)
  const [score,    setScore]    = useState(0)
  const [done,     setDone]     = useState(false)

  const q       = questions[idx]
  const options = useMemo(() => makeOptions(q, vocabs), [idx])
  const answered  = selected !== null
  const isCorrect = selected === q?.hanzi

  if (!q) {
    return (
      <div className="flex-1 flex items-center justify-center text-brick/40 text-sm p-8 text-center">
        此单元暂无填空题
      </div>
    )
  }

  const handleSelect = (opt) => {
    if (answered) return
    setSelected(opt)
    if (opt === q.hanzi) {
      setScore(s => s + 1)
      speak(q.hanzi)
    }
  }

  const handleNext = () => {
    if (idx + 1 >= questions.length) {
      setDone(true)
    } else {
      setIdx(i => i + 1)
      setSelected(null)
    }
  }

  const handleRestart = () => {
    setIdx(0)
    setScore(0)
    setSelected(null)
    setDone(false)
  }

  /* Results screen */
  if (done) {
    const pct    = Math.round((score / questions.length) * 100)
    const emoji  = pct >= 90 ? '🏆' : pct >= 70 ? '🌟' : pct >= 50 ? '💪' : '📖'
    const praise = pct >= 90 ? '满分英雄！' : pct >= 70 ? '表现出色！' : pct >= 50 ? '继续加油！' : '再接再厉！'

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-5">
        <div className="text-6xl animate-pop">{emoji}</div>
        <h2 className="text-2xl font-black text-brick">挑战完成！</h2>
        <p className="text-5xl font-black text-brick">
          {score}
          <span className="text-xl font-normal text-brick/50"> / {questions.length}</span>
        </p>
        <p className="text-lg font-bold text-nanyang-teal">{praise}</p>
        <div className="w-full max-w-xs bg-cream-dark rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-nanyang-teal rounded-full transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-brick/50 text-sm">正确率 {pct}%</p>
        <button
          onClick={handleRestart}
          className="bg-brick text-cream px-8 py-3 rounded-lg font-bold text-base hover:bg-brick-mid transition-colors shadow-md"
        >
          再挑战一次 🔄
        </button>
      </div>
    )
  }

  /* Sentence rendering — split on ___ */
  const parts = q.sentence.split('___')

  const optClass = (opt) => {
    const base = 'w-full text-left px-4 py-3 rounded-lg border-2 font-bold text-lg transition-all duration-150'
    if (!answered)           return `${base} bg-cream border-brick-mid text-brick hover:border-brick hover:bg-cream-dark cursor-pointer`
    if (opt === q.hanzi)     return `${base} bg-nanyang-teal/15 border-nanyang-teal text-nanyang-teal cursor-default`
    if (opt === selected)    return `${base} bg-brick-light/20 border-brick text-brick animate-shake cursor-default`
    return                          `${base} bg-cream border-brick-mid/30 text-brick/30 cursor-default`
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">

      {/* Progress bar */}
      <div className="px-4 pt-3 pb-1 flex justify-between text-sm text-brick/50 shrink-0">
        <span>题 {idx + 1} / {questions.length}</span>
        <span>得分 <strong className="text-brick">{score}</strong></span>
      </div>
      <div className="mx-4 mb-3 bg-cream-dark h-1.5 rounded-full overflow-hidden shrink-0">
        <div
          className="h-full bg-gold rounded-full transition-all duration-500"
          style={{ width: `${(idx / questions.length) * 100}%` }}
        />
      </div>

      <div className="px-4 pb-6 flex flex-col gap-4">

        {/* Question card */}
        <div className="tile-card p-4 relative z-0">
          <p className="text-xs text-brick/40 uppercase tracking-wider mb-2 relative z-10">
            根据语境，选出正确词语填入空格
          </p>
          <p className="text-xl font-semibold text-brick leading-relaxed relative z-10">
            {parts[0]}
            {answered ? (
              <span className={`inline mx-1 px-1.5 rounded font-black text-xl ${
                isCorrect ? 'text-nanyang-teal bg-nanyang-teal/10' : 'text-brick-mid bg-brick-light/20'
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

        {/* Options */}
        <div className="flex flex-col gap-2">
          {options.map(opt => (
            <button key={opt} onClick={() => handleSelect(opt)} className={optClass(opt)}>
              <span className="flex items-center gap-2">
                {answered && opt === q.hanzi  && <span className="text-nanyang-teal text-base">✓</span>}
                {answered && opt === selected && opt !== q.hanzi && <span className="text-brick text-base">✗</span>}
                {opt}
              </span>
            </button>
          ))}
        </div>

        {/* Explanation after answering */}
        {answered && (
          <div className={`rounded-xl p-4 border-2 animate-fadeIn ${
            isCorrect ? 'bg-nanyang-teal/8 border-nanyang-teal' : 'bg-brick/5 border-brick-mid'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-base mb-1 ${isCorrect ? 'text-nanyang-teal' : 'text-brick'}`}>
                  {isCorrect ? '✓ 答对了！' : `✗ 正确答案：${q.hanzi}（${q.pinyin}）`}
                </p>
                {!isCorrect && (
                  <p className="text-brick/60 text-sm mb-1">{q.pinyin}</p>
                )}
                <p className="text-brick/80 text-base leading-relaxed">{q.definition}</p>
              </div>
              <button
                onClick={() => speak(q.hanzi)}
                className="text-xl hover:scale-125 transition-transform shrink-0"
                title="朗读"
              >
                🔊
              </button>
            </div>
          </div>
        )}

        {/* Next button */}
        {answered && (
          <button
            onClick={handleNext}
            className="w-full bg-brick text-cream py-3 rounded-lg font-bold text-base hover:bg-brick-mid transition-colors shadow animate-fadeIn"
          >
            {idx + 1 >= questions.length ? '查看成绩 🏆' : '下一题 →'}
          </button>
        )}
      </div>
    </div>
  )
}
