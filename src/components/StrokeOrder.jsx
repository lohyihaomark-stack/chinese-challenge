import { useEffect, useRef } from 'react'
import HanziWriter from 'hanzi-writer'

const HANZI_RE = /[一-鿿㐀-䶿]/

function loadCharData(char, onComplete) {
  fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${char}.json`)
    .then(r => r.json())
    .then(data => onComplete(data))
    .catch(() => onComplete(null))
}

function StrokeChar({ char }) {
  const containerRef = useRef(null)
  const writerRef    = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''

    writerRef.current = HanziWriter.create(containerRef.current, char, {
      width:            84,
      height:           84,
      padding:          8,
      showOutline:      true,
      strokeColor:      '#8B2500',
      outlineColor:     '#F0D9A8',
      drawingColor:     '#C1440E',
      strokeAnimationSpeed: 0.8,
      delayBetweenStrokes:  200,
      charDataLoader: loadCharData,
    })
  }, [char])

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        ref={containerRef}
        className="rounded-lg shadow-md"
        style={{
          width: 84, height: 84,
          background: '#fff',
          border: '2px solid rgba(0,212,255,0.3)',
          boxShadow: '0 0 10px rgba(0,212,255,0.15)',
        }}
      />
      <span
        className="text-sm font-black"
        style={{ color: '#e8f4ff', textShadow: '0 0 8px rgba(0,212,255,0.4)' }}
      >
        {char}
      </span>
      <button
        onClick={() => writerRef.current?.animateCharacter()}
        className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full transition-all active:scale-95"
        style={{
          background: 'rgba(0,212,255,0.15)',
          border: '1px solid rgba(0,212,255,0.4)',
          color: '#00d4ff',
        }}
      >
        ▶ 播放
      </button>
    </div>
  )
}

export default function StrokeOrder({ word }) {
  const chars = [...word].filter(c => HANZI_RE.test(c))
  if (chars.length === 0) return null

  return (
    <div>
      <p
        className="text-xs font-bold uppercase tracking-wider mb-3"
        style={{ color: 'rgba(0,212,255,0.6)' }}
      >
        ✏️ 笔画顺序
      </p>
      <div className="flex gap-4 flex-wrap">
        {chars.map((c, i) => (
          <StrokeChar key={i} char={c} />
        ))}
      </div>
      <p
        className="text-xs mt-3"
        style={{ color: 'rgba(0,212,255,0.45)' }}
      >
        点击「▶ 播放」查看笔画动画
      </p>
    </div>
  )
}
