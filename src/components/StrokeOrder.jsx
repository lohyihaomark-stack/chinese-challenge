import { useEffect, useRef, useState } from 'react'
import HanziWriter from 'hanzi-writer'
import { charDataLoader } from '../utils/hanziData'

const HANZI_RE = /[一-鿿㐀-䶿]/

function StrokeChar({ char }) {
  const containerRef = useRef(null)
  const writerRef    = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return
    setFailed(false)
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
      charDataLoader: charDataLoader(() => setFailed(true)),
    })
  }, [char])

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        ref={containerRef}
        className="rounded-lg shadow-md flex items-center justify-center"
        style={{
          width: 84, height: 84,
          background: '#fff',
          border: `2px solid ${failed ? 'rgba(247,37,133,0.4)' : 'rgba(0,212,255,0.3)'}`,
          boxShadow: failed ? 'none' : '0 0 10px rgba(0,212,255,0.15)',
        }}
      >
        {failed && (
          <span style={{ fontSize: 34, fontWeight: 900, color: '#8B2500' }}>{char}</span>
        )}
      </div>
      <span
        className="text-sm font-black"
        style={{ color: '#e8f4ff', textShadow: '0 0 8px rgba(0,212,255,0.4)' }}
      >
        {char}
      </span>
      {failed ? (
        <span className="text-xs px-2 py-1 rounded-full text-center leading-tight"
              style={{ background: 'rgba(247,37,133,0.1)', border: '1px solid rgba(247,37,133,0.3)', color: 'rgba(247,37,133,0.85)' }}>
          笔画暂不可用
        </span>
      ) : (
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
      )}
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
