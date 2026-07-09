import { useEffect, useState } from 'react'
import { speak } from '../utils/speech'
import { claimWordOfTheDay, isWordOfDayClaimed } from '../utils/userStore'
import { pickWordOfTheDay, WORD_OF_DAY_REWARD } from '../utils/wordOfDay'

function todayStr() { return new Date().toISOString().slice(0, 10) }

export default function WordOfDayModal({ units, onClose }) {
  const [claimed, setClaimed] = useState(() => isWordOfDayClaimed())
  const word = pickWordOfTheDay(units, todayStr())

  // Auto-speak the word once when the modal opens
  useEffect(() => {
    if (word?.hanzi) {
      const t = setTimeout(() => speak(word.hanzi), 400)
      return () => clearTimeout(t)
    }
  }, [word?.hanzi])

  if (!word) return null

  const handleClaim = () => {
    if (claimed) { onClose(); return }
    const ok = claimWordOfTheDay()
    if (ok) setClaimed(true)
    setTimeout(onClose, 600)
  }

  return (
    <div
      className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-cream w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-slideUp border-2 border-gold/40">

        {/* ── Gold header with sparkles ── */}
        <div className="relative px-5 py-5 text-center overflow-hidden"
             style={{ background: 'linear-gradient(135deg, #C9962A 0%, #B0801A 50%, #8B6914 100%)' }}>
          {/* Floating sparkles */}
          <span className="absolute top-2 left-4 text-cream/40 text-lg animate-bounceCoin">✦</span>
          <span className="absolute top-4 right-6 text-cream/30 text-sm">✧</span>
          <span className="absolute bottom-2 left-10 text-cream/30 text-sm">✦</span>
          <span className="absolute bottom-3 right-4 text-cream/40 text-base animate-bounceCoin">✧</span>

          <button
            onClick={onClose}
            className="absolute top-2 right-3 z-20 text-cream/70 hover:text-cream text-3xl leading-none w-8 h-8 flex items-center justify-center"
          >×</button>

          <p className="text-cream/85 text-sm tracking-widest mb-0.5 relative z-10">✨ 今日词语 ✨</p>
          <p className="text-cream/60 text-xs relative z-10">单元{['一','二','三','四','五','六'][word.unitNum - 1]} · 《{word.unitTitle}》</p>
        </div>

        <div className="overflow-y-auto p-6 flex flex-col gap-4">

          {/* ── The word, big ── */}
          <div className="text-center pt-2 pb-4">
            <p className="text-6xl sm:text-7xl font-black text-brick animate-charEnter" style={{ letterSpacing: '0.04em' }}>
              {word.hanzi}
            </p>
            <div className="flex items-center justify-center gap-3 mt-3">
              <p className="text-brick/70 text-xl font-bold tracking-wide">{word.pinyin}</p>
              <button
                onClick={() => speak(word.hanzi)}
                className="text-2xl hover:scale-125 transition-transform"
                title="听发音"
              >🔊</button>
            </div>
          </div>

          {/* ── Definition ── */}
          <div className="bg-cream-dark/55 rounded-xl p-4">
            <p className="text-xs uppercase tracking-widest text-brick/50 font-bold mb-1.5">释　义</p>
            <p className="text-brick text-base leading-relaxed">{word.definition}</p>
          </div>

          {/* ── Example ── */}
          {word.example && (
            <div className="bg-nanyang-teal/8 border border-nanyang-teal/25 rounded-xl p-4">
              <p className="text-xs uppercase tracking-widest text-nanyang-teal/70 font-bold mb-1.5">例　句</p>
              <p className="text-brick text-base leading-relaxed">{word.example}</p>
            </div>
          )}

          {/* ── Collocations ── */}
          {word.collocations?.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-brick/50 font-bold mb-2">常用搭配</p>
              <div className="flex flex-wrap gap-1.5">
                {word.collocations.map((c, i) => (
                  <span key={i} className="bg-gold/15 border border-gold/40 text-brick text-sm font-semibold rounded-full px-3 py-1">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Claim button ── */}
          <button
            onClick={handleClaim}
            disabled={claimed}
            className={`w-full mt-2 py-3.5 rounded-xl font-black text-lg shadow-lg transition-all ${
              claimed
                ? 'bg-nanyang-teal text-cream cursor-default'
                : 'bg-gradient-to-br from-brick to-brick-mid text-cream hover:from-brick-mid hover:to-brick active:scale-95 animate-glow'
            }`}
          >
            {claimed
              ? '✓ 已领取，明天再见！'
              : `📖 学习完毕，领取 +${WORD_OF_DAY_REWARD} 🪙`}
          </button>

          <p className="text-brick/35 text-xs text-center">
            每日 0 点更新一个新词语 · 错过不补
          </p>
        </div>
      </div>
    </div>
  )
}
