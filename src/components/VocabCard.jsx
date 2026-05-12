import { useState } from 'react'
import { speak } from '../utils/speech'
import StrokeOrder from './StrokeOrder'

export default function VocabCard({ vocab, index }) {
  const [showStrokes,  setShowStrokes]  = useState(false)
  const [showDetails,  setShowDetails]  = useState(false)

  return (
    <div className="tile-card animate-fadeIn">
      <div className="relative z-10 p-4">

        {/* ── Header: word + pinyin + speak ───────────────────── */}
        <div className="flex items-start gap-1 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-4xl font-black text-brick leading-tight">
                {vocab.hanzi}
              </span>
              <button
                onClick={() => speak(vocab.hanzi)}
                className="text-xl hover:scale-125 transition-transform shrink-0"
                title="朗读"
              >
                🔊
              </button>
            </div>
            <p className="text-nanyang-teal text-lg font-semibold mt-1">
              {vocab.pinyin}
            </p>
          </div>
        </div>

        {/* ── 释义 ────────────────────────────────────────────── */}
        <div className="mb-3">
          <p className="text-sm font-bold text-brick/40 uppercase tracking-wider mb-1">释义</p>
          <p className="text-brick text-lg leading-relaxed">{vocab.definition}</p>
        </div>

        {/* ── Expandable: 词语搭配 · 例句 · 笔画 ──────────────── */}
        <button
          onClick={() => setShowDetails(s => !s)}
          className="flex items-center gap-1 text-base text-brick/55 hover:text-brick/80 font-semibold transition-colors"
        >
          <span>{showDetails ? '▲' : '▼'}</span>
          <span>{showDetails ? '收起详情' : '搭配 · 例句 · 笔画'}</span>
        </button>

        {showDetails && (
          <div className="flex flex-col gap-3 pt-3 mt-2 border-t border-cream-dark">

            {/* 词语搭配 */}
            <div>
              <p className="text-sm font-bold text-brick/40 uppercase tracking-wider mb-1.5">词语搭配</p>
              <div className="flex gap-1.5 flex-wrap">
                {vocab.collocations.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => speak(c)}
                    className="bg-gold/15 text-brick text-base px-2.5 py-1 rounded-full border border-gold/40 hover:bg-gold/30 transition-colors"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* 例句 */}
            <div>
              <p className="text-sm font-bold text-brick/40 uppercase tracking-wider mb-1">例句</p>
              <p className="text-brick/80 text-base leading-relaxed border-l-2 border-gold/50 pl-2.5 italic">
                {vocab.example}
              </p>
            </div>

            {/* 笔画 toggle */}
            <div>
              <button
                onClick={() => setShowStrokes(s => !s)}
                className="flex items-center gap-1 text-base text-nanyang-teal hover:text-nanyang-green font-semibold transition-colors"
              >
                <span>{showStrokes ? '▲' : '▼'}</span>
                <span>{showStrokes ? '收起笔画' : '查看笔画顺序 ✏️'}</span>
              </button>
              {showStrokes && (
                <div className="mt-2 pt-2 border-t border-cream-dark">
                  <StrokeOrder word={vocab.hanzi} />
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
