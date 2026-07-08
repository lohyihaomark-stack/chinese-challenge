import { memo, useMemo } from 'react'

const CHINESE_CHARS = ['学','好','语','文','词','汉','字','书','读','写','华','言','句','思','道','知','明','理']
const CODE_CHARS    = ['0','1','∅','∑','∞','⊗','◈','⌬','▲','◆','⬡','⊕','≋','∇','⌘','FF','B3','7E']

/**
 * Full-page atmospheric background layer.
 * Four sub-layers: ambient orbs → data streams → star field → floating chars.
 * Memoised — never re-renders.
 */
const FloatingParticles = memo(function FloatingParticles() {
  const { orbs, streams, stars, chars } = useMemo(() => {

    /* ── 1. Ambient glow orbs (large, very soft radial gradients) ── */
    const orbs = [
      { x: 8,  y: 18, w: 950, h: 750, r: '0,240,255',   mo: 0.095, dur: 17, delay:  0  },
      { x: 78, y: 62, w: 1050,h: 800, r: '155,93,229',  mo: 0.105, dur: 21, delay: -7  },
      { x: 45, y: 88, w: 800, h: 620, r: '255,0,127',  mo: 0.075, dur: 14, delay: -11 },
      { x: 88, y: 8,  w: 700, h: 520, r: '0,240,255',   mo: 0.075, dur: 16, delay: -4  },
      { x: 22, y: 68, w: 600, h: 480, r: '255,214,10',  mo: 0.055, dur: 12, delay: -9  },
    ]

    /* ── 2. Vertical data stream beams ─────────────────────────── */
    const streams = Array.from({ length: 14 }, (_, i) => ({
      x:       (i * 8.3  + 3.8) % 97,
      dur:     2.2 + (i % 5) * 0.65,
      delay:   -(i * 0.82),
      height:  55 + (i % 4) * 50,
      color:   ['0,240,255', '155,93,229', '255,0,127', '0,255,180', '255,214,10'][i % 5],
      opacity: 0.22 + (i % 3) * 0.08,
    }))

    /* ── 3. Star / sparkle particles ───────────────────────────── */
    const stars = Array.from({ length: 65 }, (_, i) => ({
      x:      (i * 19.7 + 3)  % 99,
      y:      (i * 27.3 + 11) % 97,
      size:   1.5 + (i % 3 === 0 ? 1.5 : 0),
      dur:    1.4 + (i % 8) * 0.55,
      delay:  -(i * 0.38),
      maxOp:  0.5 + (i % 5) * 0.12,
      color:  ['0,240,255', '155,93,229', '255,0,127', '255,255,255', '0,255,180'][i % 5],
    }))

    /* ── 4. Floating Chinese + code characters ─────────────────── */
    const chars = [
      ...Array.from({ length: 14 }, (_, i) => ({
        char:    CHINESE_CHARS[i % CHINESE_CHARS.length],
        x:       (i * 23 + 7)  % 96,
        y:       (i * 37 + 11) % 92,
        size:    14 + (i % 5) * 7,
        dur:     10 + (i % 7) * 1.8,
        delay:   -(i * 1.6),
        opacity: 0.03 + (i % 4) * 0.01,
        color:   '0,240,255',
        mono:    false,
      })),
      ...Array.from({ length: 16 }, (_, i) => ({
        char:    CODE_CHARS[i % CODE_CHARS.length],
        x:       (i * 17 + 13) % 98,
        y:       (i * 41 + 7)  % 94,
        size:    9  + (i % 4) * 4,
        dur:     6  + (i % 6) * 1.2,
        delay:   -(i * 0.9 + 2),
        opacity: 0.055 + (i % 5) * 0.02,
        color:   ['0,240,255', '155,93,229', '255,0,127', '0,255,180'][i % 4],
        mono:    true,
      })),
    ]

    return { orbs, streams, stars, chars }
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>

      {/* ── Ambient neon orbs ─────────────────────────────────── */}
      {orbs.map((orb, i) => (
        <div key={`orb${i}`} style={{
          position:     'absolute',
          left:         `${orb.x}%`,
          top:          `${orb.y}%`,
          width:         orb.w,
          height:        orb.h,
          transform:    'translate(-50%, -50%)',
          borderRadius: '50%',
          background:   `radial-gradient(ellipse at center,
            rgba(${orb.r},${orb.mo}) 0%,
            rgba(${orb.r},${orb.mo * 0.45}) 30%,
            rgba(${orb.r},${orb.mo * 0.12}) 60%,
            transparent 78%)`,
          animation:      `ambientFloat ${orb.dur}s ease-in-out infinite`,
          animationDelay: `${orb.delay}s`,
        }} />
      ))}

      {/* ── Vertical data streams ─────────────────────────────── */}
      {streams.map((s, i) => (
        <div key={`st${i}`} style={{
          position:       'absolute',
          left:           `${s.x}%`,
          top:            '-140px',
          width:           1,
          height:          s.height,
          background:     `linear-gradient(to bottom,
            transparent 0%,
            rgba(${s.color},${s.opacity}) 15%,
            rgba(${s.color},${s.opacity * 0.9}) 55%,
            rgba(${s.color},${s.opacity * 0.35}) 85%,
            transparent 100%)`,
          animation:      `streamFall ${s.dur}s linear infinite`,
          animationDelay: `${s.delay}s`,
        }} />
      ))}

      {/* ── Star sparkles ─────────────────────────────────────── */}
      {stars.map((star, i) => (
        <div key={`star${i}`} style={{
          position:       'absolute',
          left:           `${star.x}%`,
          top:            `${star.y}%`,
          width:           star.size,
          height:          star.size,
          borderRadius:   '50%',
          background:     `rgba(${star.color}, ${star.maxOp})`,
          boxShadow:      `0 0 ${star.size * 4}px rgba(${star.color}, ${star.maxOp * 0.7})`,
          animation:      `starTwinkle ${star.dur}s ease-in-out infinite`,
          animationDelay: `${star.delay}s`,
        }} />
      ))}

      {/* ── Floating characters ───────────────────────────────── */}
      {chars.map((c, i) => (
        <div key={`ch${i}`} style={{
          position:       'absolute',
          left:           `${c.x}%`,
          top:            `${c.y}%`,
          fontSize:        c.size,
          color:          `rgba(${c.color}, ${c.opacity})`,
          fontFamily:      c.mono ? '"Share Tech Mono", monospace' : '"Noto Serif SC", serif',
          textShadow:     `0 0 ${c.size * 2}px rgba(${c.color}, ${c.opacity * 0.6})`,
          animation:      `floatY ${c.dur}s ease-in-out infinite`,
          animationDelay: `${c.delay}s`,
          userSelect:     'none',
        }}>
          {c.char}
        </div>
      ))}

    </div>
  )
})

export default FloatingParticles
