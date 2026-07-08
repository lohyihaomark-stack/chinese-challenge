import { useEffect, useRef } from 'react'

const CHARS = '词语学习汉字造句配对斗争写字练习一二三四五六家好努力坚持加油胜进步快乐健康聪明智慧朋友师课本笔作业考答问题单元宝典'

const COLORS = [
  'rgba(0,212,255,',
  'rgba(155,93,229,',
  'rgba(6,214,160,',
  'rgba(247,37,133,',
  'rgba(255,214,10,',
]

const FS = 18

export default function MatrixRain() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let cols = []
    let animId
    let frame = 0

    const init = () => {
      const dpr = window.devicePixelRatio || 1
      const w   = window.innerWidth
      const h   = window.innerHeight
      canvas.style.width  = w + 'px'
      canvas.style.height = h + 'px'
      canvas.width  = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)

      const n = Math.floor(w / FS)
      cols = Array.from({ length: n }, () => ({
        y:     Math.random() * -(h / FS) * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        speed: 0.06 + Math.random() * 0.09,
      }))
    }

    init()
    window.addEventListener('resize', init)

    const draw = () => {
      frame++

      const w = canvas.width  / (window.devicePixelRatio || 1)
      const h = canvas.height / (window.devicePixelRatio || 1)

      ctx.fillStyle = 'rgba(7,13,26,0.12)'
      ctx.fillRect(0, 0, w, h)

      if (frame % 3 === 0) {
        ctx.font = `bold ${FS}px "Share Tech Mono", monospace`
        ctx.textBaseline = 'top'

        for (let i = 0; i < cols.length; i++) {
          const c   = cols[i]
          const x   = i * FS
          const y   = Math.round(c.y) * FS

          // Head — bright white, fully sharp
          ctx.fillStyle = 'rgba(230,248,255,1)'
          ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], x, y)

          // Second char — column accent colour
          ctx.fillStyle = c.color + '0.85)'
          ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], x, y - FS)

          c.y += c.speed
          if (y > h + FS && Math.random() > 0.975) {
            c.y     = Math.random() * -20
            c.color = COLORS[Math.floor(Math.random() * COLORS.length)]
            c.speed = 0.06 + Math.random() * 0.09
          }
        }
      }

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', init)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0,
        zIndex: 2,
        pointerEvents: 'none',
        opacity: 0.55,
      }}
    />
  )
}
