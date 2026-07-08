import { useState, useEffect, useRef, useMemo } from 'react'
import { speak } from '../utils/speech'
import { addCoins, trackMissionProgress, getCurrentName } from '../utils/userStore'
import { applyBossDamage } from '../utils/globalBoss'

/* ════════════════════════════════════════════════════════
   词语大作战 — Arcade-style bullet hell shmup
   Drag = move ship (no fire). Hold FIRE button = shoot.
   ════════════════════════════════════════════════════════ */

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function rand(min, max) { return min + Math.random() * (max - min) }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

/* ── Cycle queues: ensures every vocab is shown before repeating ── */
const _shooterQueues = new Map()
function getNextVocab(pool, unitKey) {
  if (!pool || pool.length === 0) return null
  if (!_shooterQueues.has(unitKey) || _shooterQueues.get(unitKey).length === 0) {
    _shooterQueues.set(unitKey, shuffle([...pool]))
  }
  return _shooterQueues.get(unitKey).shift()
}

const PLAYER_MAX_HP   = 4
const PLAYER_Y        = 88
const BULLET_SPEED    = 95
const FIRE_RATE       = 220
const ENEMY_W         = 14
const ENEMY_H         = 7
const POWERUP_FALL    = 18
const TOTAL_QUESTIONS = 18
const BOSS_EVERY      = 6

const POWERUP_TYPES = [
  { id: 'shield', emoji: '🛡️', color: '#5eead4', label: '护盾' },
  { id: 'rapid',  emoji: '⚡', color: '#facc15', label: '极速' },
  { id: 'slow',   emoji: '🐢', color: '#a78bfa', label: '减速' },
  { id: 'double', emoji: '💰', color: '#fbbf24', label: '双币' },
  { id: 'bomb',   emoji: '💣', color: '#ef4444', label: '炸弹' },
]

function archetypeForWave(qIdx, isBoss) {
  if (isBoss)    return { speedRange: [10, 16], optionCount: 5, decoyPatterns: ['zigzag','fast','straight','tank'], bossHp: 3 }
  if (qIdx < 4)  return { speedRange: [7, 10],  optionCount: 3, decoyPatterns: ['straight'] }
  if (qIdx < 8)  return { speedRange: [10, 14], optionCount: 4, decoyPatterns: ['straight','zigzag'] }
  if (qIdx < 13) return { speedRange: [13, 17], optionCount: 4, decoyPatterns: ['straight','zigzag','fast'] }
  return            { speedRange: [15, 20], optionCount: 5, decoyPatterns: ['zigzag','fast','tank','straight'] }
}

function pickQuestionType(qIdx) {
  if (qIdx < 2) return 'cloze'
  const r = Math.random()
  if (r < 0.45) return 'cloze'
  if (r < 0.80) return 'definition'
  return 'pinyin'
}

