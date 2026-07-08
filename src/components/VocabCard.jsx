import { useState, memo } from 'react'
import { speak } from '../utils/speech'
import StrokeOrder from './StrokeOrder'

/* ── Tone-colour helpers ─────────────────────────────── */
const TONE_COLORS = {
  1: '#f87171',               // flat    — soft red
  2: '#fbbf24',               // rising  — amber
  3: '#4ade80',               // dip-rise— green
  4: '#60a5fa',               // falling — blue
  0: 'rgba(200,220,255,0.55)',// neutral — grey
}

function getTone(syllable) {
  if (/[āēīōūǖĀĒĪŌŪǕ]/.test(syllable)) return 1
  if (/[áéíóúǘÁÉÍÓÚǗ]/.test(syllable)) return 2
  if (/[ǎěǐǒǔǚǍĚǏǑǓǙ]/.test(syllable)) return 3
  if (/[àèìòùǜÀÈÌÒÙǛ]/.test(syllable)) return 4
  return 0
}

function TonedPinyin({ pinyin }) {
  const syllables = pinyin.split(' ')
  return (
    <span>
      {syllables.map((syl, i) => (
        <span key={i} style={{ color: TONE_COLORS[getTone(syl)], fontWeight: 700 }}>
          {syl}{i < syllables.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  )
}

// Memoised — vocab data never changes at runtime, so this component
// only needs to render once per card. Prevents full-list re-renders
// when parent state (e.g. active tab) changes.
const VocabCard = memo(function VocabCard({ vocab, index }) {
  const [showStrokes,  setShowStrokes]  = useState(false)
  const [showDetails,  setShowDetails]  = useState(false)

  return (
    <div className="tile-card animate-fadeIn">
      <div className="relative z-10 p-4">

        {/* ── Header: word + pinyin + speak ────────────── */}
        <div className="flex items-start gap-1 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-4xl font-black leading-tight"
                    style={{ color: '#e8f4ff', textShadow: '0 0 20px rgba(0,212,255,0.3)' }}>
                {vocab.hanzi}
              </span>
              <button
                onClick={() => speak(vocab.hanzi)}
                className="text-xl hover:scale-125 transition-transform shrink-0 hover:drop-shadow-[0_0_8px_rgba(0,212,255,0.8)]"
                title="朗读"
              >
                🔊
              </button>
            </div>
            <p className="text-base mt-1" style={{ textShadow: '0 0 6px rgba(0,150,255,0.25)' }}>
              <TonedPinyin pinyin={vocab.pinyin} />
            </p>
          </div>
        </div>

        {/* ── 释义 ──────────────────────────────────────── */}
        <div className="mb-3">
          <p className="text-xs font-bold uppercase tracking-wider mb-1"
             style={{ color: 'rgba(0,212,255,0.35)' }}>
            释义
          </p>
          <p className="text-base leading-relaxed" style={{ color: 'rgba(220,240,255,0.9)' }}>
            {vocab.definition}
          </p>
        </div>

        {/* ── Expand toggle ─────────────────────────────── */}
        <button
          onClick={() => setShowDetails(s => !s)}
          className="flex items-center gap-1 text-sm font-semibold transition-all"
          style={{ color: 'rgba(0,212,255,0.5)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(0,212,255,0.9)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(0,212,255,0.5)'}
        >
          <span>{showDetails ? '▲' : '▼'}</span>
          <span>{showDetails ? '收起详情' : '搭配 · 例句 · 笔画'}</span>
        </button>

        {showDetails && (
          <div className="flex flex-col gap-3 pt-3 mt-2 view-enter"
               style={{ borderTop: '1px solid rgba(0,212,255,0.12)' }}>

            {/* 词语搭配 */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-1.5"
                 style={{ color: 'rgba(0,212,255,0.35)' }}>词语搭配</p>
              <div className="flex gap-1.5 flex-wrap">
                {vocab.collocations.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => speak(c)}
                    className="text-sm px-2.5 py-1 rounded-full border transition-all font-semibold"
                    style={{
                      background: 'rgba(255,214,10,0.08)',
                      borderColor: 'rgba(255,214,10,0.3)',
                      color: 'rgba(255,214,10,0.85)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(255,214,10,0.18)'
                      e.currentTarget.style.boxShadow = '0 0 10px rgba(255,214,10,0.3)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(255,214,10,0.08)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* 例句 */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-1"
                 style={{ color: 'rgba(0,212,255,0.35)' }}>例句</p>
              <p className="text-sm leading-relaxed italic pl-3"
                 style={{
                   color: 'rgba(200,230,255,0.7)',
                   borderLeft: '2px solid rgba(155,93,229,0.5)',
                 }}>
                {vocab.example}
              </p>
            </div>

            {/* 笔画 toggle */}
            <div>
              <button
                onClick={() => setShowStrokes(s => !s)}
                className="flex items-center gap-1 text-sm font-semibold transition-all"
                style={{ color: 'rgba(6,214,160,0.6)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(6,214,160,1)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(6,214,160,0.6)'}
              >
                <span>{showStrokes ? '▲' : '▼'}</span>
                <span>{showStrokes ? '收起笔画' : '查看笔画顺序 ✏️'}</span>
              </button>
              {showStrokes && (
                <div className="mt-2 pt-2 view-enter" style={{ borderTop: '1px solid rgba(0,212,255,0.1)' }}>
                  <StrokeOrder word={vocab.hanzi} />
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  )
})

export default VocabCard
