import { useState, useEffect, useRef, useCallback } from 'react'
import { addCoins, addXP, trackWordResult, getWeakWords } from '../utils/userStore'
import { speak } from '../utils/speech'

/* ══════════════════════════════════════════════════
   LOGICAL CONSTANTS  (game coords stay fixed; the
   canvas stretches to fill its container via scale)
══════════════════════════════════════════════════ */
const CW = 700          // logical width
const CH = 490          // logical height

const PLAYER_SPEED = 1.0   // slowed down significantly

// Ghost configs: much slower, update direction less often
// Ghost 1 – pink chaser:  accurate, gentle
// Ghost 2 – purple roamer: medium, wandery
// Ghost 3 – cyan wild:    slowest, very random
const GHOST_CFG = [
  { speed: 0.26, jitter: 0.50, updateEvery: 65 },
  { speed: 0.32, jitter: 0.90, updateEvery: 75 },
  { speed: 0.20, jitter: 1.30, updateEvery: 55 },
]
const GHOST_COLORS = ['#f72585', '#9b5de5', '#00bbf9']

const PLAYER_R = 20
const GHOST_R  = 18
const ANS_W    = 134
const ANS_H    = 54
const MAX_LIVES = 3
const HIT_FRAMES = 115
const Q_COUNT    = 8
const PREROLL    = 265   // countdown frames  (3×75 + 40 = 265)

// Answer tile positions (four corners, well spread)
const ANS_POS = [
  { x: 112, y: 106 },
  { x: 588, y: 106 },
  { x: 112, y: 384 },
  { x: 588, y: 384 },
]

// Ghost house (centre-bottom)
const GH_X = CW / 2
const GH_Y = CH / 2 + 42

// Staggered ghost releases
const GHOST_START = [
  { x: GH_X - 26, y: GH_Y, vx: -1.0, vy: -0.8, delay:  30 },
  { x: GH_X,      y: GH_Y, vx:  0.0, vy: -1.1, delay: 100 },
  { x: GH_X + 26, y: GH_Y, vx:  0.9, vy: -0.7, delay: 170 },
]

/* ══════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════ */
function shuffleArr(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ── Per-unit cycle queue (module-level, survives component remounts) ──
   Guarantees every vocab is shown before any repeats.
   Format: unitKey → { list: Vocab[], pos: number }               ── */
const _unitQueues = new Map()

function getNextBatch(pool, unitKey) {
  let q = _unitQueues.get(unitKey)
  // Initialise or advance to next cycle when we've exhausted the list
  if (!q || q.pos + Q_COUNT > q.list.length) {
    const fresh = shuffleArr(pool)
    // Avoid the new batch starting with the same word the old one ended on
    if (q && fresh[0]?.id === q.list[q.list.length - 1]?.id && fresh.length > 1) {
      ;[fresh[0], fresh[1]] = [fresh[1], fresh[0]]
    }
    q = { list: fresh, pos: 0 }
    _unitQueues.set(unitKey, q)
  }
  const batch = q.list.slice(q.pos, q.pos + Q_COUNT)
  q.pos += Q_COUNT
  return batch
}

function buildQuestions(vocabs, unitKey) {
  const pool   = vocabs.filter(v => v.sentence?.includes('___'))
  const picked = getNextBatch(pool, unitKey)
  const pickedIds = new Set(picked.map(v => v.id))
  return picked.map(v => {
    // Wrong options come from vocabs NOT in this batch to avoid confusion
    const wrongPool = vocabs.filter(w => w.id !== v.id && !pickedIds.has(w.id))
    const wrong = shuffleArr(wrongPool).slice(0, 3).map(w => w.hanzi)
    // Fall back to any other vocab if wrongPool is too small
    if (wrong.length < 3) {
      const extra = shuffleArr(vocabs.filter(w => w.id !== v.id && !wrong.includes(w.hanzi)))
        .slice(0, 3 - wrong.length).map(w => w.hanzi)
      wrong.push(...extra)
    }
    return { vocab: v, correct: v.hanzi, options: shuffleArr([v.hanzi, ...wrong]) }
  })
}

/* ── Build questions from weak words (no queue, highest-error-rate first) ── */
function buildWeakQuestions(vocabs, weakWords) {
  const pool = weakWords.filter(v => v.sentence?.includes('___')).slice(0, Q_COUNT)
  if (pool.length === 0) return []
  const pickedIds = new Set(pool.map(v => v.id))
  return pool.map(v => {
    const wrongPool = vocabs.filter(w => w.id !== v.id && !pickedIds.has(w.id))
    const wrong = shuffleArr(wrongPool).slice(0, 3).map(w => w.hanzi)
    if (wrong.length < 3) {
      const extra = shuffleArr(vocabs.filter(w => w.id !== v.id && !wrong.includes(w.hanzi)))
        .slice(0, 3 - wrong.length).map(w => w.hanzi)
      wrong.push(...extra)
    }
    return { vocab: v, correct: v.hanzi, options: shuffleArr([v.hanzi, ...wrong]) }
  })
}

function makeAnswerTiles(options) {
  return ANS_POS.slice(0, options.length).map((pos, i) => ({
    x: pos.x, y: pos.y, text: options[i],
  }))
}

function generatePellets() {
  const pellets = []
  for (let x = 52; x < CW - 26; x += 48) {
    for (let y = 52; y < CH - 26; y += 48) {
      const nearAns    = ANS_POS.some(p => Math.abs(x - p.x) < ANS_W / 2 + 24 && Math.abs(y - p.y) < ANS_H / 2 + 24)
      const nearCenter = Math.hypot(x - CW / 2, y - CH / 2) < 74
      if (!nearAns && !nearCenter) pellets.push({ x, y, eaten: false })
    }
  }
  return pellets
}

/* ── Drawing helpers ── */
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r); ctx.closePath()
}