export default function WordShooterGame({ vocabs, unitNum }) {
  /* ── Display state (only updated via React) ── */
  const [phase,     setPhase]     = useState('intro')
  const [display,   setDisplay]   = useState({
    hp: PLAYER_MAX_HP, score: 0, combo: 0, bestCombo: 0, bombs: 3,
    qIdx: 0, killed: 0, activeBuffs: [],
  })
  const [question,  setQuestion]  = useState(null)
  const [waveAnnounce, setWaveAnnounce] = useState(null)
  const [bossAlert, setBossAlert] = useState(false)
  const [shake,     setShake]     = useState(false)
  const [flashColor, setFlashColor] = useState(null)
  const [, setRenderTick] = useState(0)

  /* ── Game state — all in refs ── */
  const G = useRef({
    hp: PLAYER_MAX_HP, score: 0, combo: 0, bestCombo: 0, bombs: 3,
    qIdx: 0, killed: 0,
    playerX: 50, targetX: 50,
    firing: false,
    lastShot: 0,
    enemies: [], bullets: [], powerups: [], particles: [], numbers: [],
    buffs: {},
    id: 0,
    waveTimer: null,
    lastTick: 0,
    raf: 0,
    finished: false,
  }).current

  const stageRef = useRef(null)
  const phaseRef = useRef(phase)
  useEffect(() => { phaseRef.current = phase }, [phase])

  const cloze = useMemo(() => vocabs.filter(v => v.sentence), [vocabs])

  /* ── Sync ref state to React display state once per frame ── */
  const sync = () => {
    const now = performance.now()
    const active = []
    Object.entries(G.buffs).forEach(([k, t]) => {
      if (t > now) {
        const def = POWERUP_TYPES.find(p => p.id === k)
        if (def) active.push({ ...def, secLeft: Math.ceil((t - now) / 1000) })
      }
    })
    setDisplay({
      hp: G.hp, score: G.score, combo: G.combo, bestCombo: G.bestCombo,
      bombs: G.bombs, qIdx: G.qIdx, killed: G.killed,
      activeBuffs: active,
    })
    setRenderTick(t => (t + 1) & 0xffff)
  }

  /* ── Spawn helpers ── */
  const spawnParticles = (x, y, color, count) => {
    for (let i = 0; i < count; i++) {
      G.id++
      const angle = (i / count) * Math.PI * 2 + rand(-0.3, 0.3)
      const speed = rand(20, 50)
      G.particles.push({
        id: G.id, x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color, life: 0.6, age: 0,
        size: rand(2, 5),
      })
    }
  }
  const spawnNumber = (x, y, text, color) => {
    G.id++
    G.numbers.push({ id: G.id, x, y, text, color, age: 0, life: 0.9 })
  }

  /* ── New question ── */
  const newQuestion = (idx) => {
    if (!vocabs || vocabs.length === 0) return
    const isBoss = idx > 0 && (idx % BOSS_EVERY === 0)
    const arch = archetypeForWave(idx, isBoss)

    let qType = pickQuestionType(idx)
    if (qType === 'cloze' && cloze.length === 0) qType = 'definition'

    const pool = qType === 'cloze' ? cloze : vocabs
    if (pool.length === 0) return

    const queueKey = `u${unitNum}_${qType === 'cloze' ? 'cloze' : 'all'}`
    const correct = getNextVocab(pool, queueKey)
    const distractors = shuffle(vocabs.filter(v => v.id !== correct.id && v.hanzi !== correct.hanzi))
                          .slice(0, Math.max(0, arch.optionCount - 1))
    const all = shuffle([correct, ...distractors])

    setQuestion({
      type: qType,
      prompt: qType === 'cloze' ? correct.sentence
            : qType === 'definition' ? correct.definition
            : correct.pinyin,
    })

    G.enemies = all.map((v, i) => {
      G.id++
      const slotW = 100 / all.length
      const baseX = clamp(slotW * i + slotW / 2 + rand(-slotW * 0.2, slotW * 0.2), 10, 90)
      const isCorrect = v.id === correct.id
      const pattern = isCorrect
        ? (isBoss ? 'boss' : 'straight')
        : arch.decoyPatterns[Math.floor(Math.random() * arch.decoyPatterns.length)]
      const speedY = rand(arch.speedRange[0], arch.speedRange[1])
      return {
        id: G.id,
        hanzi: v.hanzi,
        x: baseX,
        y: -8 - i * 2 - rand(0, 6),
        vx: pattern === 'zigzag' ? (Math.random() < 0.5 ? -12 : 12) : 0,
        vy: pattern === 'fast' ? speedY * 1.5 : speedY,
        pattern, isCorrect,
        hp: pattern === 'tank' ? 2 : (pattern === 'boss' ? (arch.bossHp || 3) : 1),
        maxHp: pattern === 'tank' ? 2 : (pattern === 'boss' ? (arch.bossHp || 3) : 1),
        size: pattern === 'boss' ? 1.4 : (pattern === 'tank' ? 1.15 : 1.0),
      }
    })

    if (isBoss) {
      setBossAlert(true)
      setTimeout(() => setBossAlert(false), 1200)
      setWaveAnnounce({ text: '👹 头目波！集中火力！' })
      setTimeout(() => setWaveAnnounce(null), 1100)
    } else if (idx === 0) {
      setWaveAnnounce({ text: '出击！' })
      setTimeout(() => setWaveAnnounce(null), 1100)
    } else if (idx === 4 || idx === 13) {
      setWaveAnnounce({ text: idx === 4 ? '⚠️ 加速！' : '⚡ 最终冲刺' })
      setTimeout(() => setWaveAnnounce(null), 1100)
    }
  }

  /* ── Player damage ── */
  const damagePlayer = () => {
    const now = performance.now()
    if ((G.buffs.shield || 0) > now) {
      G.buffs.shield = 0
      spawnParticles(G.playerX, PLAYER_Y, '#5eead4', 12)
      setFlashColor('#5eead4')
      setTimeout(() => setFlashColor(null), 250)
      return
    }
    G.combo = 0
    G.hp -= 1
    setShake(true); setTimeout(() => setShake(false), 350)
    setFlashColor('#ef4444'); setTimeout(() => setFlashColor(null), 300)
    if (G.hp <= 0) {
      finalize(false)
    }
  }

  /* ── Question resolved (correct kill OR correct escaped) ── */
  const resolveQuestion = () => {
    if (G.waveTimer) return
    G.waveTimer = setTimeout(() => {
      G.waveTimer = null
      G.enemies = []
      G.qIdx += 1
      if (G.qIdx >= TOTAL_QUESTIONS) {
        finalize(true)
        return
      }
      newQuestion(G.qIdx)
    }, 350)
  }

  /* ── Finalize ── */
  const finalize = (won) => {
    if (G.finished) return
    G.finished = true
    G.enemies = []; G.bullets = []; G.powerups = []
    if (G.waveTimer) { clearTimeout(G.waveTimer); G.waveTimer = null }
    if (won) {
      const perfect = G.hp === PLAYER_MAX_HP
      addCoins(18)
      if (perfect) addCoins(10)
      if (G.bestCombo >= 15) addCoins(8)
      else if (G.bestCombo >= 10) addCoins(8)
      trackMissionProgress('boss:complete')
      if (perfect) trackMissionProgress('boss:perfect')
      applyBossDamage(getCurrentName(), Math.max(1, Math.round(G.score * 0.15)))
      setPhase('victory')
    } else {
      setPhase('defeat')
    }
  }

  /* ── Use bomb ── */
  const useBomb = () => {
    if (phaseRef.current !== 'playing' || G.bombs <= 0) return
    G.bombs -= 1
    setShake(true); setTimeout(() => setShake(false), 400)
    setFlashColor('#fbbf24'); setTimeout(() => setFlashColor(null), 300)
    const survivors = []
    for (const e of G.enemies) {
      if (e.isCorrect) survivors.push(e)
      else spawnParticles(e.x, e.y, '#fbbf24', 14)
    }
    G.enemies = survivors
  }

  /* ── Start game ── */
  const startGame = () => {
    // Reset cycle queues so a new game always reshuffles the vocab order
    _shooterQueues.delete(`u${unitNum}_all`)
    _shooterQueues.delete(`u${unitNum}_cloze`)
    G.hp = PLAYER_MAX_HP; G.score = 0; G.combo = 0; G.bestCombo = 0; G.bombs = 3
    G.killed = 0; G.qIdx = 0; G.playerX = 50; G.targetX = 50
    G.firing = false; G.lastShot = 0
    G.enemies = []; G.bullets = []; G.powerups = []; G.particles = []; G.numbers = []
    G.buffs = {}
    G.finished = false
    if (G.waveTimer) { clearTimeout(G.waveTimer); G.waveTimer = null }
    setQuestion(null)
    setDisplay({
      hp: PLAYER_MAX_HP, score: 0, combo: 0, bestCombo: 0, bombs: 3,
      qIdx: 0, killed: 0, activeBuffs: [],
    })
    setPhase('playing')
    setTimeout(() => newQuestion(0), 200)
  }

  /* ── Pointer controls ── */
  const movePointer = (e) => {
    if (!stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    G.targetX = clamp(((e.clientX - rect.left) / rect.width) * 100, 5, 95)
  }
  const startFire = () => { G.firing = true }
  const stopFire  = () => { G.firing = false }

  /* ── Keyboard ── */
  useEffect(() => {
    if (phase !== 'playing') return
    const onKeyDown = (e) => {
      if (e.code === 'Space')      { e.preventDefault(); G.firing = true }
      if (e.code === 'ArrowLeft')  G.targetX = clamp(G.targetX - 8, 5, 95)
      if (e.code === 'ArrowRight') G.targetX = clamp(G.targetX + 8, 5, 95)
      if (e.code === 'KeyB')       useBomb()
    }
    const onKeyUp = (e) => { if (e.code === 'Space') G.firing = false }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
    }
  }, [phase])

  /* ── Game loop ── */
  useEffect(() => {
    if (phase !== 'playing') return
    G.lastTick = performance.now()
    G.finished = false

    const tick = (now) => {
      if (phaseRef.current !== 'playing') return
      const dt = Math.min((now - G.lastTick) / 1000, 0.05)
      G.lastTick = now

      const slowFactor = (G.buffs.slow || 0) > now ? 0.4 : 1.0
      const rapidActive = (G.buffs.rapid || 0) > now

      // Move ship
      const dx = G.targetX - G.playerX
      G.playerX += dx * Math.min(1, dt * 12)

      // Fire
      const fireInterval = rapidActive ? 90 : FIRE_RATE
      if (G.firing && now - G.lastShot >= fireInterval) {
        G.lastShot = now
        G.id++
        G.bullets.push({ id: G.id, x: G.playerX, y: PLAYER_Y - 4, vx: 0, vy: -BULLET_SPEED })
        if (rapidActive) {
          G.id++; G.bullets.push({ id: G.id, x: G.playerX - 3, y: PLAYER_Y - 4, vx: -8, vy: -BULLET_SPEED })
          G.id++; G.bullets.push({ id: G.id, x: G.playerX + 3, y: PLAYER_Y - 4, vx:  8, vy: -BULLET_SPEED })
        }
      }

      // Bullets
      const nextBullets = []
      for (const b of G.bullets) {
        b.y += b.vy * dt
        b.x += b.vx * dt
        if (b.y > -5 && b.y < 105 && b.x > -5 && b.x < 105) nextBullets.push(b)
      }
      G.bullets = nextBullets

      // Enemies
      for (const e of G.enemies) {
        e.y += e.vy * dt * slowFactor
        if (e.pattern === 'zigzag') {
          e.x += e.vx * dt * slowFactor
          if (e.x < 8 || e.x > 92) e.vx = -e.vx
        }
      }

      // Powerups
      for (const p of G.powerups) p.y += POWERUP_FALL * dt

      // Bullet-enemy collisions
      let questionResolved = false
      const remainBullets = []
      for (const b of G.bullets) {
        let hit = false
        for (const e of G.enemies) {
          if (e.hp <= 0) continue
          const ew = ENEMY_W * e.size
          const eh = ENEMY_H * e.size
          if (Math.abs(b.x - e.x) < ew / 2 && Math.abs(b.y - e.y) < eh / 2) {
            hit = true
            e.hp -= 1
            spawnParticles(e.x, e.y, e.isCorrect ? '#fde68a' : '#a78bfa', 4)
            if (e.hp <= 0) {
              e.dead = true
              if (e.isCorrect) {
                const doubleActive = (G.buffs.double || 0) > now
                const baseCoin = e.pattern === 'boss' ? 2 : 1
                const coinReward = doubleActive ? baseCoin * 2 : baseCoin
                addCoins(coinReward)
                trackMissionProgress('boss:correct')
                speak(e.hanzi)
                spawnParticles(e.x, e.y, '#fde68a', 18)
                spawnNumber(e.x, e.y, `+${coinReward}🪙`, '#fbbf24')
                G.score += (e.pattern === 'boss' ? 3 : 1)
                G.killed += 1
                G.combo += 1
                if (G.combo > G.bestCombo) G.bestCombo = G.combo
                if (G.combo === 5)       { addCoins(4);  spawnNumber(e.x, e.y - 5, '连击 x5! +4🪙',   '#fbbf24') }
                else if (G.combo === 10) { addCoins(8);  spawnNumber(e.x, e.y - 5, '连击 x10! +8🪙',  '#ef4444') }
                else if (G.combo === 15) { addCoins(14); spawnNumber(e.x, e.y - 5, '神级x15! +14🪙',  '#ef4444') }
                else if (G.combo > 15 && G.combo % 5 === 0) {
                  addCoins(12); spawnNumber(e.x, e.y - 5, `x${G.combo}! +12🪙`, '#ef4444')
                }
                if (e.pattern === 'boss' || Math.random() < 0.28) {
                  G.id++
                  const pu = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)]
                  G.powerups.push({
                    id: G.id, x: e.x, y: e.y,
                    type: pu.id, emoji: pu.emoji, color: pu.color, label: pu.label,
                  })
                }
                questionResolved = true
              } else {
                spawnParticles(e.x, e.y, '#ef4444', 14)
                spawnNumber(e.x, e.y, '错误!', '#ef4444')
                damagePlayer()
              }
            }
            break
          }
        }
        if (!hit) remainBullets.push(b)
      }
      G.bullets = remainBullets
      G.enemies = G.enemies.filter(e => !e.dead)

      // Enemy escape
      const escapees = G.enemies.filter(e => e.y > 100)
      if (escapees.length > 0) {
        G.enemies = G.enemies.filter(e => e.y <= 100)
        if (escapees.some(e => e.isCorrect)) {
          questionResolved = true
          damagePlayer()
        }
      }

      // Powerup pickup
      const remainPU = []
      for (const p of G.powerups) {
        if (p.y > 100) continue
        if (Math.abs(p.x - G.playerX) < 8 && Math.abs(p.y - PLAYER_Y) < 6) {
          if (p.type === 'bomb') {
            G.bombs = Math.min(99, G.bombs + 1)
            spawnNumber(p.x, p.y, '+1💣', '#ef4444')
          } else {
            const duration = p.type === 'shield' ? 9e7 : 8000
            G.buffs[p.type] = now + duration
            spawnNumber(p.x, p.y, p.label, p.color)
          }
          spawnParticles(p.x, p.y, p.color, 12)
        } else {
          remainPU.push(p)
        }
      }
      G.powerups = remainPU

      // Particles
      const remainParts = []
      for (const p of G.particles) {
        p.age += dt
        if (p.age >= p.life) continue
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 60 * dt
        remainParts.push(p)
      }
      G.particles = remainParts

      // Floating numbers
      const remainNums = []
      for (const n of G.numbers) {
        n.age += dt
        if (n.age >= n.life) continue
        n.y -= 18 * dt
        remainNums.push(n)
      }
      G.numbers = remainNums

      // Resolve question
      if (questionResolved && phaseRef.current === 'playing') {
        resolveQuestion()
      }

      sync()
      if (phaseRef.current === 'playing') {
        G.raf = requestAnimationFrame(tick)
      }
    }

    G.raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(G.raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  /* ════════ SCREENS ════════ */

  if (phase === 'intro') {
    return (
      <div className="flex-1 overflow-y-auto relative bg-gradient-to-b from-[#040726] via-[#0c1248] to-[#040726] text-cream">
        <Starfield />
        <div className="relative z-10 flex flex-col items-center justify-center text-center gap-3 max-w-md mx-auto w-full min-h-full p-6">
          <div className="text-7xl animate-shipFloat">🚀</div>
          <p className="text-gold text-xs tracking-widest">✦ 词语大作战 ✦</p>
          <h2 className="text-3xl font-black">墨锋星河 · 终极保卫战</h2>
          <p className="text-cream/80 leading-relaxed text-base">
            操控笔锋飞船，识破伪装的词语外星人！
          </p>
          <div className="bg-cream/10 backdrop-blur border border-cream/25 rounded-2xl p-4 text-left text-sm space-y-1.5 w-full">
            <p>👆 <strong className="text-gold">拖动屏幕</strong> 移动飞船（不会开火）</p>
            <p>🔥 <strong className="text-red-300">按住「开火」按钮</strong> 持续射击</p>
            <p>🎯 <strong className="text-gold">射中正确词</strong> → 通关 + 掉落道具</p>
            <p>💢 <strong className="text-red-300">射错或漏掉</strong> → 扣血 ❤️</p>
            <p>💣 <strong>炸弹键</strong>：清空所有错误词（开局 3 颗）</p>
            <p className="text-cream/60 text-xs mt-1">电脑：←/→ 移动 · 空格开火 · B 炸弹</p>
          </div>
          <div className="bg-gradient-to-br from-purple-900/40 to-purple-700/40 border border-purple-400/30 rounded-2xl p-3 w-full">
            <p className="text-gold text-xs tracking-widest mb-1.5">道具掉落</p>
            <div className="grid grid-cols-5 gap-1 text-center text-xs">
              {POWERUP_TYPES.map(p => (
                <div key={p.id}>
                  <div className="text-2xl">{p.emoji}</div>
                  <div className="text-cream/70">{p.label}</div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-cream/60 text-sm">{TOTAL_QUESTIONS} 题 · 每 {BOSS_EVERY} 题一个 👹 头目波</p>
          <button onClick={startGame}
            className="mt-2 bg-gradient-to-br from-gold to-amber-600 text-brick px-10 py-3 rounded-2xl font-black text-lg shadow-2xl hover:scale-105 active:scale-100 transition-all border-2 border-cream/40 animate-glow">
            出击！🚀
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'victory') {
    const perfect = display.hp === PLAYER_MAX_HP
    const bossDmg = Math.max(1, Math.round(display.score * 0.4))
    return (
      <div className="flex-1 overflow-y-auto relative bg-gradient-to-b from-[#040726] via-[#0c1248] to-[#040726] text-cream">
        <Starfield />
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {['🎉','⭐','💥','✨','🚀','🪙','🏆','💫','🌟','🎊','⚡','🛡️'].map((c, i) => {
            const angle = (i / 12) * Math.PI * 2
            const r = 140 + (i % 3) * 30
            return (
              <span key={i} className="absolute text-2xl animate-confettiPop"
                style={{ '--cx': `${Math.cos(angle) * r}px`, '--cy': `${Math.sin(angle) * r}px`, animationDelay: `${i * 50}ms` }}>{c}</span>
            )
          })}
        </div>
        <div className="relative z-10 flex flex-col items-center text-center gap-2 mx-auto max-w-md w-full min-h-full justify-center p-6">
          <div className="text-7xl animate-pop">🏆</div>
          <h2 className="text-3xl font-black text-gold">星河守护者！</h2>
          <div className="bg-cream/10 border-2 border-gold/40 rounded-2xl px-6 py-4 backdrop-blur flex flex-col gap-1 mt-1">
            <p className="text-4xl font-black text-gold">{display.score} <span className="text-cream/50 text-base">分</span></p>
            <p className="text-base text-cream/85">最高连击 <strong className="text-gold">x{display.bestCombo} 🔥</strong> · 击落 {display.killed}</p>
            <div className="flex gap-1 justify-center mt-1">
              {Array.from({ length: PLAYER_MAX_HP }).map((_, i) => (
                <span key={i} className={`text-xl ${i < display.hp ? '' : 'grayscale opacity-25'}`}>❤️</span>
              ))}
            </div>
          </div>
          {perfect && <p className="text-gold font-black px-4 py-1 rounded-full bg-gold/15 border border-gold/40 animate-glow">⚡ 无伤通关 +10 🪙</p>}
          {display.bestCombo >= 15 && <p className="text-gold font-black px-4 py-1 rounded-full bg-gold/15 border border-gold/40">🎯 神射手 +8 🪙</p>}
          {display.bestCombo >= 10 && display.bestCombo < 15 && <p className="text-gold font-black px-4 py-1 rounded-full bg-gold/15 border border-gold/40">🎯 精准射手 +8 🪙</p>}
          <p className="text-cream/70 text-sm mt-1">通关奖励 +18 🪙 · 全班 Boss <strong className="text-gold">-{bossDmg}</strong> HP</p>
          <button onClick={startGame}
            className="mt-3 bg-gradient-to-br from-gold to-amber-600 text-brick px-8 py-3 rounded-2xl font-black text-lg shadow-2xl hover:scale-105 transition-all border-2 border-cream/40">再战 🚀</button>
        </div>
      </div>
    )
  }

  if (phase === 'defeat') {
    return (
      <div className="flex-1 overflow-y-auto relative bg-gradient-to-b from-[#040726] via-[#1a0c2c] to-[#040726] text-cream">
        <Starfield />
        <div className="relative z-10 flex flex-col items-center text-center gap-2 mx-auto max-w-md w-full min-h-full justify-center p-6">
          <div className="text-7xl animate-pop">💥</div>
          <h2 className="text-3xl font-black text-red-300">飞船爆炸…</h2>
          <p className="text-cream/75">坚持到第 <strong className="text-gold">{display.qIdx + 1}</strong>/{TOTAL_QUESTIONS} 题</p>
          <div className="bg-cream/10 border-2 border-red-400/40 rounded-2xl px-6 py-3 backdrop-blur">
            <p className="text-3xl font-black text-cream">{display.score} <span className="text-cream/50 text-base">分</span></p>
            <p className="text-sm text-cream/70">最高连击 x{display.bestCombo} · 击落 {display.killed}</p>
          </div>
          <button onClick={startGame}
            className="mt-3 bg-brick text-cream px-8 py-3 rounded-2xl font-bold text-lg hover:bg-brick-mid transition-colors shadow-lg">重新出击 🔄</button>
        </div>
      </div>
    )
  }

  /* ════════ PLAYING ════════ */
  const shieldActive = (G.buffs.shield || 0) > performance.now()
  const flashStyle = flashColor ? { boxShadow: `inset 0 0 80px 0 ${flashColor}88` } : {}

  return (
    <div className={`flex-1 flex flex-col relative overflow-hidden select-none ${shake ? 'animate-shake' : ''}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-[#040726] via-[#0c1248] to-[#0a0e3f]" />
      <Starfield />
      <Starfield2 />

      {bossAlert && (
        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-red-500/15">
          <div className="text-center animate-pop">
            <div className="text-6xl">👹</div>
            <p className="text-red-300 font-black text-2xl tracking-wider mt-2">头目来袭！</p>
          </div>
        </div>
      )}

      {/* HUD */}
      <div className="relative z-10 px-3 py-2 flex items-center justify-between bg-black/40 backdrop-blur border-b border-cream/15 shrink-0">
        <div className="flex items-center gap-1">
          {Array.from({ length: PLAYER_MAX_HP }).map((_, i) => (
            <span key={i} className={`text-lg ${i < display.hp ? '' : 'grayscale opacity-25'}`}>❤️</span>
          ))}
        </div>
        <div className="text-center">
          <p className="text-cream/60 text-xs">{display.qIdx + 1}/{TOTAL_QUESTIONS}</p>
          {display.combo >= 2 && (
            <p className={`font-black text-sm ${display.combo >= 10 ? 'text-red-400 animate-pulse2' : display.combo >= 5 ? 'text-gold' : 'text-cream/80'}`}>
              🔥 x{display.combo}
            </p>
          )}
        </div>
        <div className="text-right flex items-center gap-2">
          <button
            onClick={useBomb}
            disabled={display.bombs <= 0}
            className={`px-2.5 py-1 rounded-lg font-black text-sm border-2 ${
              display.bombs > 0
                ? 'bg-red-500/30 border-red-400 text-cream hover:bg-red-500/50 active:scale-90 animate-pulse2'
                : 'bg-cream/5 border-cream/15 text-cream/30'
            }`}
          >💣 {display.bombs}</button>
          <div>
            <p className="text-gold text-xs leading-none">分</p>
            <p className="text-cream font-black tabular-nums leading-tight">{display.score}</p>
          </div>
        </div>
      </div>

      {/* Active buffs */}
      {display.activeBuffs.length > 0 && (
        <div className="relative z-10 px-3 py-1 flex gap-1.5 bg-black/30 shrink-0 flex-wrap">
          {display.activeBuffs.map(b => (
            <div key={b.id} className="flex items-center gap-1 bg-cream/15 backdrop-blur rounded-full px-2 py-0.5 border border-cream/30">
              <span className="text-sm">{b.emoji}</span>
              <span className="text-cream text-xs font-bold">{b.label}{b.id !== 'shield' && ` ${b.secLeft}s`}</span>
            </div>
          ))}
        </div>
      )}

      {/* Question prompt */}
      {question && (
        <div className="relative z-10 mx-3 mt-2 bg-cream/12 backdrop-blur border border-gold/50 rounded-xl px-3 py-2 shrink-0">
          <p className="text-gold text-[10px] tracking-widest mb-0.5">
            {question.type === 'cloze' ? '📝 填入正确词语'
           : question.type === 'definition' ? '💡 击落符合释义的词'
           : '🔊 击落对应拼音的词'}
          </p>
          <p className="text-cream text-base leading-snug">
            {question.type === 'cloze' ? (() => {
              const parts = question.prompt.split('___')
              return (<>{parts[0]}<span className="inline-block mx-1 px-3 border-b-2 border-gold text-gold/40 font-black align-bottom">＿＿</span>{parts[1] || ''}</>)
            })()
            : question.type === 'pinyin' ? <span className="font-bold text-lg tracking-wider">{question.prompt}</span>
            : question.prompt}
          </p>
        </div>
      )}

      {/* Battlefield */}
      <div
        ref={stageRef}
        className="relative z-10 flex-1 overflow-hidden touch-none"
        style={flashStyle}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); movePointer(e) }}
        onPointerMove={(e) => { if (e.buttons || e.pointerType === 'touch') movePointer(e) }}
      >
        {waveAnnounce && (
          <div className="absolute inset-x-0 top-1/4 flex justify-center z-30 pointer-events-none">
            <div className="bg-black/60 border-2 border-gold rounded-2xl px-6 py-2 backdrop-blur animate-pop">
              <p className="text-cream font-black text-xl">{waveAnnounce.text}</p>
            </div>
          </div>
        )}

        {/* Enemies */}
        {G.enemies.map(e => {
          const isBossE = e.pattern === 'boss'
          const isTank  = e.pattern === 'tank'
          const isFast  = e.pattern === 'fast'
          const isZig   = e.pattern === 'zigzag'
          return (
            <div key={e.id}
              className="absolute px-2.5 py-1.5 rounded-xl border-2 font-black shadow-2xl pointer-events-none"
              style={{
                left: `${e.x}%`,
                top:  `${e.y}%`,
                fontSize: `${e.size * 1.05}rem`,
                background: isBossE ? 'linear-gradient(135deg,#7f1d1d,#dc2626)'
                          : isTank  ? 'linear-gradient(135deg,#3f3f46,#71717a)'
                          : isFast  ? 'linear-gradient(135deg,#7c2d12,#ea580c)'
                          : isZig   ? 'linear-gradient(135deg,#1e3a8a,#3b82f6)'
                          :           'linear-gradient(135deg,#581c87,#a855f7)',
                borderColor: isBossE ? '#fca5a5' : 'rgba(253,243,224,0.5)',
                color: '#FDF3E0',
                boxShadow: isBossE
                  ? '0 0 24px rgba(239,68,68,0.7), inset 0 0 16px rgba(255,255,255,0.2)'
                  : '0 0 14px rgba(160,100,255,0.5), inset 0 0 10px rgba(255,255,255,0.15)',
                transform: 'translate(-50%, -50%)',
              }}
            >
              {e.hanzi}
              {(isTank || isBossE) && e.maxHp > 1 && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/60 rounded-full h-1 w-12 overflow-hidden border border-cream/40">
                  <div className="h-full bg-red-400" style={{ width: `${(e.hp / e.maxHp) * 100}%` }} />
                </div>
              )}
            </div>
          )
        })}

        {/* Powerups */}
        {G.powerups.map(p => (
          <div key={p.id}
            className="absolute text-2xl pointer-events-none animate-pulse2"
            style={{
              left: `${p.x}%`,
              top:  `${p.y}%`,
              transform: 'translate(-50%, -50%)',
              filter: `drop-shadow(0 0 8px ${p.color})`,
            }}>{p.emoji}</div>
        ))}

        {/* Bullets */}
        {G.bullets.map(b => (
          <div key={b.id}
            className="absolute pointer-events-none"
            style={{
              left:  `${b.x}%`,
              top:   `${b.y}%`,
              width:  '4px',
              height: '14px',
              background: 'linear-gradient(to top, rgba(255,200,80,0), rgba(255,210,120,1), rgba(255,255,255,1))',
              boxShadow: '0 0 10px rgba(255,200,80,0.9)',
              transform: 'translate(-50%, -50%)',
              borderRadius: '999px',
            }} />
        ))}

        {/* Particles */}
        {G.particles.map(p => (
          <div key={p.id}
            className="absolute pointer-events-none"
            style={{
              left: `${p.x}%`,
              top:  `${p.y}%`,
              width:  `${p.size}px`,
              height: `${p.size}px`,
              background: p.color,
              borderRadius: '999px',
              opacity: 1 - p.age / p.life,
              transform: 'translate(-50%, -50%)',
              boxShadow: `0 0 6px ${p.color}`,
            }} />
        ))}

        {/* Floating numbers */}
        {G.numbers.map(n => (
          <div key={n.id}
            className="absolute pointer-events-none font-black text-sm whitespace-nowrap"
            style={{
              left: `${n.x}%`,
              top:  `${n.y}%`,
              color: n.color,
              opacity: 1 - n.age / n.life,
              textShadow: '0 2px 4px rgba(0,0,0,0.8)',
              transform: `translate(-50%, -50%) scale(${1 + n.age * 0.3})`,
            }}>{n.text}</div>
        ))}

        {/* Ship */}
        <div
          className="absolute pointer-events-none z-20"
          style={{
            left: `${G.playerX}%`,
            top:  `${PLAYER_Y}%`,
            transform: 'translate(-50%, -50%)',
            filter: shieldActive ? 'drop-shadow(0 0 10px #5eead4)' : 'drop-shadow(0 4px 6px rgba(0,0,0,0.6))',
          }}
        >
          {shieldActive && (
            <div className="absolute -inset-3 rounded-full border-2 border-teal-300 animate-pulse2" style={{ boxShadow: '0 0 16px #5eead4' }} />
          )}
          <div className="text-4xl">🚀</div>
          <div className="absolute left-1/2 -translate-x-1/2 top-full">
            <div className="w-2 h-3 bg-gradient-to-b from-orange-400 to-transparent rounded-full animate-pulse2" />
          </div>
        </div>

        {/* Control hint */}
        {display.qIdx === 0 && (
          <div className="absolute inset-x-0 top-1/2 flex justify-center pointer-events-none">
            <div className="bg-black/60 border border-cream/40 rounded-full px-4 py-2 text-cream/90 text-sm animate-pulse2">
              👆 拖动飞船 · 👉 按住「开火」射击
            </div>
          </div>
        )}

        {/* FIRE BUTTON */}
        <button
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId) } catch {} ; startFire() }}
          onPointerUp={(e)   => { e.stopPropagation(); stopFire() }}
          onPointerCancel={(e) => { e.stopPropagation(); stopFire() }}
          onPointerLeave={(e) => { e.stopPropagation(); stopFire() }}
          onContextMenu={(e) => e.preventDefault()}
          className="absolute bottom-3 right-3 z-30 w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-700 border-4 border-cream/50 text-cream font-black text-base shadow-2xl active:scale-90 select-none touch-none leading-tight"
          style={{ boxShadow: '0 0 24px rgba(239,68,68,0.7), inset 0 4px 8px rgba(255,255,255,0.25)' }}
        >
          🔥<br/>开火
        </button>
      </div>
    </div>
  )
}

function Starfield() {
  const stars = useMemo(() => Array.from({ length: 50 }).map((_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() < 0.7 ? 1.5 : 2.5, delay: Math.random() * 3,
  })), [])
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {stars.map(s => (
        <div key={s.id}
          className="absolute rounded-full bg-cream/80 animate-starTwinkle"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.size}px`, height: `${s.size}px`, animationDelay: `${s.delay}s` }} />
      ))}
    </div>
  )
}
function Starfield2() {
  const stars = useMemo(() => Array.from({ length: 20 }).map((_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: 3 + Math.random() * 2, delay: Math.random() * 3,
    color: ['#a78bfa','#fbbf24','#5eead4','#fda4af'][i % 4],
  })), [])
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {stars.map(s => (
        <div key={s.id}
          className="absolute rounded-full animate-starTwinkle"
          style={{
            left: `${s.x}%`, top: `${s.y}%`,
            width: `${s.size}px`, height: `${s.size}px`,
            background: s.color, boxShadow: `0 0 6px ${s.color}`,
            animationDelay: `${s.delay}s`,
          }} />
      ))}
    </div>
  )
}
