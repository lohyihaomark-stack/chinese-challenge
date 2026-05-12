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
    <div className="flex flex-col items-center gap-1">
      <div
        ref={containerRef}
        className="border border-cream-dark rounded-lg bg-white shadow-sm"
        style={{ width: 84, height: 84 }}
      />
      <span className="text-xs text-brick/50">{char}</span>
      <button
        onClick={() => writerRef.current?.animateCharacter()}
        className="text-[10px] bg-brick text-cream px-2 py-0.5 rounded-full hover:bg-brick-mid transition-colors"
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
      <p className="text-[11px] font-semibold text-brick/50 mb-2 uppercase tracking-wide">笔画顺序</p>
      <div className="flex gap-3 flex-wrap">
        {chars.map((c, i) => (
          <StrokeChar key={i} char={c} />
        ))}
      </div>
      <p className="text-[10px] text-brick/30 mt-2">点击「▶ 播放」查看每个字的笔画动画</p>
    </div>
  )
}