function drawPacman(ctx, x, y, r, mouthAngle, dir) {
  ctx.save()
  ctx.translate(x, y)
  const rot = dir.dx > 0 ? 0 : dir.dx < 0 ? Math.PI : dir.dy > 0 ? Math.PI * 0.5 : dir.dy < 0 ? -Math.PI * 0.5 : 0
  ctx.rotate(rot)

  ctx.shadowColor = 'rgba(255,214,10,0.70)'
  ctx.shadowBlur  = 22
  ctx.fillStyle   = '#FFE033'
  ctx.beginPath(); ctx.moveTo(0, 0)
  ctx.arc(0, 0, r, mouthAngle, Math.PI * 2 - mouthAngle)
  ctx.closePath(); ctx.fill()

  ctx.shadowBlur = 0
  const shine = ctx.createRadialGradient(-r * 0.32, -r * 0.32, 0, 0, 0, r)
  shine.addColorStop(0, 'rgba(255,255,220,0.38)')
  shine.addColorStop(1, 'rgba(180,130,0,0.12)')
  ctx.fillStyle = shine
  ctx.beginPath(); ctx.moveTo(0, 0)
  ctx.arc(0, 0, r, mouthAngle, Math.PI * 2 - mouthAngle)
  ctx.closePath(); ctx.fill()

  ctx.fillStyle = '#07111f'
  ctx.beginPath(); ctx.arc(-r * 0.1, -r * 0.52, r * 0.14, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

function drawGhost(ctx, x, y, r, color, frightened, px, py) {
  ctx.save()
  const bw = (r * 2) / 3
  const bc = frightened ? '#1a2ecc' : color

  ctx.fillStyle   = bc
  ctx.shadowColor = bc
  ctx.shadowBlur  = frightened ? 8 : 18

  ctx.beginPath()
  ctx.arc(x, y, r, Math.PI, 0, false)
  ctx.lineTo(x + r, y + r * 0.85)
  for (let i = 0; i < 3; i++) {
    const rx = x + r - i * bw, lx = rx - bw, mid = rx - bw / 2
    ctx.quadraticCurveTo(mid, y + r * 0.85 + (i % 2 === 0 ? r * 0.44 : r * 0.05), lx, y + r * 0.85)
  }
  ctx.closePath(); ctx.fill()
  ctx.shadowBlur = 0

  if (frightened) {
    ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 2.2
    const ey = y - r * 0.1
    for (const sx of [x - r * 0.3, x + r * 0.3]) {
      const er = r * 0.14
      ctx.beginPath(); ctx.moveTo(sx - er, ey - er); ctx.lineTo(sx + er, ey + er); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(sx + er, ey - er); ctx.lineTo(sx - er, ey + er); ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(x - r * 0.38, y + r * 0.26)
    ctx.quadraticCurveTo(x - r * 0.19, y + r * 0.10, x, y + r * 0.26)
    ctx.quadraticCurveTo(x + r * 0.19, y + r * 0.42, x + r * 0.38, y + r * 0.26)
    ctx.strokeStyle = 'rgba(255,255,255,0.48)'; ctx.stroke()
  } else {
    const angle = Math.atan2(py - y, px - x)
    const eo    = r * 0.13
    ctx.fillStyle = 'white'
    ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.08, r * 0.22, r * 0.28, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(x + r * 0.3, y - r * 0.08, r * 0.22, r * 0.28, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#1a5aff'
    ctx.beginPath(); ctx.arc(x - r * 0.3 + Math.cos(angle) * eo, y - r * 0.08 + Math.sin(angle) * eo, r * 0.12, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(x + r * 0.3 + Math.cos(angle) * eo, y - r * 0.08 + Math.sin(angle) * eo, r * 0.12, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

/* ── Init game state ── */
function initState(questions) {
  return {
    player: { x: CW / 2, y: CH / 2 - 44, dir: { dx: 1, dy: 0 }, mouthAngle: 0.25, mouthDir: 1, invincible: 0 },
    ghosts: GHOST_START.map((g, i) => ({
      x: g.x, y: g.y,
      vx: g.vx * GHOST_CFG[i].speed,
      vy: g.vy * GHOST_CFG[i].speed,
      speed:       GHOST_CFG[i].speed,
      jitter:      GHOST_CFG[i].jitter,
      updateEvery: GHOST_CFG[i].updateEvery,
      scatterLeft: 0,
      delay:       g.delay,
    })),
    answers:     questions[0] ? makeAnswerTiles(questions[0].options) : [],
    pellets:     generatePellets(),
    scorePopups: [],
    qIdx: 0, lives: MAX_LIVES, score: 0, combo: 0, correct: 0,
    frame: 0, preRoll: PREROLL,
    flashMsg: null, flashTimer: 0,
    answerCooldown: 0,   // frames to ignore answer collisions after a hit
    done: false,
  }
}

/* ══════════════════════════════════════════════════
   RENDER FRAME
   Accepts actual canvas pixel dims; scales the
   entire logical CW×CH space to fill them.
══════════════════════════════════════════════════ */
function renderFrame(ctx, s, qs, cw, ch) {
  ctx.clearRect(0, 0, cw, ch)

  // Non-uniform scale: fill the container completely
  const sx = cw / CW
  const sy = ch / CH
  ctx.save()
  ctx.scale(sx, sy)

  // ── Background ──
  const bg = ctx.createRadialGradient(CW / 2, CH / 2, 0, CW / 2, CH / 2, CW * 0.72)
  bg.addColorStop(0, '#0f1c32'); bg.addColorStop(1, '#060c18')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, CW, CH)

  // Grid dots
  ctx.fillStyle = 'rgba(0,212,255,0.052)'
  for (let gx = 26; gx < CW; gx += 36)
    for (let gy = 26; gy < CH; gy += 36) {
      ctx.beginPath(); ctx.arc(gx, gy, 1.5, 0, Math.PI * 2); ctx.fill()
    }

  // Border
  ctx.shadowColor = 'rgba(0,212,255,0.42)'; ctx.shadowBlur = 26
  ctx.strokeStyle = 'rgba(0,212,255,0.30)'; ctx.lineWidth = 2.5
  rrect(ctx, 5, 5, CW - 10, CH - 10, 14); ctx.stroke()
  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(0,212,255,0.07)'; ctx.lineWidth = 1
  rrect(ctx, 13, 13, CW - 26, CH - 26, 8); ctx.stroke()

  // Ghost house (dashed box)
  ctx.save()
  ctx.strokeStyle = 'rgba(155,93,229,0.34)'; ctx.lineWidth = 1.5
  ctx.setLineDash([5, 5])
  rrect(ctx, GH_X - 60, GH_Y - 32, 120, 66, 10); ctx.stroke()
  ctx.setLineDash([])
  rrect(ctx, GH_X - 60, GH_Y - 32, 120, 66, 10)
  ctx.fillStyle = 'rgba(155,93,229,0.04)'; ctx.fill()
  ctx.restore()

  // Pellets
  ctx.fillStyle = 'rgba(0,212,255,0.52)'
  for (const pel of s.pellets)
    if (!pel.eaten) { ctx.beginPath(); ctx.arc(pel.x, pel.y, 3.5, 0, Math.PI * 2); ctx.fill() }

  // ── Answer tiles – ALL look identical (no answer reveal!) ──
  const q   = qs[s.qIdx]
  const p   = s.player
  const TILE_COLOR     = '#00d4ff'
  const TILE_BG_BASE   = 0.07
  const TILE_GLOW_BASE = 0.30

  for (const ans of s.answers) {
    if (!ans.text) continue
    const dist = Math.hypot(p.x - ans.x, p.y - ans.y)
    const prox = Math.max(0, 1 - dist / 215)   // 0 = far, 1 = touching

    ctx.save()
    ctx.shadowColor = `rgba(0,212,255,${TILE_GLOW_BASE + prox * 0.55})`
    ctx.shadowBlur  = 10 + prox * 28
    rrect(ctx, ans.x - ANS_W / 2, ans.y - ANS_H / 2, ANS_W, ANS_H, 11)
    ctx.fillStyle = `rgba(0,212,255,${TILE_BG_BASE + prox * 0.13})`
    ctx.fill()
    ctx.shadowBlur  = 0
    ctx.strokeStyle = `rgba(0,212,255,${0.50 + prox * 0.45})`
    ctx.lineWidth   = 1.6 + prox * 0.9
    rrect(ctx, ans.x - ANS_W / 2, ans.y - ANS_H / 2, ANS_W, ANS_H, 11)
    ctx.stroke()

    ctx.fillStyle    = `rgba(220,245,255,${0.78 + prox * 0.22})`
    ctx.font         = `bold ${17 + Math.round(prox * 2)}px sans-serif`
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor  = `rgba(0,212,255,${prox * 0.7})`
    ctx.shadowBlur   = prox * 12
    ctx.fillText(ans.text, ans.x, ans.y)
    ctx.restore()
  }

  // ── Ghosts ──
  const frightened = p.invincible > 40
  for (let i = 0; i < s.ghosts.length; i++) {
    const g = s.ghosts[i]
    if (g.delay > 0) {
      ctx.save(); ctx.globalAlpha = 0.26
      drawGhost(ctx, g.x, g.y, GHOST_R, GHOST_COLORS[i], false, p.x, p.y)
      ctx.restore()
    } else {
      drawGhost(ctx, g.x, g.y, GHOST_R, GHOST_COLORS[i], frightened, p.x, p.y)
    }
  }

  // ── Pacman ──
  if (p.invincible === 0 || Math.floor(p.invincible / 7) % 2 === 0)
    drawPacman(ctx, p.x, p.y, PLAYER_R, p.mouthAngle, p.dir)

  // ── Score popups ──
  for (const sp of s.scorePopups) {
    ctx.save()
    ctx.globalAlpha  = Math.min(1, sp.life / 22)
    ctx.font         = 'bold 20px sans-serif'
    ctx.textAlign    = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle    = sp.color || '#06d6a0'
    ctx.shadowColor  = sp.color || '#06d6a0'; ctx.shadowBlur = 12
    ctx.fillText(sp.text, sp.x, sp.y)
    ctx.restore()
  }

  // ── Flash message ──
  if (s.flashMsg && s.flashTimer > 0) {
    const alpha  = Math.min(1, s.flashTimer / 16)
    const isGood = s.flashMsg.startsWith('✓')
    ctx.save(); ctx.globalAlpha = alpha
    ctx.font = 'bold 23px sans-serif'; ctx.textAlign = 'center'
    const tw = ctx.measureText(s.flashMsg).width + 36
    rrect(ctx, CW / 2 - tw / 2, CH / 2 - 25, tw, 50, 25)
    ctx.fillStyle = isGood ? 'rgba(6,214,160,0.18)' : 'rgba(247,37,133,0.18)'; ctx.fill()
    ctx.textBaseline = 'middle'
    ctx.fillStyle   = isGood ? '#06d6a0' : '#f72585'
    ctx.shadowColor = isGood ? '#06d6a0' : '#f72585'; ctx.shadowBlur = 28
    ctx.fillText(s.flashMsg, CW / 2, CH / 2)
    ctx.restore()
  }

  // ── Countdown overlay ──
  if (s.preRoll > 0) {
    ctx.save()
    ctx.fillStyle = 'rgba(6,12,24,0.74)'; ctx.fillRect(0, 0, CW, CH)

    // 265→191='3'(75f=1.25s), 190→116='2'(75f), 115→41='1'(75f), 40→0='出发！'(40f=0.67s)
    const num  = s.preRoll > 190 ? '3' : s.preRoll > 115 ? '2' : s.preRoll > 40 ? '1' : '出发！'
    const col  = s.preRoll > 190 ? '#06d6a0' : s.preRoll > 115 ? '#ffd60a' : s.preRoll > 40 ? '#f72585' : '#00d4ff'
    const fsize = num === '出发！' ? 72 : 114
    const frac  = ((s.preRoll - 1) % 75) / 75
    const scale = 1 + frac * 0.22

    ctx.translate(CW / 2, CH / 2); ctx.scale(scale, scale)
    ctx.font = `bold ${fsize}px sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 58
    ctx.fillText(num, 0, 0)
    ctx.restore()
  }

  ctx.restore()  // ← pop the sx/sy scale
}

/* ══════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════ */
export default function PacmanGame({ vocabs, unitNum }) {
  const canvasRef   = useRef(null)
  const containerRef = useRef(null)
  const stateRef    = useRef(null)
  const rafRef      = useRef(null)
  const dirRef      = useRef({ dx: 0, dy: 0 })
  const qsRef       = useRef([])
  const sizeRef     = useRef({ w: CW, h: CH })  // actual canvas pixels

  const [phase,      setPhase]      = useState('ready')
  const [hud,        setHud]        = useState({ lives: MAX_LIVES, score: 0, combo: 0, qIdx: 0, total: 0 })
  const [resultData, setResultData] = useState(null)
  const [curQ,       setCurQ]       = useState(null)

  /* ── ResizeObserver: canvas fills its container ── */
  useEffect(() => {
    const container = containerRef.current
    const canvas    = canvasRef.current
    if (!container || !canvas) return

    const apply = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      if (w > 10 && h > 10) {
        canvas.width  = w
        canvas.height = h
        sizeRef.current = { w, h }
      }
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  /* ── WASD + Arrow keys ── */
  useEffect(() => {
    if (phase !== 'playing') return
    const MAP = {
      ArrowLeft: { dx:-1,dy: 0 }, ArrowRight: { dx: 1,dy:0 },
      ArrowUp:   { dx: 0,dy:-1 }, ArrowDown:  { dx: 0,dy:1 },
      a:{dx:-1,dy:0}, A:{dx:-1,dy:0}, d:{dx:1,dy:0}, D:{dx:1,dy:0},
      w:{dx:0,dy:-1}, W:{dx:0,dy:-1}, s:{dx:0,dy:1}, S:{dx:0,dy:1},
    }
    const onKey = e => { if (MAP[e.key]) { e.preventDefault(); dirRef.current = MAP[e.key] } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase])

  /* ── Start game ── normal cycles through all vocabs; 'weak' targets mistakes ── */
  const startGame = useCallback((mode = 'normal') => {
    let qs
    if (mode === 'weak') {
      const ww = getWeakWords(unitNum, vocabs)
      qs = buildWeakQuestions(vocabs, ww)
      if (qs.length === 0) qs = buildQuestions(vocabs, unitNum)
    } else {
      qs = buildQuestions(vocabs, unitNum)
    }
    qsRef.current    = qs
    stateRef.current = initState(qs)
    dirRef.current   = { dx: 0, dy: 0 }
    setCurQ(qs[0] ?? null)
    setHud({ lives: MAX_LIVES, score: 0, combo: 0, qIdx: 0, total: qs.length })
    setPhase('playing')
  }, [vocabs, unitNum])

  /* ── Game loop ── */
  useEffect(() => {
    if (phase !== 'playing') {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const tick = () => {
      // Always re-queue RAF first so a crash inside tick doesn't kill the loop
      if (!stateRef.current?.done) {
        rafRef.current = requestAnimationFrame(tick)
      }

      const s  = stateRef.current
      const qs = qsRef.current
      if (!s || s.done) return

      try {
        s.frame++
        const { w: cw, h: ch } = sizeRef.current

        // ── Pre-roll countdown ──
        if (s.preRoll > 0) {
          s.preRoll--
          renderFrame(ctx, s, qs, cw, ch)
          return
        }

        // ── Player ──
        const p = s.player
        const d = dirRef.current
        if (d.dx !== 0 || d.dy !== 0) {
          p.dir = { ...d }
          p.x   = Math.max(PLAYER_R, Math.min(CW - PLAYER_R, p.x + d.dx * PLAYER_SPEED))
          p.y   = Math.max(PLAYER_R, Math.min(CH - PLAYER_R, p.y + d.dy * PLAYER_SPEED))
        }
        p.mouthAngle += 0.06 * p.mouthDir
        if (p.mouthAngle > 0.42 || p.mouthAngle < 0.02) p.mouthDir *= -1
        if (p.invincible > 0) p.invincible--
        if (s.answerCooldown > 0) s.answerCooldown--

        // ── Pellets ──
        for (const pel of s.pellets)
          if (!pel.eaten && Math.hypot(p.x - pel.x, p.y - pel.y) < PLAYER_R + 4) {
            pel.eaten = true; s.score += 5
          }

        // ── Ghosts ──
        for (const g of s.ghosts) {
          if (g.delay > 0) { g.delay--; continue }
          if (g.scatterLeft > 0) {
            g.scatterLeft--
            if (s.frame % 28 === 0) {
              const a = Math.random() * Math.PI * 2
              g.vx = Math.cos(a) * g.speed; g.vy = Math.sin(a) * g.speed
            }
          } else if (s.frame % g.updateEvery === 0) {
            const a = Math.atan2(p.y - g.y, p.x - g.x) + (Math.random() - 0.5) * g.jitter
            g.vx = Math.cos(a) * g.speed; g.vy = Math.sin(a) * g.speed
          }
          g.x += g.vx; g.y += g.vy
          if (g.x < GHOST_R || g.x > CW - GHOST_R) { g.vx *= -1; g.x = Math.max(GHOST_R, Math.min(CW - GHOST_R, g.x)) }
          if (g.y < GHOST_R || g.y > CH - GHOST_R) { g.vy *= -1; g.y = Math.max(GHOST_R, Math.min(CH - GHOST_R, g.y)) }
        }

        // ── Ghost collision ──
        if (p.invincible === 0) {
          for (const g of s.ghosts) {
            if (g.delay > 0) continue
            if (Math.hypot(p.x - g.x, p.y - g.y) < PLAYER_R + GHOST_R - 4) {
              s.lives--; s.combo = 0
              p.invincible = HIT_FRAMES
              s.answerCooldown = HIT_FRAMES   // can't grab answers while recovering
              p.x = CW / 2; p.y = CH / 2 - 44
              for (const g2 of s.ghosts) g2.scatterLeft = 120
              s.flashMsg = '💀 被抓到了！'; s.flashTimer = 65
              setHud(h => ({ ...h, lives: s.lives, combo: 0 }))
              if (s.lives <= 0) {
                s.done = true
                cancelAnimationFrame(rafRef.current)
                setTimeout(() => { setResultData({ score: s.score, correct: s.correct, total: qs.length, lives: 0 }); setPhase('result') }, 900)
              }
              break
            }
          }
        }

        if (s.done) { renderFrame(ctx, s, qs, cw, ch); return }

        // ── Answer collision (skip during cooldown) ──
        const q = qs[s.qIdx]
        if (q && s.answerCooldown === 0) {
          for (const ans of s.answers) {
            if (!ans.text) continue
            if (Math.abs(p.x - ans.x) < ANS_W / 2 - 2 && Math.abs(p.y - ans.y) < ANS_H / 2 - 2) {
              if (ans.text === q.correct) {
                s.combo++
                const pts = 100 + (s.combo - 1) * 30
                s.score += pts; s.correct++
                try { addCoins(s.combo >= 3 ? 3 : 2) } catch(_) {}
                try { addXP(10, '闯关') } catch(_) {}
                try { speak(q.correct) } catch(_) {}
                try { trackWordResult(unitNum, q.vocab.id, true) } catch(_) {}
                s.scorePopups.push({ x: ans.x, y: ans.y - 20, text: `+${pts}`, color: '#06d6a0', life: 56 })
                s.flashMsg = `✓ ${q.correct}！`; s.flashTimer = 60
                s.answerCooldown = 55   // ~0.9s cooldown before next answer can register
                s.qIdx++
                if (s.qIdx >= qs.length) {
                  s.done = true
                  cancelAnimationFrame(rafRef.current)
                  setTimeout(() => { setResultData({ score: s.score, correct: s.correct, total: qs.length, lives: s.lives }); setPhase('result') }, 900)
                  break
                }
                const nextQ = qs[s.qIdx]
                s.answers = makeAnswerTiles(nextQ.options)
                setCurQ(nextQ)
                setHud(h => ({ ...h, score: s.score, combo: s.combo, qIdx: s.qIdx }))
              } else {
                s.combo = 0; ans.text = ''
                p.invincible = 42; s.answerCooldown = 38
                try { trackWordResult(unitNum, q.vocab.id, false) } catch(_) {}
                s.scorePopups.push({ x: ans.x, y: ans.y - 20, text: '✗', color: '#f72585', life: 42 })
                s.flashMsg = '✗ 不对，继续找！'; s.flashTimer = 52
                setHud(h => ({ ...h, combo: 0 }))
              }
              break
            }
          }
        }

        // ── Popups ──
        s.scorePopups = s.scorePopups.filter(sp => sp.life > 0)
        for (const sp of s.scorePopups) { sp.y -= 1.1; sp.life-- }
        if (s.flashTimer > 0) s.flashTimer--; else s.flashMsg = null

        renderFrame(ctx, s, qs, cw, ch)
      } catch (err) {
        console.error('[PacmanGame] tick error:', err)
        // loop continues via the RAF queued at the top of tick
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [phase, unitNum])

  const dpad = (dx, dy) => e => { e.preventDefault(); dirRef.current = { dx, dy } }

  /* ══════════════════════════════════════
     READY SCREEN
  ══════════════════════════════════════ */
  if (phase === 'ready') {
    const qc        = Math.min(Q_COUNT, vocabs.filter(v => v.sentence?.includes('___')).length)
    const weakWords = getWeakWords(unitNum, vocabs)
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-5 overflow-y-auto"
           style={{ background: 'linear-gradient(160deg,#0a1628 0%,#060c18 100%)' }}>
        <div className="text-center">
          <div className="text-8xl mb-3 select-none"
               style={{ filter: 'drop-shadow(0 0 22px rgba(255,214,10,0.6))', animation: 'floatY 2.2s ease-in-out infinite' }}>
            👾
          </div>
          <h2 className="text-4xl font-black tracking-tight"
              style={{ color: '#ffd60a', textShadow: '0 0 32px rgba(255,214,10,0.65)' }}>词语闯关</h2>
          <p className="text-sm font-mono mt-1.5" style={{ color: 'rgba(0,212,255,0.4)' }}>
            词语吃豆 · {qc} 道题
          </p>
        </div>

        <div className="glass-card w-full max-w-md p-5 flex flex-col gap-2.5">
          <p className="text-center font-black text-xs tracking-widest mb-0.5" style={{ color: '#00d4ff' }}>◈ 游戏说明 ◈</p>
          {[
            { icon: '⌨️', text: 'WASD 或方向键 移动（手机使用屏幕方向键）' },
            { icon: '🎯', text: '阅读上方句子，找到正确词语并吃掉它' },
            { icon: '👻', text: '小心幽灵！被抓到失去一条命，共 3 条命' },
            { icon: '🔥', text: '连续答对触发连击，分数和金币翻倍' },
            { icon: '💙', text: '答对后幽灵变蓝，短暂无法伤害你' },
            { icon: '💫', text: '顺路吃小蓝点，每个 +5 分' },
          ].map(({ icon, text }, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="text-lg shrink-0 w-7 text-center">{icon}</span>
              <p className="text-sm leading-snug" style={{ color: 'rgba(200,230,255,0.72)' }}>{text}</p>
            </div>
          ))}
        </div>

        {/* ── Weak-word review panel (only shows after first play) ── */}
        {weakWords.length > 0 && (
          <div className="w-full max-w-md rounded-2xl p-4 flex flex-col gap-3"
               style={{ background: 'rgba(247,37,133,0.07)', border: '1.5px solid rgba(247,37,133,0.28)' }}>
            <p className="text-sm font-black text-center" style={{ color: '#f72585' }}>
              🔴 发现 {weakWords.length} 个待巩固词语
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {weakWords.slice(0, 6).map(w => (
                <span key={w.id} className="text-sm px-2.5 py-0.5 rounded-full font-bold"
                      style={{ background: 'rgba(247,37,133,0.12)', border: '1px solid rgba(247,37,133,0.3)', color: '#f72585' }}>
                  {w.hanzi}
                </span>
              ))}
              {weakWords.length > 6 && (
                <span className="text-sm px-2 py-0.5 rounded-full font-bold"
                      style={{ color: 'rgba(247,37,133,0.5)' }}>+{weakWords.length - 6}</span>
              )}
            </div>
            <button onClick={() => startGame('weak')}
                    className="w-full py-2.5 rounded-xl font-black text-base transition-all hover:scale-[1.02]"
                    style={{ background: 'rgba(247,37,133,0.15)', border: '1.5px solid rgba(247,37,133,0.5)', color: '#f72585' }}>
              复习弱词 🎯
            </button>
          </div>
        )}

        <button onClick={() => startGame('normal')} className="neon-cta w-full max-w-md text-xl py-4">开始游戏 🚀</button>
      </div>
    )
  }

  /* ══════════════════════════════════════
     RESULT SCREEN
  ══════════════════════════════════════ */
  if (phase === 'result') {
    const d = resultData || { score: 0, correct: 0, total: 0, lives: 0 }
    const pct = d.total > 0 ? d.correct / d.total : 0
    const stars = pct >= 0.875 ? 3 : pct >= 0.5 ? 2 : pct >= 0.25 ? 1 : 0
    const msgs  = ['再接再厉！', '不错哦！', '非常棒！', '完美通关！']
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-5 overflow-y-auto"
           style={{ background: 'linear-gradient(160deg,#0a1628 0%,#060c18 100%)' }}>
        <div className="flex gap-4 text-5xl">
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              opacity: i < stars ? 1 : 0.1,
              filter:  i < stars ? 'drop-shadow(0 0 14px rgba(255,214,10,0.9))' : 'none',
              animation: i < stars ? `floatY ${1.5 + i * 0.3}s ease-in-out infinite` : 'none',
              animationDelay: `${i * 0.2}s`,
            }}>⭐</span>
          ))}
        </div>
        <h2 className="text-3xl font-black"
            style={{ color: stars === 3 ? '#ffd60a' : stars === 2 ? '#06d6a0' : stars === 1 ? '#9b5de5' : '#aaa', textShadow: '0 0 24px currentColor' }}>
          {msgs[stars]}
        </h2>
        <div className="glass-card w-full max-w-md p-5 grid grid-cols-2 gap-4">
          {[
            { icon: '🏆', label: '最终得分', val: d.score.toLocaleString(), color: '#ffd60a' },
            { icon: '✅', label: '答对题数', val: `${d.correct} / ${d.total}`,  color: '#06d6a0' },
            { icon: '❤️', label: '剩余命数', val: d.lives,                       color: '#f72585' },
            { icon: '🎯', label: '正确率',   val: `${Math.round(pct * 100)}%`,   color: '#00d4ff' },
          ].map((stat, i) => (
            <div key={i} className="text-center py-1.5">
              <div className="text-2xl mb-0.5">{stat.icon}</div>
              <p className="text-xs font-mono" style={{ color: 'rgba(140,200,240,0.4)' }}>{stat.label}</p>
              <p className="text-2xl font-black mt-0.5"
                 style={{ color: stat.color, textShadow: `0 0 12px ${stat.color}55` }}>{stat.val}</p>
            </div>
          ))}
        </div>
        <button onClick={startGame} className="neon-cta w-full max-w-md text-lg py-3.5">再玩一次 🔄</button>
      </div>
    )
  }

  /* ══════════════════════════════════════
     PLAYING SCREEN
  ══════════════════════════════════════ */
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#07101e' }}>

      {/* ── HUD (compact single bar) ── */}
      <div className="px-3 py-1.5 shrink-0 flex items-center justify-between gap-2"
           style={{ borderBottom: '1px solid rgba(0,212,255,0.10)', background: 'rgba(0,0,0,0.38)' }}>
        <div className="flex gap-0.5">
          {Array.from({ length: MAX_LIVES }).map((_, i) => (
            <span key={i} style={{ fontSize: '1.05rem', lineHeight: 1, opacity: i < hud.lives ? 1 : 0.14,
              filter: i < hud.lives ? 'drop-shadow(0 0 5px rgba(247,37,133,0.7))' : 'none' }}>❤️</span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono tabular-nums" style={{ color: 'rgba(0,212,255,0.5)' }}>
            {hud.qIdx} / {hud.total}
          </span>
          {hud.combo >= 2 && (
            <span className="text-xs font-black px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(247,37,133,0.15)', color: '#f72585', border: '1px solid rgba(247,37,133,0.38)' }}>
              🔥 ×{hud.combo}
            </span>
          )}
        </div>
        <div className="font-black tabular-nums text-sm"
             style={{ color: '#ffd60a', textShadow: '0 0 10px rgba(255,214,10,0.55)' }}>
          {hud.score.toLocaleString()}
        </div>
      </div>

      {/* ── Question ── */}
      <div className="px-4 py-2.5 shrink-0"
           style={{ borderBottom: '1px solid rgba(0,212,255,0.12)', background: 'rgba(0,212,255,0.04)' }}>
        {curQ ? (
          <p className="text-lg leading-snug font-semibold" style={{ color: '#ddeeff' }}>
            {curQ.vocab.sentence.split('___').map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span className="font-black mx-1" style={{ color: '#00d4ff', borderBottom: '2px dashed rgba(0,212,255,0.6)', textShadow: '0 0 8px rgba(0,212,255,0.5)' }}>
                    ＿＿
                  </span>
                )}
              </span>
            ))}
          </p>
        ) : (
          <p className="text-base font-mono" style={{ color: 'rgba(0,212,255,0.35)' }}>找到正确答案并吃掉它</p>
        )}
      </div>

      {/* ── Canvas: fills ALL remaining space ── */}
      <div ref={containerRef} className="flex-1 overflow-hidden w-full" style={{ minHeight: 0 }}>
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
      </div>

      {/* ── D-pad (mobile only) ── */}
      <div className="sm:hidden shrink-0 flex flex-col items-center py-2 gap-1"
           style={{ borderTop: '1px solid rgba(0,212,255,0.08)' }}>
        <button onPointerDown={dpad(0,-1)} style={dpadBtn}>↑</button>
        <div className="flex gap-10">
          <button onPointerDown={dpad(-1,0)} style={dpadBtn}>←</button>
          <button onPointerDown={dpad( 1,0)} style={dpadBtn}>→</button>
        </div>
        <button onPointerDown={dpad(0,1)} style={dpadBtn}>↓</button>
      </div>

      {/* ── Keyboard hint (desktop only) ── */}
      <div className="hidden sm:flex shrink-0 items-center justify-center py-1.5"
           style={{ borderTop: '1px solid rgba(0,212,255,0.06)' }}>
        <span className="text-xs font-mono tracking-wider" style={{ color: 'rgba(0,212,255,0.26)' }}>
          ⌨ &nbsp; W A S D &nbsp;/&nbsp; 方向键 移动
        </span>
      </div>

    </div>
  )
}

const dpadBtn = {
  width: '52px', height: '52px', borderRadius: '13px',
  background: 'rgba(0,212,255,0.08)', border: '1.5px solid rgba(0,212,255,0.22)',
  color: '#00d4ff', fontSize: '20px', fontWeight: 'bold',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  userSelect: 'none', WebkitUserSelect: 'none',
  touchAction: 'manipulation', cursor: 'pointer',
}
