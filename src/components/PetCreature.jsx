/* ══════════════════════════════════════════════════════════
   PET CREATURE — Pokémon-style evolving creature
   6 evolution stages across Lv 1-50
   ══════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect } from 'react'
import { findPetItem } from '../utils/petShopData'

export const PET_STAGES = [
  { stage:  1, name: '灵卵',  color: '#a8edff', nextLv:  5, desc: '神秘的银青蛋，裂缝透出微光' },
  { stage:  2, name: '裂卵',  color: '#67e8f9', nextLv: 10, desc: '蛋壳剧烈龟裂，眼睛若隐若现' },
  { stage:  3, name: '幼灵',  color: '#00e5cc', nextLv: 15, desc: '刚破壳的青绿小精灵，软萌萌' },
  { stage:  4, name: '灵芽',  color: '#2dd4bf', nextLv: 20, desc: '长出小角，悄悄变强变大了' },
  { stage:  5, name: '青灵',  color: '#22c55e', nextLv: 25, desc: '翠绿小龙，翅膀鳞片闪闪发光' },
  { stage:  6, name: '金龙',  color: '#ca8a04', nextLv: 30, desc: '金玉之龙，镀金光芒令人惊叹' },
  { stage:  7, name: '炎灵',  color: '#ff6b35', nextLv: 35, desc: '橙红火焰drake，炎光环绕全身' },
  { stage:  8, name: '烈焰',  color: '#dc2626', nextLv: 40, desc: '深红烈焰，不可阻挡的赤焰之力' },
  { stage:  9, name: '神灵',  color: '#ffd60a', nextLv: 45, desc: '白金神圣之灵，羽翼展开光环笼罩' },
  { stage: 10, name: '龙神',  color: '#c084fc', nextLv: null, desc: '宇宙终极紫龙，星云缭绕万物归一' },
]

export function getStage(level) {
  if (level >= 45) return 10
  if (level >= 40) return 9
  if (level >= 35) return 8
  if (level >= 30) return 7
  if (level >= 25) return 6
  if (level >= 20) return 5
  if (level >= 15) return 4
  if (level >= 10) return 3
  if (level >= 5)  return 2
  return 1
}

export function getPetStageInfo(level) {
  const s = getStage(level)
  return PET_STAGES[s - 1]
}

/* ── CSS Keyframes (injected once) ───────────────────────── */
const PET_STYLES = `
@keyframes petFloat {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-8px); }
}
@keyframes petGlow {
  0%, 100% { opacity: 0.55; }
  50%       { opacity: 1; }
}
@keyframes petPulse {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50%       { transform: scale(1.12); opacity: 1; }
}
@keyframes petSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes petOrbit {
  from { transform: rotate(0deg) translateX(28px) rotate(0deg); }
  to   { transform: rotate(360deg) translateX(28px) rotate(-360deg); }
}
@keyframes petOrbit2 {
  from { transform: rotate(120deg) translateX(32px) rotate(-120deg); }
  to   { transform: rotate(480deg) translateX(32px) rotate(-480deg); }
}
@keyframes petOrbit3 {
  from { transform: rotate(240deg) translateX(26px) rotate(-240deg); }
  to   { transform: rotate(600deg) translateX(26px) rotate(-600deg); }
}
@keyframes wingFlap {
  0%, 100% { transform: scaleX(1) rotate(0deg); }
  50%       { transform: scaleX(1.15) rotate(-6deg); }
}
@keyframes eggCrack {
  0%, 90%, 100% { transform: rotate(0deg); }
  92%           { transform: rotate(-2deg); }
  94%           { transform: rotate(2deg); }
  96%           { transform: rotate(-1.5deg); }
}
@keyframes petJump {
  0%   { transform: translateY(0) rotate(0deg) scale(1); }
  30%  { transform: translateY(-16px) rotate(-7deg) scale(1.08); }
  60%  { transform: translateY(-5px) rotate(6deg) scale(1.04); }
  100% { transform: translateY(0) rotate(0deg) scale(1); }
}
@keyframes petSpeech {
  0%   { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.6); }
  18%  { opacity: 1; transform: translateX(-50%) translateY(0) scale(1.08); }
  28%  { transform: translateX(-50%) scale(1); }
  82%  { opacity: 1; }
  100% { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(0.9); }
}
@keyframes petHeart {
  0%   { opacity: 0; transform: translateY(0) scale(0.5); }
  25%  { opacity: 1; transform: translateY(-14px) scale(1.15); }
  100% { opacity: 0; transform: translateY(-38px) scale(0.8); }
}
`

/* ── Accessory Renderers ─────────────────────────────────── */

function AuraEffect({ auraId, cx, cy }) {
  if (!auraId || auraId === 'aura_none') return null

  const configs = {
    aura_star: { color: '#ffd60a', color2: '#fff8a0', count: 5, r: 52, opacity: 0.7 },
    aura_flame: { color: '#ff6b35', color2: '#ff0040', count: 6, r: 50, opacity: 0.75 },
    aura_ice: { color: '#00e5ff', color2: '#a8edff', count: 6, r: 50, opacity: 0.65 },
    aura_thunder: { color: '#b347ff', color2: '#00d4ff', count: 4, r: 48, opacity: 0.8 },
    aura_rainbow: { color: '#f72585', color2: '#ffd60a', count: 8, r: 55, opacity: 0.65 },
    aura_cosmos: { color: '#9b5de5', color2: '#00d4ff', count: 7, r: 58, opacity: 0.75 },
  }

  const cfg = configs[auraId]
  if (!cfg) return null

  const particles = Array.from({ length: cfg.count }, (_, i) => {
    const angle = (i / cfg.count) * Math.PI * 2
    const px = cx + Math.cos(angle) * cfg.r
    const py = cy + Math.sin(angle) * cfg.r
    const delay = (i / cfg.count) * 3
    const size = auraId === 'aura_cosmos' ? 4 : 3
    return { px, py, delay, size }
  })

  return (
    <g>
      {/* Ring */}
      <ellipse cx={cx} cy={cy} rx={cfg.r + 4} ry={cfg.r * 0.4}
               fill="none" stroke={cfg.color} strokeWidth={auraId === 'aura_cosmos' ? 2.5 : 1.5}
               opacity={cfg.opacity}
               style={{ animation: `petGlow 2s ease-in-out infinite` }} />
      {/* Particles */}
      {particles.map((p, i) => (
        <circle key={i} cx={p.px} cy={p.py} r={p.size}
                fill={i % 2 === 0 ? cfg.color : cfg.color2}
                opacity={cfg.opacity}
                style={{ animation: `petGlow 1.5s ease-in-out infinite`, animationDelay: `${p.delay}s` }} />
      ))}
    </g>
  )
}

function HatAccessory({ hatId, headCx, headTopY }) {
  if (!hatId || hatId === 'hat_none') return null

  const y = headTopY - 2
  const x = headCx

  if (hatId === 'hat_flower') {
    return (
      <g transform={`translate(${x}, ${y})`}>
        {[0, 60, 120, 180, 240, 300].map((a, i) => (
          <ellipse key={i}
            cx={Math.cos((a * Math.PI) / 180) * 7}
            cy={-8 + Math.sin((a * Math.PI) / 180) * 7}
            rx={4} ry={3}
            fill={i % 2 === 0 ? '#ff69b4' : '#ffb347'}
            opacity={0.9}
          />
        ))}
        <circle cx={0} cy={-8} r={4} fill="#ffd60a" />
      </g>
    )
  }
  if (hatId === 'hat_magic') {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <ellipse cx={0} cy={-2} rx={12} ry={3} fill="#1a0a3a" stroke="#9b5de5" strokeWidth={1} />
        <polygon points="0,-20 -8,-2 8,-2" fill="#1a0a3a" stroke="#9b5de5" strokeWidth={1} />
        <circle cx={0} cy={-20} r={2.5} fill="#ffd60a"
                style={{ animation: 'petGlow 1.5s ease-in-out infinite' }} />
        <circle cx={3} cy={-12} r={1.2} fill="#ffd60a" opacity={0.7} />
        <circle cx={-3} cy={-9} r={1} fill="#00d4ff" opacity={0.7} />
      </g>
    )
  }
  if (hatId === 'hat_star') {
    return (
      <g transform={`translate(${x}, ${y - 6})`}>
        {/* Crown base */}
        <path d="M -12,0 L -8,-10 L 0,-6 L 8,-10 L 12,0 Z"
              fill="#ffd60a" stroke="#ff9900" strokeWidth={0.8} />
        <circle cx={0} cy={-6} r={3} fill="#00d4ff"
                style={{ animation: 'petGlow 1.2s ease-in-out infinite' }} />
        <circle cx={-8} cy={-10} r={2} fill="#ff6b35" />
        <circle cx={8} cy={-10} r={2} fill="#9b5de5" />
      </g>
    )
  }
  if (hatId === 'hat_halo') {
    return (
      <g transform={`translate(${x}, ${y - 12})`}>
        <ellipse cx={0} cy={0} rx={14} ry={4}
                 fill="none" stroke="#ffd60a" strokeWidth={2.5}
                 style={{ filter: 'drop-shadow(0 0 4px #ffd60a)', animation: 'petGlow 1.8s ease-in-out infinite' }} />
        <line x1={-2} y1={0} x2={-2} y2={10} stroke="#ffd60a" strokeWidth={1} opacity={0.5} />
        <line x1={2} y1={0} x2={2} y2={10} stroke="#ffd60a" strokeWidth={1} opacity={0.5} />
      </g>
    )
  }
  if (hatId === 'hat_crown') {
    return (
      <g transform={`translate(${x}, ${y - 4})`}>
        <path d="M -14,2 L -14,-4 L -7,-12 L 0,-6 L 7,-12 L 14,-4 L 14,2 Z"
              fill="#ffd60a" stroke="#ff9900" strokeWidth={1} />
        <rect x={-14} y={2} width={28} height={4} rx={2} fill="#ffd60a" stroke="#ff9900" strokeWidth={0.5} />
        <circle cx={0} cy={-6} r={3.5} fill="#c084fc"
                style={{ animation: 'petGlow 1.2s ease-in-out infinite' }} />
        <circle cx={-7} cy={-12} r={2.5} fill="#00d4ff" />
        <circle cx={7} cy={-12} r={2.5} fill="#ff6b35" />
        <circle cx={-10} cy={0} r={1.5} fill="#ff69b4" />
        <circle cx={10} cy={0} r={1.5} fill="#ff69b4" />
      </g>
    )
  }
  return null
}

function CompanionAccessory({ companionId, cx, cy }) {
  if (!companionId || companionId === 'companion_none') return null

  if (companionId === 'companion_star') {
    return (
      <g style={{ animation: 'petOrbit 4s linear infinite', transformOrigin: `${cx}px ${cy}px` }}>
        <text x={cx + 28} y={cy + 4} fontSize={12} textAnchor="middle"
              style={{ animation: 'petGlow 2s ease-in-out infinite' }}>⭐</text>
      </g>
    )
  }
  if (companionId === 'companion_moon') {
    return (
      <g style={{ animation: 'petOrbit 5s linear infinite', transformOrigin: `${cx}px ${cy}px` }}>
        <text x={cx + 32} y={cy + 4} fontSize={13} textAnchor="middle"
              style={{ animation: 'petGlow 2.5s ease-in-out infinite' }}>🌙</text>
      </g>
    )
  }
  if (companionId === 'companion_dragon') {
    return (
      <g style={{ animation: 'petOrbit 6s linear infinite', transformOrigin: `${cx}px ${cy}px` }}>
        <text x={cx + 34} y={cy + 4} fontSize={14} textAnchor="middle">🐲</text>
      </g>
    )
  }
  if (companionId === 'companion_butterfly') {
    return (
      <g style={{ animation: 'petOrbit 4.5s linear infinite', transformOrigin: `${cx}px ${cy}px` }}>
        <text x={cx + 30} y={cy + 2} fontSize={13} textAnchor="middle"
              style={{ animation: 'petGlow 2s ease-in-out infinite' }}>🦋</text>
      </g>
    )
  }
  if (companionId === 'companion_bird') {
    return (
      <g style={{ animation: 'petOrbit2 3.8s linear infinite', transformOrigin: `${cx}px ${cy}px` }}>
        <text x={cx + 32} y={cy - 8} fontSize={13} textAnchor="middle">🐦</text>
      </g>
    )
  }
  if (companionId === 'companion_fox') {
    return (
      <g style={{ animation: 'petOrbit 7s linear infinite', transformOrigin: `${cx}px ${cy}px` }}>
        <text x={cx + 36} y={cy + 8} fontSize={13} textAnchor="middle">🦊</text>
      </g>
    )
  }
  if (companionId === 'companion_ghost') {
    return (
      <g style={{ animation: 'petOrbit2 5s linear infinite', transformOrigin: `${cx}px ${cy}px` }}>
        <text x={cx + 30} y={cy} fontSize={13} textAnchor="middle"
              style={{ animation: 'petGlow 1.5s ease-in-out infinite' }}>👻</text>
      </g>
    )
  }
  if (companionId === 'companion_phoenix') {
    return (
      <g style={{ animation: 'petOrbit3 5.5s linear infinite', transformOrigin: `${cx}px ${cy}px` }}>
        <text x={cx + 26} y={cy - 12} fontSize={14} textAnchor="middle"
              style={{ animation: 'petGlow 1.8s ease-in-out infinite' }}>🦅</text>
      </g>
    )
  }
  if (companionId === 'companion_unicorn') {
    return (
      <g style={{ animation: 'petOrbit 8s linear infinite', transformOrigin: `${cx}px ${cy}px` }}>
        <text x={cx + 36} y={cy + 6} fontSize={15} textAnchor="middle"
              style={{ animation: 'petGlow 2.2s ease-in-out infinite' }}>🦄</text>
      </g>
    )
  }
  return null
}

/* ══════════════════════════════════════════════════════════
   STAGE 1 — 灵卵 (glowing silver/cyan egg)
   ══════════════════════════════════════════════════════════ */
function Stage1({ width }) {
  return (
    <svg viewBox="0 0 120 160" width={width} style={{ overflow: 'visible', animation: 'eggCrack 4s ease-in-out infinite' }}>
      <defs>
        <radialGradient id="egg_body" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#e8f8ff" />
          <stop offset="40%" stopColor="#a8edff" />
          <stop offset="80%" stopColor="#5bc8e8" />
          <stop offset="100%" stopColor="#2a8aaa" />
        </radialGradient>
        <radialGradient id="egg_glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="egg_inner" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a8edff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.1" />
        </radialGradient>
        <filter id="egg_blur">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="egg_glow_f">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Background glow */}
      <ellipse cx={60} cy={90} rx={42} ry={48} fill="url(#egg_glow)" filter="url(#egg_blur)"
               style={{ animation: 'petGlow 2s ease-in-out infinite' }} />

      {/* Egg body */}
      <ellipse cx={60} cy={88} rx={34} ry={42} fill="url(#egg_body)" />

      {/* Specular highlight */}
      <ellipse cx={46} cy={68} rx={10} ry={14} fill="rgba(255,255,255,0.45)" />
      <ellipse cx={48} cy={66} rx={5} ry={7} fill="rgba(255,255,255,0.7)" />

      {/* Mystical cracks */}
      <path d="M 58,55 L 54,65 L 60,70 L 56,82" stroke="#00e5ff" strokeWidth={1.5}
            fill="none" opacity={0.8} filter="url(#egg_glow_f)"
            style={{ animation: 'petGlow 1.5s ease-in-out infinite' }} />
      <path d="M 65,60 L 70,72 L 65,76" stroke="#a8edff" strokeWidth={1}
            fill="none" opacity={0.6} filter="url(#egg_glow_f)" />
      <path d="M 50,80 L 46,88 L 52,92" stroke="#00e5ff" strokeWidth={1}
            fill="none" opacity={0.5} filter="url(#egg_glow_f)" />

      {/* Glowing cracks fill */}
      <path d="M 58,55 L 54,65 L 60,70 L 56,82" stroke="rgba(168,237,255,0.4)" strokeWidth={3}
            fill="none" filter="url(#egg_blur)" />

      {/* Barely-visible eyes through shell */}
      <ellipse cx={54} cy={84} rx={4} ry={4.5} fill="rgba(0,229,255,0.35)"
               style={{ animation: 'petGlow 2.5s ease-in-out infinite' }} />
      <ellipse cx={66} cy={84} rx={4} ry={4.5} fill="rgba(0,229,255,0.35)"
               style={{ animation: 'petGlow 2.5s ease-in-out infinite', animationDelay: '0.3s' }} />

      {/* Rim lighting */}
      <ellipse cx={60} cy={88} rx={34} ry={42} fill="none"
               stroke="rgba(0,229,255,0.35)" strokeWidth={2} />
      <ellipse cx={60} cy={88} rx={34} ry={42} fill="none"
               stroke="rgba(255,255,255,0.12)" strokeWidth={4} />

      {/* Bottom shadow */}
      <ellipse cx={60} cy={135} rx={28} ry={6} fill="rgba(0,200,255,0.15)" filter="url(#egg_blur)" />
    </svg>
  )
}

/* ══════════════════════════════════════════════════════════
   STAGE 2 — 幼灵 (hatched teal baby creature)
   ══════════════════════════════════════════════════════════ */
function Stage2({ width, petHat, petAura, petCompanion }) {
  const cx = 60, cy = 80
  return (
    <svg viewBox="0 0 120 160" width={width} style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id="baby_body" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#b2fff7" />
          <stop offset="45%" stopColor="#00e5cc" />
          <stop offset="100%" stopColor="#009e8a" />
        </radialGradient>
        <radialGradient id="baby_head" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#c8fff9" />
          <stop offset="50%" stopColor="#00e5cc" />
          <stop offset="100%" stopColor="#00b09b" />
        </radialGradient>
        <radialGradient id="baby_glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00e5cc" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#00e5cc" stopOpacity="0" />
        </radialGradient>
        <filter id="baby_blur"><feGaussianBlur stdDeviation="7" /></filter>
        <filter id="baby_glow_f">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Background glow */}
      <ellipse cx={cx} cy={cy} rx={45} ry={45} fill="url(#baby_glow)" filter="url(#baby_blur)"
               style={{ animation: 'petGlow 2.2s ease-in-out infinite' }} />

      {/* Aura */}
      <AuraEffect auraId={petAura} cx={cx} cy={cy} />

      {/* Tail (curly) */}
      <path d={`M ${cx - 10},${cy + 28} Q ${cx - 30},${cy + 20} ${cx - 28},${cy + 8} Q ${cx - 26},${cy - 4} ${cx - 14},${cy + 2}`}
            stroke="#00c4ae" strokeWidth={6} fill="none" strokeLinecap="round" />
      <path d={`M ${cx - 10},${cy + 28} Q ${cx - 30},${cy + 20} ${cx - 28},${cy + 8} Q ${cx - 26},${cy - 4} ${cx - 14},${cy + 2}`}
            stroke="#b2fff7" strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.5} />

      {/* Body */}
      <ellipse cx={cx} cy={cy + 18} rx={22} ry={20} fill="url(#baby_body)" />
      <ellipse cx={cx - 4} cy={cy + 12} rx={8} ry={10} fill="rgba(255,255,255,0.25)" />

      {/* Wing nubs */}
      <ellipse cx={cx - 22} cy={cy + 12} rx={8} ry={5} fill="#00c4ae"
               transform={`rotate(-20, ${cx - 22}, ${cy + 12})`}
               style={{ animation: 'wingFlap 2s ease-in-out infinite' }} />
      <ellipse cx={cx - 22} cy={cy + 12} rx={5} ry={3} fill="rgba(255,255,255,0.25)"
               transform={`rotate(-20, ${cx - 22}, ${cy + 12})`} />
      <ellipse cx={cx + 22} cy={cy + 12} rx={8} ry={5} fill="#00c4ae"
               transform={`rotate(20, ${cx + 22}, ${cx + 12})`}
               style={{ animation: 'wingFlap 2s ease-in-out infinite', animationDelay: '0.15s' }} />
      <ellipse cx={cx + 22} cy={cy + 12} rx={5} ry={3} fill="rgba(255,255,255,0.25)"
               transform={`rotate(20, ${cx + 22}, ${cx + 12})`} />

      {/* Head */}
      <circle cx={cx} cy={cy - 6} r={28} fill="url(#baby_head)" />
      <ellipse cx={cx - 7} cy={cy - 12} rx={9} ry={12} fill="rgba(255,255,255,0.25)" />

      {/* Blush cheeks */}
      <ellipse cx={cx - 17} cy={cy + 4} rx={8} ry={5} fill="rgba(255,130,170,0.45)" filter="url(#baby_blur)" />
      <ellipse cx={cx + 17} cy={cy + 4} rx={8} ry={5} fill="rgba(255,130,170,0.45)" filter="url(#baby_blur)" />

      {/* Eyes — large, cute */}
      <ellipse cx={cx - 9} cy={cy - 8} rx={7.5} ry={9} fill="#0a2a2a" />
      <ellipse cx={cx + 9} cy={cy - 8} rx={7.5} ry={9} fill="#0a2a2a" />
      {/* Eye shine */}
      <circle cx={cx - 11} cy={cy - 12} r={2.5} fill="white" />
      <circle cx={cx - 7} cy={cy - 6} r={1.2} fill="rgba(255,255,255,0.7)" />
      <circle cx={cx + 7} cy={cy - 12} r={2.5} fill="white" />
      <circle cx={cx + 11} cy={cy - 6} r={1.2} fill="rgba(255,255,255,0.7)" />
      {/* Iris */}
      <ellipse cx={cx - 9} cy={cy - 7} rx={4} ry={5} fill="#00c4ae" />
      <ellipse cx={cx + 9} cy={cy - 7} rx={4} ry={5} fill="#00c4ae" />

      {/* Smile */}
      <path d={`M ${cx - 6},${cy + 6} Q ${cx},${cy + 12} ${cx + 6},${cy + 6}`}
            stroke="#006b5e" strokeWidth={2} fill="none" strokeLinecap="round" />

      {/* Specular highlight head */}
      <ellipse cx={cx - 7} cy={cy - 18} rx={6} ry={8} fill="rgba(255,255,255,0.35)" />
      <ellipse cx={cx - 6} cy={cy - 20} rx={3} ry={4} fill="rgba(255,255,255,0.55)" />

      {/* Rim */}
      <circle cx={cx} cy={cy - 6} r={28} fill="none" stroke="rgba(0,229,204,0.3)" strokeWidth={2} />

      {/* Hat */}
      <HatAccessory hatId={petHat} headCx={cx} headTopY={cy - 34} />

      {/* Companion */}
      <CompanionAccessory companionId={petCompanion} cx={cx} cy={cy} />

      {/* Shadow */}
      <ellipse cx={cx} cy={148} rx={22} ry={5} fill="rgba(0,200,200,0.15)" filter="url(#baby_blur)" />
    </svg>
  )
}

/* ══════════════════════════════════════════════════════════
   STAGE 3 — 青灵 (jade green young dragon)
   ══════════════════════════════════════════════════════════ */
function Stage3({ width, petHat, petAura, petCompanion }) {
  const cx = 60, cy = 82
  return (
    <svg viewBox="0 0 120 160" width={width} style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id="jade_body" cx="33%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#a7f3a7" />
          <stop offset="40%" stopColor="#22c55e" />
          <stop offset="85%" stopColor="#15803d" />
          <stop offset="100%" stopColor="#0c4a20" />
        </radialGradient>
        <radialGradient id="jade_wing" cx="30%" cy="25%" r="70%">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="60%" stopColor="#16a34a" />
          <stop offset="100%" stopColor="#0c4a20" />
        </radialGradient>
        <radialGradient id="jade_glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </radialGradient>
        <filter id="jade_blur"><feGaussianBlur stdDeviation="7" /></filter>
        <filter id="jade_soft"><feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Background glow */}
      <ellipse cx={cx} cy={cy} rx={48} ry={48} fill="url(#jade_glow)" filter="url(#jade_blur)"
               style={{ animation: 'petGlow 2.5s ease-in-out infinite' }} />

      {/* Aura */}
      <AuraEffect auraId={petAura} cx={cx} cy={cy} />

      {/* Left wing (folded) */}
      <path d={`M ${cx - 10},${cy - 5} L ${cx - 42},${cy - 22} L ${cx - 38},${cy + 5} L ${cx - 20},${cy + 10} Z`}
            fill="url(#jade_wing)"
            style={{ animation: 'wingFlap 3s ease-in-out infinite' }} />
      <path d={`M ${cx - 10},${cy - 5} L ${cx - 42},${cy - 22} L ${cx - 38},${cy + 5} L ${cx - 20},${cy + 10} Z`}
            fill="none" stroke="rgba(134,239,172,0.4)" strokeWidth={1} />
      {/* Wing membranes */}
      <path d={`M ${cx - 12},${cy - 2} L ${cx - 40},${cy - 18}`} stroke="#86efac" strokeWidth={0.8} opacity={0.5} />
      <path d={`M ${cx - 14},${cy + 2} L ${cx - 38},${cy + 2}`} stroke="#86efac" strokeWidth={0.8} opacity={0.5} />

      {/* Right wing */}
      <path d={`M ${cx + 10},${cy - 5} L ${cx + 42},${cy - 22} L ${cx + 38},${cy + 5} L ${cx + 20},${cy + 10} Z`}
            fill="url(#jade_wing)"
            style={{ animation: 'wingFlap 3s ease-in-out infinite', animationDelay: '0.2s' }} />
      <path d={`M ${cx + 10},${cy - 5} L ${cx + 42},${cy - 22} L ${cx + 38},${cy + 5} L ${cx + 20},${cy + 10} Z`}
            fill="none" stroke="rgba(134,239,172,0.4)" strokeWidth={1} />
      <path d={`M ${cx + 12},${cy - 2} L ${cx + 40},${cy - 18}`} stroke="#86efac" strokeWidth={0.8} opacity={0.5} />
      <path d={`M ${cx + 14},${cy + 2} L ${cx + 38},${cy + 2}`} stroke="#86efac" strokeWidth={0.8} opacity={0.5} />

      {/* Tail */}
      <path d={`M ${cx},${cy + 30} Q ${cx + 35},${cy + 38} ${cx + 40},${cy + 25} Q ${cx + 42},${cy + 15} ${cx + 30},${cy + 12}`}
            stroke="#16a34a" strokeWidth={7} fill="none" strokeLinecap="round" />
      <path d={`M ${cx},${cy + 30} Q ${cx + 35},${cy + 38} ${cx + 40},${cy + 25} Q ${cx + 42},${cy + 15} ${cx + 30},${cy + 12}`}
            stroke="#a7f3a7" strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.4} />
      {/* Tail spike */}
      <polygon points={`${cx + 30},${cy + 12} ${cx + 38},${cy + 5} ${cx + 35},${cy + 15}`} fill="#22c55e" />

      {/* Body */}
      <ellipse cx={cx} cy={cy + 20} rx={24} ry={22} fill="url(#jade_body)" />
      {/* Scale pattern */}
      {[[cx - 8, cy + 14], [cx + 4, cy + 14], [cx - 4, cy + 22], [cx + 8, cy + 22]].map(([sx, sy], i) => (
        <ellipse key={i} cx={sx} cy={sy} rx={5} ry={3.5}
                 fill="none" stroke="rgba(134,239,172,0.35)" strokeWidth={1} />
      ))}
      <ellipse cx={cx - 6} cy={cy + 12} rx={8} ry={10} fill="rgba(255,255,255,0.2)" />

      {/* Neck */}
      <rect x={cx - 10} y={cy - 8} width={20} height={14} rx={8} fill="url(#jade_body)" />

      {/* Head */}
      <ellipse cx={cx} cy={cy - 16} rx={26} ry={22} fill="url(#jade_body)" />
      <ellipse cx={cx - 7} cy={cy - 22} rx={9} ry={12} fill="rgba(255,255,255,0.22)" />

      {/* Horns */}
      <path d={`M ${cx - 10},${cy - 36} L ${cx - 14},${cy - 50} L ${cx - 6},${cy - 38}`}
            fill="#22c55e" stroke="#86efac" strokeWidth={0.8} />
      <path d={`M ${cx + 10},${cy - 36} L ${cx + 14},${cy - 50} L ${cx + 6},${cy - 38}`}
            fill="#22c55e" stroke="#86efac" strokeWidth={0.8} />
      <circle cx={cx - 14} cy={cy - 50} r={2} fill="#a7f3a7"
              style={{ animation: 'petGlow 2s ease-in-out infinite' }} />
      <circle cx={cx + 14} cy={cy - 50} r={2} fill="#a7f3a7"
              style={{ animation: 'petGlow 2s ease-in-out infinite', animationDelay: '0.5s' }} />

      {/* Eyes */}
      <ellipse cx={cx - 9} cy={cy - 18} rx={6.5} ry={7.5} fill="#041a0e" />
      <ellipse cx={cx + 9} cy={cy - 18} rx={6.5} ry={7.5} fill="#041a0e" />
      <ellipse cx={cx - 9} cy={cy - 18} rx={4} ry={5} fill="#22c55e" />
      <ellipse cx={cx + 9} cy={cy - 18} rx={4} ry={5} fill="#22c55e" />
      <ellipse cx={cx - 9} cy={cy - 19} rx={2} ry={3} fill="#15803d" />
      <ellipse cx={cx + 9} cy={cy - 19} rx={2} ry={3} fill="#15803d" />
      <circle cx={cx - 11} cy={cy - 21} r={2} fill="white" />
      <circle cx={cx + 7} cy={cy - 21} r={2} fill="white" />

      {/* Fierce cute snout */}
      <ellipse cx={cx} cy={cy - 8} rx={8} ry={5} fill="#15803d" />
      <circle cx={cx - 3} cy={cy - 8} r={2} fill="#0c4a20" />
      <circle cx={cx + 3} cy={cy - 8} r={2} fill="#0c4a20" />
      <path d={`M ${cx - 5},${cy - 4} Q ${cx},${cy - 1} ${cx + 5},${cy - 4}`}
            stroke="#0c4a20" strokeWidth={1.5} fill="none" />

      {/* Specular head */}
      <ellipse cx={cx - 7} cy={cy - 28} rx={6} ry={7} fill="rgba(255,255,255,0.3)" />

      {/* Rim */}
      <ellipse cx={cx} cy={cy - 16} rx={26} ry={22} fill="none" stroke="rgba(134,239,172,0.25)" strokeWidth={2} />

      {/* Hat */}
      <HatAccessory hatId={petHat} headCx={cx} headTopY={cy - 38} />

      {/* Companion */}
      <CompanionAccessory companionId={petCompanion} cx={cx} cy={cy} />

      {/* Shadow */}
      <ellipse cx={cx} cy={148} rx={24} ry={5} fill="rgba(34,197,94,0.12)" filter="url(#jade_blur)" />
    </svg>
  )
}

/* ══════════════════════════════════════════════════════════
   STAGE 4 — 炎灵 (fiery orange/red drake)
   ══════════════════════════════════════════════════════════ */
function Stage4({ width, petHat, petAura, petCompanion }) {
  const cx = 60, cy = 78
  return (
    <svg viewBox="0 0 120 160" width={width} style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id="fire_body" cx="32%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#ffb347" />
          <stop offset="35%" stopColor="#ff6b35" />
          <stop offset="75%" stopColor="#d32f00" />
          <stop offset="100%" stopColor="#8b1a00" />
        </radialGradient>
        <radialGradient id="fire_wing" cx="25%" cy="20%" r="75%">
          <stop offset="0%" stopColor="#ffd180" />
          <stop offset="50%" stopColor="#ff6b35" />
          <stop offset="100%" stopColor="#8b1a00" />
        </radialGradient>
        <radialGradient id="fire_glow_bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff6b35" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#ff6b35" stopOpacity="0" />
        </radialGradient>
        <filter id="fire_blur"><feGaussianBlur stdDeviation="8" /></filter>
        <filter id="fire_soft">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Outer fire glow */}
      <ellipse cx={cx} cy={cy} rx={55} ry={55} fill="url(#fire_glow_bg)" filter="url(#fire_blur)"
               style={{ animation: 'petGlow 1.8s ease-in-out infinite' }} />

      {/* Aura */}
      <AuraEffect auraId={petAura} cx={cx} cy={cy} />

      {/* Flame aura particles */}
      {[
        { x: cx - 35, y: cy - 10, s: 1.8, d: 0 },
        { x: cx + 35, y: cy - 8,  s: 1.5, d: 0.4 },
        { x: cx - 20, y: cy - 40, s: 1.3, d: 0.8 },
        { x: cx + 22, y: cy - 42, s: 1.6, d: 0.2 },
        { x: cx,      y: cy - 52, s: 2.0, d: 0.6 },
      ].map((f, i) => (
        <path key={i}
              d={`M ${f.x},${f.y} Q ${f.x - 4 * f.s},${f.y - 10 * f.s} ${f.x},${f.y - 18 * f.s} Q ${f.x + 4 * f.s},${f.y - 10 * f.s} ${f.x},${f.y}`}
              fill="#ff6b35" opacity={0.55}
              style={{ animation: `petGlow 1.4s ease-in-out infinite`, animationDelay: `${f.d}s` }}
              filter="url(#fire_soft)" />
      ))}

      {/* Spread wings */}
      <path d={`M ${cx - 14},${cy - 10} L ${cx - 52},${cy - 38} L ${cx - 48},${cy + 8} L ${cx - 24},${cy + 15} Z`}
            fill="url(#fire_wing)"
            style={{ animation: 'wingFlap 2.5s ease-in-out infinite' }} />
      <path d={`M ${cx - 14},${cy - 10} L ${cx - 52},${cy - 38} L ${cx - 40},${cy - 18} L ${cx - 30},${cy + 5} Z`}
            fill="rgba(255,200,100,0.25)" />
      <path d={`M ${cx + 14},${cy - 10} L ${cx + 52},${cy - 38} L ${cx + 48},${cy + 8} L ${cx + 24},${cy + 15} Z`}
            fill="url(#fire_wing)"
            style={{ animation: 'wingFlap 2.5s ease-in-out infinite', animationDelay: '0.25s' }} />
      <path d={`M ${cx + 14},${cy - 10} L ${cx + 52},${cy - 38} L ${cx + 40},${cy - 18} L ${cx + 30},${cy + 5} Z`}
            fill="rgba(255,200,100,0.25)" />
      {/* Wing ridges */}
      {[-50, -44, -36].map((dx, i) => (
        <line key={i} x1={cx - 14} y1={cy - 10} x2={cx + dx} y2={cy - 38 + i * 16}
              stroke="#ffd180" strokeWidth={0.8} opacity={0.4} />
      ))}
      {[50, 44, 36].map((dx, i) => (
        <line key={i} x1={cx + 14} y1={cy - 10} x2={cx + dx} y2={cy - 38 + i * 16}
              stroke="#ffd180" strokeWidth={0.8} opacity={0.4} />
      ))}

      {/* Tail */}
      <path d={`M ${cx - 5},${cy + 32} Q ${cx - 40},${cy + 42} ${cx - 44},${cy + 25} Q ${cx - 45},${cy + 10} ${cx - 28},${cy + 8}`}
            stroke="#d32f00" strokeWidth={9} fill="none" strokeLinecap="round" />
      <path d={`M ${cx - 5},${cy + 32} Q ${cx - 40},${cy + 42} ${cx - 44},${cy + 25}`}
            stroke="#ffb347" strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.5} />
      {/* Tail flame tip */}
      <path d={`M ${cx - 28},${cy + 8} Q ${cx - 34},${cy} ${cx - 26},${cy - 4} Q ${cx - 20},${cy + 2} ${cx - 28},${cy + 8}`}
            fill="#ff6b35" filter="url(#fire_soft)" opacity={0.9} />

      {/* Muscular body */}
      <ellipse cx={cx} cy={cy + 22} rx={27} ry={25} fill="url(#fire_body)" />
      {/* Muscle definition */}
      <path d={`M ${cx - 12},${cy + 10} Q ${cx},${cy + 8} ${cx + 12},${cy + 10}`}
            stroke="rgba(255,107,53,0.4)" strokeWidth={2} fill="none" />
      <ellipse cx={cx - 8} cy={cy + 14} rx={9} ry={12} fill="rgba(255,255,255,0.18)" />
      {/* Chest plate */}
      <ellipse cx={cx} cy={cy + 22} rx={14} ry={12} fill="rgba(139,26,0,0.3)" />

      {/* Neck */}
      <rect x={cx - 12} y={cy - 8} width={24} height={16} rx={10} fill="url(#fire_body)" />

      {/* Head */}
      <ellipse cx={cx} cy={cy - 18} rx={28} ry={24} fill="url(#fire_body)" />
      <ellipse cx={cx - 8} cy={cy - 26} rx={10} ry={13} fill="rgba(255,255,255,0.2)" />

      {/* Horns */}
      <path d={`M ${cx - 12},${cy - 40} L ${cx - 18},${cy - 58} L ${cx - 5},${cy - 42}`}
            fill="#d32f00" stroke="#ffb347" strokeWidth={1} />
      <path d={`M ${cx + 12},${cy - 40} L ${cx + 18},${cy - 58} L ${cx + 5},${cy - 42}`}
            fill="#d32f00" stroke="#ffb347" strokeWidth={1} />
      {/* Flame tips on horns */}
      <path d={`M ${cx - 18},${cy - 58} Q ${cx - 22},${cy - 66} ${cx - 18},${cy - 70} Q ${cx - 14},${cy - 65} ${cx - 18},${cy - 58}`}
            fill="#ff6b35" filter="url(#fire_soft)" opacity={0.85}
            style={{ animation: 'petGlow 1.2s ease-in-out infinite' }} />
      <path d={`M ${cx + 18},${cy - 58} Q ${cx + 22},${cy - 66} ${cx + 18},${cy - 70} Q ${cx + 14},${cy - 65} ${cx + 18},${cy - 58}`}
            fill="#ff6b35" filter="url(#fire_soft)" opacity={0.85}
            style={{ animation: 'petGlow 1.2s ease-in-out infinite', animationDelay: '0.3s' }} />

      {/* Glowing red eyes */}
      <ellipse cx={cx - 9} cy={cy - 20} rx={7} ry={8} fill="#1a0000" />
      <ellipse cx={cx + 9} cy={cy - 20} rx={7} ry={8} fill="#1a0000" />
      <ellipse cx={cx - 9} cy={cy - 20} rx={5} ry={6} fill="#ff2200"
               style={{ animation: 'petGlow 1.5s ease-in-out infinite' }} />
      <ellipse cx={cx + 9} cy={cy - 20} rx={5} ry={6} fill="#ff2200"
               style={{ animation: 'petGlow 1.5s ease-in-out infinite', animationDelay: '0.2s' }} />
      <circle cx={cx - 11} cy={cy - 23} r={2} fill="rgba(255,180,100,0.8)" />
      <circle cx={cx + 7} cy={cy - 23} r={2} fill="rgba(255,180,100,0.8)" />
      {/* Eye inner glow */}
      <ellipse cx={cx - 9} cy={cy - 20} rx={7} ry={8} fill="none"
               stroke="rgba(255,100,0,0.5)" strokeWidth={1.5}
               style={{ animation: 'petGlow 1.5s ease-in-out infinite' }} />
      <ellipse cx={cx + 9} cy={cy - 20} rx={7} ry={8} fill="none"
               stroke="rgba(255,100,0,0.5)" strokeWidth={1.5}
               style={{ animation: 'petGlow 1.5s ease-in-out infinite' }} />

      {/* Snout */}
      <ellipse cx={cx} cy={cy - 8} rx={9} ry={6} fill="#8b1a00" />
      <circle cx={cx - 3.5} cy={cy - 8} r={2.2} fill="#4a0a00" />
      <circle cx={cx + 3.5} cy={cy - 8} r={2.2} fill="#4a0a00" />
      {/* Fire breath hint */}
      <path d={`M ${cx - 6},${cy - 4} Q ${cx},${cy + 2} ${cx + 6},${cy - 4}`}
            stroke="#ff6b35" strokeWidth={1.8} fill="none" opacity={0.7} />

      {/* Specular */}
      <ellipse cx={cx - 9} cy={cy - 32} rx={7} ry={9} fill="rgba(255,255,255,0.28)" />

      {/* Rim light */}
      <ellipse cx={cx} cy={cy - 18} rx={28} ry={24} fill="none"
               stroke="rgba(255,107,53,0.3)" strokeWidth={2.5} />

      {/* Hat */}
      <HatAccessory hatId={petHat} headCx={cx} headTopY={cy - 42} />

      {/* Companion */}
      <CompanionAccessory companionId={petCompanion} cx={cx} cy={cy} />

      {/* Shadow */}
      <ellipse cx={cx} cy={148} rx={26} ry={6} fill="rgba(255,107,53,0.18)" filter="url(#fire_blur)" />
    </svg>
  )
}

/* ══════════════════════════════════════════════════════════
   STAGE 5 — 神灵 (divine white/gold ethereal being)
   ══════════════════════════════════════════════════════════ */
function Stage5({ width, petHat, petAura, petCompanion }) {
  const cx = 60, cy = 78
  return (
    <svg viewBox="0 0 120 160" width={width} style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id="div_body" cx="35%" cy="30%" r="68%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#fef9c3" />
          <stop offset="75%" stopColor="#ffd60a" />
          <stop offset="100%" stopColor="#b8860b" />
        </radialGradient>
        <radialGradient id="div_wing" cx="20%" cy="18%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#fef9c3" />
          <stop offset="100%" stopColor="#ffd60a" />
        </radialGradient>
        <radialGradient id="div_glow_bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd60a" stopOpacity="0.5" />
          <stop offset="60%" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ffd60a" stopOpacity="0" />
        </radialGradient>
        <filter id="div_blur"><feGaussianBlur stdDeviation="9" /></filter>
        <filter id="div_glow_f">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Divine glow */}
      <ellipse cx={cx} cy={cy} rx={58} ry={60} fill="url(#div_glow_bg)" filter="url(#div_blur)"
               style={{ animation: 'petGlow 2.8s ease-in-out infinite' }} />
      <ellipse cx={cx} cy={cy} rx={38} ry={40} fill="rgba(255,255,255,0.15)" filter="url(#div_blur)"
               style={{ animation: 'petGlow 2s ease-in-out infinite', animationDelay: '0.5s' }} />

      {/* Aura */}
      <AuraEffect auraId={petAura} cx={cx} cy={cy} />

      {/* Floating orbs */}
      {[
        { ox: cx - 38, oy: cy - 15, r: 5, c: '#ffd60a', d: 0 },
        { ox: cx + 38, oy: cy - 10, r: 4.5, c: '#fff8a0', d: 0.7 },
        { ox: cx - 30, oy: cy + 28, r: 4, c: '#ffd60a', d: 1.4 },
        { ox: cx + 28, oy: cy + 30, r: 5, c: '#fff', d: 0.35 },
      ].map((orb, i) => (
        <g key={i}>
          <circle cx={orb.ox} cy={orb.oy} r={orb.r + 4} fill={orb.c} opacity={0.2} filter="url(#div_blur)" />
          <circle cx={orb.ox} cy={orb.oy} r={orb.r} fill={orb.c}
                  style={{ animation: `petPulse 2s ease-in-out infinite`, animationDelay: `${orb.d}s` }} />
          <circle cx={orb.ox - orb.r * 0.3} cy={orb.oy - orb.r * 0.3} r={orb.r * 0.4} fill="rgba(255,255,255,0.8)" />
        </g>
      ))}

      {/* Large feathered wings */}
      {/* Left wing */}
      <path d={`M ${cx - 14},${cy - 12} L ${cx - 55},${cy - 45} Q ${cx - 65},${cy - 28} ${cx - 55},${cy - 10} Q ${cx - 45},${cy + 8} ${cx - 24},${cy + 14} Z`}
            fill="url(#div_wing)" opacity={0.92}
            style={{ animation: 'wingFlap 3.5s ease-in-out infinite' }} />
      {/* Feathers */}
      {[-50, -44, -36, -28].map((dx, i) => (
        <path key={i}
              d={`M ${cx - 14},${cy - 12} Q ${cx + dx},${cy - 45 + i * 12} ${cx + dx - 6},${cy - 30 + i * 12}`}
              stroke="rgba(255,255,255,0.5)" strokeWidth={1.2} fill="none" />
      ))}
      {/* Right wing */}
      <path d={`M ${cx + 14},${cy - 12} L ${cx + 55},${cy - 45} Q ${cx + 65},${cy - 28} ${cx + 55},${cy - 10} Q ${cx + 45},${cy + 8} ${cx + 24},${cy + 14} Z`}
            fill="url(#div_wing)" opacity={0.92}
            style={{ animation: 'wingFlap 3.5s ease-in-out infinite', animationDelay: '0.2s' }} />
      {[50, 44, 36, 28].map((dx, i) => (
        <path key={i}
              d={`M ${cx + 14},${cy - 12} Q ${cx + dx},${cy - 45 + i * 12} ${cx + dx + 6},${cy - 30 + i * 12}`}
              stroke="rgba(255,255,255,0.5)" strokeWidth={1.2} fill="none" />
      ))}

      {/* Body */}
      <ellipse cx={cx} cy={cy + 20} rx={24} ry={22} fill="url(#div_body)" />
      <ellipse cx={cx - 7} cy={cy + 12} rx={8} ry={10} fill="rgba(255,255,255,0.45)" />
      {/* Divine pattern */}
      <path d={`M ${cx},${cy + 10} L ${cx - 6},${cy + 20} L ${cx},${cy + 18} L ${cx + 6},${cy + 20} Z`}
            fill="rgba(255,214,10,0.5)" />

      {/* Neck */}
      <rect x={cx - 10} y={cy - 6} width={20} height={14} rx={9} fill="url(#div_body)" />

      {/* Head */}
      <ellipse cx={cx} cy={cy - 18} rx={26} ry={22} fill="url(#div_body)" />
      <ellipse cx={cx - 7} cy={cy - 26} rx={8} ry={11} fill="rgba(255,255,255,0.55)" />

      {/* Halo ring */}
      <ellipse cx={cx} cy={cy - 46} rx={20} ry={5}
               fill="none" stroke="#ffd60a" strokeWidth={4}
               filter="url(#div_glow_f)" opacity={0.9}
               style={{ animation: 'petGlow 2s ease-in-out infinite' }} />
      <ellipse cx={cx} cy={cy - 46} rx={20} ry={5}
               fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} />

      {/* Eyes — glowing gold */}
      <ellipse cx={cx - 8} cy={cy - 20} rx={6.5} ry={7.5} fill="#1a1400" />
      <ellipse cx={cx + 8} cy={cy - 20} rx={6.5} ry={7.5} fill="#1a1400" />
      <ellipse cx={cx - 8} cy={cy - 20} rx={4.5} ry={5.5} fill="#ffd60a"
               style={{ animation: 'petGlow 1.8s ease-in-out infinite' }} />
      <ellipse cx={cx + 8} cy={cy - 20} rx={4.5} ry={5.5} fill="#ffd60a"
               style={{ animation: 'petGlow 1.8s ease-in-out infinite', animationDelay: '0.3s' }} />
      <circle cx={cx - 10} cy={cy - 23} r={2} fill="rgba(255,255,255,0.9)" />
      <circle cx={cx + 6} cy={cy - 23} r={2} fill="rgba(255,255,255,0.9)" />

      {/* Gentle mouth */}
      <path d={`M ${cx - 5},${cy - 8} Q ${cx},${cy - 5} ${cx + 5},${cy - 8}`}
            stroke="#b8860b" strokeWidth={1.5} fill="none" strokeLinecap="round" />

      {/* Specular */}
      <ellipse cx={cx - 7} cy={cy - 30} rx={6} ry={8} fill="rgba(255,255,255,0.6)" />
      <ellipse cx={cx - 6} cy={cy - 32} rx={3} ry={4} fill="rgba(255,255,255,0.85)" />

      {/* Rim */}
      <ellipse cx={cx} cy={cy - 18} rx={26} ry={22} fill="none"
               stroke="rgba(255,214,10,0.3)" strokeWidth={2} />

      {/* Hat */}
      <HatAccessory hatId={petHat} headCx={cx} headTopY={cy - 40} />

      {/* Companion */}
      <CompanionAccessory companionId={petCompanion} cx={cx} cy={cy} />

      {/* Shadow */}
      <ellipse cx={cx} cy={148} rx={25} ry={6} fill="rgba(255,214,10,0.2)" filter="url(#div_blur)" />
    </svg>
  )
}

/* ══════════════════════════════════════════════════════════
   STAGE 6 — 龙神 (ultimate cosmic purple/rainbow dragon)
   ══════════════════════════════════════════════════════════ */
function Stage6({ width, petHat, petAura, petCompanion }) {
  const cx = 60, cy = 76
  return (
    <svg viewBox="0 0 120 160" width={width} style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id="cos_body" cx="33%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#e9d5ff" />
          <stop offset="30%" stopColor="#c084fc" />
          <stop offset="65%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#3b0764" />
        </radialGradient>
        <radialGradient id="cos_wing" cx="20%" cy="15%" r="80%">
          <stop offset="0%" stopColor="#fae8ff" />
          <stop offset="35%" stopColor="#a855f7" />
          <stop offset="70%" stopColor="#6d28d9" />
          <stop offset="100%" stopColor="#2e1065" />
        </radialGradient>
        <radialGradient id="cos_glow_bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c084fc" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cos_rainbow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f72585" />
          <stop offset="25%" stopColor="#ffd60a" />
          <stop offset="50%" stopColor="#06d6a0" />
          <stop offset="75%" stopColor="#00d4ff" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
        <filter id="cos_blur"><feGaussianBlur stdDeviation="10" /></filter>
        <filter id="cos_glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="cos_shine">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Cosmic glow layers */}
      <ellipse cx={cx} cy={cy} rx={62} ry={65} fill="url(#cos_glow_bg)" filter="url(#cos_blur)"
               style={{ animation: 'petGlow 2s ease-in-out infinite' }} />
      <ellipse cx={cx} cy={cy} rx={45} ry={48} fill="rgba(192,132,252,0.2)" filter="url(#cos_blur)"
               style={{ animation: 'petGlow 1.5s ease-in-out infinite', animationDelay: '0.5s' }} />

      {/* Nebula/star field */}
      {[
        [cx - 42, cy - 30, 2.5, '#ffd60a', 0],
        [cx + 40, cy - 35, 2,   '#00d4ff', 0.4],
        [cx - 38, cy + 25, 2,   '#f72585', 0.8],
        [cx + 36, cy + 28, 2.5, '#06d6a0', 0.2],
        [cx - 18, cy - 50, 1.8, '#ffd60a', 1.2],
        [cx + 20, cy - 52, 1.5, '#c084fc', 0.6],
        [cx - 48, cy,      1.8, '#00d4ff', 1.0],
        [cx + 46, cy + 5,  1.8, '#ffd60a', 0.3],
        [cx,      cy - 58, 2.2, '#fff',    0.7],
      ].map(([sx, sy, sr, sc, sd], i) => (
        <g key={i}>
          <circle cx={sx} cy={sy} r={sr + 3} fill={sc} opacity={0.15} filter="url(#cos_blur)" />
          <circle cx={sx} cy={sy} r={sr} fill={sc}
                  style={{ animation: `petGlow 1.8s ease-in-out infinite`, animationDelay: `${sd}s` }} />
        </g>
      ))}

      {/* Aura */}
      <AuraEffect auraId={petAura} cx={cx} cy={cy} />

      {/* Massive wings */}
      <path d={`M ${cx - 16},${cy - 14} L ${cx - 58},${cy - 52} Q ${cx - 70},${cy - 30} ${cx - 62},${cy - 5} Q ${cx - 52},${cy + 18} ${cx - 26},${cy + 18} Z`}
            fill="url(#cos_wing)" opacity={0.93}
            style={{ animation: 'wingFlap 3.2s ease-in-out infinite' }} />
      {/* Wing glow edge */}
      <path d={`M ${cx - 16},${cy - 14} L ${cx - 58},${cy - 52} Q ${cx - 70},${cy - 30} ${cx - 62},${cy - 5} Q ${cx - 52},${cy + 18} ${cx - 26},${cy + 18} Z`}
            fill="none" stroke="url(#cos_rainbow)" strokeWidth={1.5} opacity={0.7} />
      {/* Wing ribs */}
      {[-56, -48, -40, -30].map((dx, i) => (
        <line key={i} x1={cx - 16} y1={cy - 14} x2={cx + dx} y2={cy - 52 + i * 18}
              stroke="#c084fc" strokeWidth={0.8} opacity={0.5} />
      ))}
      <path d={`M ${cx + 16},${cy - 14} L ${cx + 58},${cy - 52} Q ${cx + 70},${cy - 30} ${cx + 62},${cy - 5} Q ${cx + 52},${cy + 18} ${cx + 26},${cy + 18} Z`}
            fill="url(#cos_wing)" opacity={0.93}
            style={{ animation: 'wingFlap 3.2s ease-in-out infinite', animationDelay: '0.25s' }} />
      <path d={`M ${cx + 16},${cy - 14} L ${cx + 58},${cy - 52} Q ${cx + 70},${cy - 30} ${cx + 62},${cy - 5} Q ${cx + 52},${cy + 18} ${cx + 26},${cy + 18} Z`}
            fill="none" stroke="url(#cos_rainbow)" strokeWidth={1.5} opacity={0.7} />
      {[56, 48, 40, 30].map((dx, i) => (
        <line key={i} x1={cx + 16} y1={cy - 14} x2={cx + dx} y2={cy - 52 + i * 18}
              stroke="#c084fc" strokeWidth={0.8} opacity={0.5} />
      ))}

      {/* Tail */}
      <path d={`M ${cx - 5},${cy + 34} Q ${cx - 44},${cy + 46} ${cx - 48},${cy + 28} Q ${cx - 50},${cy + 12} ${cx - 32},${cy + 8}`}
            stroke="#7c3aed" strokeWidth={10} fill="none" strokeLinecap="round" />
      <path d={`M ${cx - 5},${cy + 34} Q ${cx - 44},${cy + 46} ${cx - 48},${cy + 28}`}
            stroke="url(#cos_rainbow)" strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.7} />
      {/* Tail spike */}
      <polygon points={`${cx - 32},${cy + 8} ${cx - 42},${cy} ${cx - 38},${cy + 12}`}
               fill="url(#cos_rainbow)" opacity={0.8} />

      {/* Body */}
      <ellipse cx={cx} cy={cy + 22} rx={26} ry={24} fill="url(#cos_body)" />
      {/* Scale highlights */}
      {[[cx - 10, cy + 14], [cx + 4, cy + 14], [cx - 4, cy + 24], [cx + 10, cy + 24]].map(([sx, sy], i) => (
        <ellipse key={i} cx={sx} cy={sy} rx={5.5} ry={4}
                 fill="none" stroke="rgba(192,132,252,0.4)" strokeWidth={1} />
      ))}
      <ellipse cx={cx - 8} cy={cy + 14} rx={9} ry={11} fill="rgba(255,255,255,0.2)" />
      {/* Cosmic pattern */}
      <path d={`M ${cx},${cy + 10} L ${cx - 7},${cy + 22} L ${cx},${cy + 20} L ${cx + 7},${cy + 22} Z`}
            fill="url(#cos_rainbow)" opacity={0.6} filter="url(#cos_shine)" />

      {/* Neck */}
      <rect x={cx - 12} y={cy - 10} width={24} height={16} rx={10} fill="url(#cos_body)" />

      {/* Head */}
      <ellipse cx={cx} cy={cy - 20} rx={28} ry={24} fill="url(#cos_body)" />
      <ellipse cx={cx - 8} cy={cy - 28} rx={10} ry={13} fill="rgba(255,255,255,0.22)" />

      {/* Large cosmic horns */}
      <path d={`M ${cx - 12},${cy - 42} L ${cx - 20},${cy - 62} L ${cx - 4},${cy - 44}`}
            fill="#7c3aed" stroke="#c084fc" strokeWidth={1.2} />
      <path d={`M ${cx + 12},${cy - 42} L ${cx + 20},${cy - 62} L ${cx + 4},${cy - 44}`}
            fill="#7c3aed" stroke="#c084fc" strokeWidth={1.2} />
      {/* Horn glow tips */}
      {[
        { x: cx - 20, y: cy - 62, c: '#f72585' },
        { x: cx + 20, y: cy - 62, c: '#00d4ff' },
      ].map((h, i) => (
        <g key={i}>
          <circle cx={h.x} cy={h.y} r={5} fill={h.c} opacity={0.3} filter="url(#cos_blur)" />
          <circle cx={h.x} cy={h.y} r={3} fill={h.c}
                  style={{ animation: 'petGlow 1.3s ease-in-out infinite', animationDelay: `${i * 0.4}s` }} />
        </g>
      ))}
      {/* Small secondary horns */}
      <path d={`M ${cx - 5},${cy - 42} L ${cx - 8},${cy - 52} L ${cx - 1},${cy - 43}`}
            fill="#a855f7" opacity={0.8} />
      <path d={`M ${cx + 5},${cy - 42} L ${cx + 8},${cy - 52} L ${cx + 1},${cy - 43}`}
            fill="#a855f7" opacity={0.8} />

      {/* All-glowing eyes */}
      <ellipse cx={cx - 9} cy={cy - 22} rx={7.5} ry={8.5} fill="#0a0020" />
      <ellipse cx={cx + 9} cy={cy - 22} rx={7.5} ry={8.5} fill="#0a0020" />
      <ellipse cx={cx - 9} cy={cy - 22} rx={5.5} ry={6.5} fill="#c084fc"
               filter="url(#cos_shine)"
               style={{ animation: 'petGlow 1.3s ease-in-out infinite' }} />
      <ellipse cx={cx + 9} cy={cy - 22} rx={5.5} ry={6.5} fill="#c084fc"
               filter="url(#cos_shine)"
               style={{ animation: 'petGlow 1.3s ease-in-out infinite', animationDelay: '0.25s' }} />
      <ellipse cx={cx - 9} cy={cy - 22} rx={2.8} ry={3.5} fill="#7c3aed" />
      <ellipse cx={cx + 9} cy={cy - 22} rx={2.8} ry={3.5} fill="#7c3aed" />
      <circle cx={cx - 11} cy={cy - 25} r={2.2} fill="rgba(255,255,255,0.9)" />
      <circle cx={cx + 7} cy={cy - 25} r={2.2} fill="rgba(255,255,255,0.9)" />
      {/* Eye aura */}
      <ellipse cx={cx - 9} cy={cy - 22} rx={8} ry={9} fill="none"
               stroke="rgba(192,132,252,0.55)" strokeWidth={2}
               style={{ animation: 'petGlow 1.3s ease-in-out infinite' }} />
      <ellipse cx={cx + 9} cy={cy - 22} rx={8} ry={9} fill="none"
               stroke="rgba(192,132,252,0.55)" strokeWidth={2}
               style={{ animation: 'petGlow 1.3s ease-in-out infinite', animationDelay: '0.25s' }} />

      {/* Cosmic snout */}
      <ellipse cx={cx} cy={cy - 10} rx={9} ry={6} fill="#3b0764" />
      <circle cx={cx - 3.5} cy={cy - 10} r={2.2} fill="#1e0036" />
      <circle cx={cx + 3.5} cy={cy - 10} r={2.2} fill="#1e0036" />
      {/* Rainbow breath */}
      <path d={`M ${cx - 6},${cy - 5} Q ${cx},${cy + 1} ${cx + 6},${cy - 5}`}
            stroke="url(#cos_rainbow)" strokeWidth={2} fill="none" opacity={0.8} />

      {/* Specular */}
      <ellipse cx={cx - 9} cy={cy - 34} rx={7} ry={9} fill="rgba(255,255,255,0.32)" />
      <ellipse cx={cx - 8} cy={cy - 36} rx={3.5} ry={4.5} fill="rgba(255,255,255,0.55)" />

      {/* Rim rainbow */}
      <ellipse cx={cx} cy={cy - 20} rx={28} ry={24} fill="none"
               stroke="url(#cos_rainbow)" strokeWidth={2} opacity={0.45} />

      {/* Orbiting objects */}
      <g style={{ animation: 'petOrbit 5s linear infinite', transformOrigin: `${cx}px ${cy}px` }}>
        <circle cx={cx + 42} cy={cy} r={4} fill="#ffd60a"
                style={{ animation: 'petGlow 1.5s ease-in-out infinite' }} />
        <circle cx={cx + 40} cy={cy - 2} r={1.5} fill="rgba(255,255,255,0.9)" />
      </g>
      <g style={{ animation: 'petOrbit2 7s linear infinite', transformOrigin: `${cx}px ${cy}px` }}>
        <circle cx={cx + 36} cy={cy} r={3.5} fill="#00d4ff"
                style={{ animation: 'petGlow 2s ease-in-out infinite' }} />
      </g>
      <g style={{ animation: 'petOrbit3 6s linear infinite', transformOrigin: `${cx}px ${cy}px` }}>
        <circle cx={cx + 30} cy={cy} r={3} fill="#f72585"
                style={{ animation: 'petGlow 1.8s ease-in-out infinite' }} />
      </g>

      {/* Hat */}
      <HatAccessory hatId={petHat} headCx={cx} headTopY={cy - 44} />

      {/* Companion */}
      <CompanionAccessory companionId={petCompanion} cx={cx} cy={cy} />

      {/* Shadow */}
      <ellipse cx={cx} cy={148} rx={28} ry={7} fill="rgba(192,132,252,0.25)" filter="url(#cos_blur)" />
    </svg>
  )
}

/* ══════════════════════════════════════════════════════════
   STAGE 2 — 裂卵 (cracking egg, Lv 5-9)
   Same egg but heavily cracked, eyes fully glowing
   ══════════════════════════════════════════════════════════ */
function Stage2b({ width }) {
  return (
    <svg viewBox="0 0 120 160" width={width} style={{ overflow: 'visible', animation: 'eggCrack 2s ease-in-out infinite' }}>
      <defs>
        <radialGradient id="crack_body" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#f0fbff" />
          <stop offset="35%" stopColor="#67e8f9" />
          <stop offset="75%" stopColor="#0e7490" />
          <stop offset="100%" stopColor="#164e63" />
        </radialGradient>
        <radialGradient id="crack_glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
        </radialGradient>
        <filter id="crack_blur"><feGaussianBlur stdDeviation="6" /></filter>
        <filter id="crack_glow_f">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Background glow — brighter than stage 1 */}
      <ellipse cx={60} cy={90} rx={50} ry={56} fill="url(#crack_glow)" filter="url(#crack_blur)"
               style={{ animation: 'petGlow 1.2s ease-in-out infinite' }} />
      {/* Egg body */}
      <ellipse cx={60} cy={88} rx={34} ry={42} fill="url(#crack_body)" />
      {/* Specular */}
      <ellipse cx={46} cy={68} rx={10} ry={14} fill="rgba(255,255,255,0.45)" />
      <ellipse cx={48} cy={66} rx={5} ry={7} fill="rgba(255,255,255,0.7)" />
      {/* Dense cracks — light bleeding through */}
      {[
        'M 56,52 L 50,65 L 58,70 L 53,85',
        'M 66,56 L 72,68 L 66,74 L 70,84',
        'M 48,78 L 42,88 L 50,94',
        'M 64,82 L 70,90 L 66,98',
        'M 58,92 L 54,102',
        'M 62,50 L 68,58 L 64,62',
      ].map((d, i) => (
        <g key={i}>
          <path d={d} stroke="rgba(103,232,249,0.3)" strokeWidth={3.5} fill="none" filter="url(#crack_blur)" />
          <path d={d} stroke="#00e5ff" strokeWidth={1.5} fill="none" opacity={0.9}
                filter="url(#crack_glow_f)"
                style={{ animation: `petGlow ${1 + i * 0.2}s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }} />
        </g>
      ))}
      {/* Eyes — now fully visible, glowing bright */}
      <ellipse cx={52} cy={84} rx={6} ry={7} fill="#00e5ff" opacity={0.9}
               style={{ animation: 'petGlow 1s ease-in-out infinite' }} />
      <ellipse cx={68} cy={84} rx={6} ry={7} fill="#00e5ff" opacity={0.9}
               style={{ animation: 'petGlow 1s ease-in-out infinite', animationDelay: '0.2s' }} />
      <circle cx={51} cy={82} r={2} fill="white" opacity={0.9} />
      <circle cx={67} cy={82} r={2} fill="white" opacity={0.9} />
      {/* Rim */}
      <ellipse cx={60} cy={88} rx={34} ry={42} fill="none" stroke="rgba(103,232,249,0.5)" strokeWidth={2} />
      {/* Shadow */}
      <ellipse cx={60} cy={135} rx={28} ry={6} fill="rgba(0,200,255,0.18)" filter="url(#crack_blur)" />
    </svg>
  )
}

/* ══════════════════════════════════════════════════════════
   STAGE 4 — 灵芽 (growing baby, Lv 15-19)
   Baby with horn nubs, slightly larger & stronger teal
   ══════════════════════════════════════════════════════════ */
function Stage4b({ width, petHat, petAura, petCompanion }) {
  const cx = 60, cy = 78
  return (
    <svg viewBox="0 0 120 160" width={width} style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id="sprout_body" cx="35%" cy="28%" r="68%">
          <stop offset="0%" stopColor="#99fff5" />
          <stop offset="40%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#0f766e" />
        </radialGradient>
        <radialGradient id="sprout_head" cx="38%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#b2fff9" />
          <stop offset="50%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#0d9488" />
        </radialGradient>
        <radialGradient id="sprout_glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
        </radialGradient>
        <filter id="sprout_blur"><feGaussianBlur stdDeviation="7" /></filter>
      </defs>
      <ellipse cx={cx} cy={cy} rx={48} ry={48} fill="url(#sprout_glow)" filter="url(#sprout_blur)"
               style={{ animation: 'petGlow 2s ease-in-out infinite' }} />
      <AuraEffect auraId={petAura} cx={cx} cy={cy} />
      {/* Tail with small spike */}
      <path d={`M ${cx-10},${cy+30} Q ${cx-32},${cy+22} ${cx-30},${cy+8} Q ${cx-28},${cy-5} ${cx-15},${cy+2}`}
            stroke="#0d9488" strokeWidth={7} fill="none" strokeLinecap="round" />
      <path d={`M ${cx-10},${cy+30} Q ${cx-32},${cy+22} ${cx-30},${cy+8} Q ${cx-28},${cy-5} ${cx-15},${cy+2}`}
            stroke="#99fff5" strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.5} />
      <polygon points={`${cx-15},${cy+2} ${cx-22},${cy-8} ${cx-10},${cy+0}`} fill="#2dd4bf" />
      {/* Body — slightly larger */}
      <ellipse cx={cx} cy={cy+20} rx={25} ry={22} fill="url(#sprout_body)" />
      <ellipse cx={cx-5} cy={cy+12} rx={9} ry={11} fill="rgba(255,255,255,0.22)" />
      {/* Wings — slightly bigger nubs */}
      <ellipse cx={cx-24} cy={cy+12} rx={10} ry={6} fill="#0d9488"
               transform={`rotate(-22, ${cx-24}, ${cy+12})`}
               style={{ animation: 'wingFlap 2s ease-in-out infinite' }} />
      <ellipse cx={cx-24} cy={cy+12} rx={6} ry={4} fill="rgba(255,255,255,0.22)"
               transform={`rotate(-22, ${cx-24}, ${cy+12})`} />
      <ellipse cx={cx+24} cy={cy+12} rx={10} ry={6} fill="#0d9488"
               transform={`rotate(22, ${cx+24}, ${cy+12})`}
               style={{ animation: 'wingFlap 2s ease-in-out infinite', animationDelay: '0.15s' }} />
      <ellipse cx={cx+24} cy={cy+12} rx={6} ry={4} fill="rgba(255,255,255,0.22)"
               transform={`rotate(22, ${cx+24}, ${cy+12})`} />
      {/* Head */}
      <circle cx={cx} cy={cy-8} r={29} fill="url(#sprout_head)" />
      <ellipse cx={cx-8} cy={cy-15} rx={9} ry={13} fill="rgba(255,255,255,0.22)" />
      {/* *** Horn nubs — the key new feature *** */}
      <path d={`M ${cx-9},${cy-35} L ${cx-11},${cy-46} L ${cx-5},${cy-36}`}
            fill="#2dd4bf" stroke="#99fff5" strokeWidth={0.8} />
      <path d={`M ${cx+9},${cy-35} L ${cx+11},${cy-46} L ${cx+5},${cy-36}`}
            fill="#2dd4bf" stroke="#99fff5" strokeWidth={0.8} />
      <circle cx={cx-11} cy={cy-46} r={2.5} fill="#99fff5"
              style={{ animation: 'petGlow 1.8s ease-in-out infinite' }} />
      <circle cx={cx+11} cy={cy-46} r={2.5} fill="#99fff5"
              style={{ animation: 'petGlow 1.8s ease-in-out infinite', animationDelay: '0.3s' }} />
      {/* Blush */}
      <ellipse cx={cx-18} cy={cy+4} rx={8} ry={5} fill="rgba(255,130,170,0.4)" filter="url(#sprout_blur)" />
      <ellipse cx={cx+18} cy={cy+4} rx={8} ry={5} fill="rgba(255,130,170,0.4)" filter="url(#sprout_blur)" />
      {/* Eyes */}
      <ellipse cx={cx-9} cy={cy-10} rx={8} ry={9.5} fill="#0a2a2a" />
      <ellipse cx={cx+9} cy={cy-10} rx={8} ry={9.5} fill="#0a2a2a" />
      <circle cx={cx-11} cy={cy-14} r={2.8} fill="white" />
      <circle cx={cx-7} cy={cy-8} r={1.3} fill="rgba(255,255,255,0.7)" />
      <circle cx={cx+7} cy={cy-14} r={2.8} fill="white" />
      <circle cx={cx+11} cy={cy-8} r={1.3} fill="rgba(255,255,255,0.7)" />
      <ellipse cx={cx-9} cy={cy-9} rx={4.5} ry={5.5} fill="#2dd4bf" />
      <ellipse cx={cx+9} cy={cy-9} rx={4.5} ry={5.5} fill="#2dd4bf" />
      <path d={`M ${cx-7},${cy+5} Q ${cx},${cy+11} ${cx+7},${cy+5}`}
            stroke="#0d9488" strokeWidth={2} fill="none" strokeLinecap="round" />
      <ellipse cx={cx-7} cy={cy-20} rx={6} ry={8} fill="rgba(255,255,255,0.32)" />
      <circle cx={cx} cy={cy-8} r={29} fill="none" stroke="rgba(45,212,191,0.3)" strokeWidth={2} />
      <HatAccessory hatId={petHat} headCx={cx} headTopY={cy-36} />
      <CompanionAccessory companionId={petCompanion} cx={cx} cy={cy} />
      <ellipse cx={cx} cy={150} rx={23} ry={5} fill="rgba(0,200,200,0.15)" filter="url(#sprout_blur)" />
    </svg>
  )
}

/* ══════════════════════════════════════════════════════════
   STAGE 6 — 金龙 (gold-jade dragon, Lv 25-29)
   Jade dragon but with gold accents and warmer palette
   ══════════════════════════════════════════════════════════ */
function Stage6b({ width, petHat, petAura, petCompanion }) {
  const cx = 60, cy = 82
  return (
    <svg viewBox="0 0 120 160" width={width} style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id="gold_body" cx="33%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="35%" stopColor="#ca8a04" />
          <stop offset="80%" stopColor="#78350f" />
          <stop offset="100%" stopColor="#451a03" />
        </radialGradient>
        <radialGradient id="gold_wing" cx="30%" cy="25%" r="70%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="55%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
        <radialGradient id="gold_glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
        <filter id="gold_blur"><feGaussianBlur stdDeviation="7" /></filter>
        <filter id="gold_soft">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <ellipse cx={cx} cy={cy} rx={50} ry={50} fill="url(#gold_glow)" filter="url(#gold_blur)"
               style={{ animation: 'petGlow 2.2s ease-in-out infinite' }} />
      <AuraEffect auraId={petAura} cx={cx} cy={cy} />
      {/* Wings */}
      <path d={`M ${cx-10},${cy-5} L ${cx-44},${cy-24} L ${cx-40},${cy+6} L ${cx-20},${cy+12} Z`}
            fill="url(#gold_wing)" style={{ animation: 'wingFlap 3s ease-in-out infinite' }} />
      <path d={`M ${cx-10},${cy-5} L ${cx-44},${cy-24} L ${cx-40},${cy+6} L ${cx-20},${cy+12} Z`}
            fill="none" stroke="rgba(253,230,138,0.45)" strokeWidth={1} />
      <path d={`M ${cx+10},${cy-5} L ${cx+44},${cy-24} L ${cx+40},${cy+6} L ${cx+20},${cy+12} Z`}
            fill="url(#gold_wing)" style={{ animation: 'wingFlap 3s ease-in-out infinite', animationDelay: '0.2s' }} />
      <path d={`M ${cx+10},${cy-5} L ${cx+44},${cy-24} L ${cx+40},${cy+6} L ${cx+20},${cy+12} Z`}
            fill="none" stroke="rgba(253,230,138,0.45)" strokeWidth={1} />
      {/* Wing membranes */}
      {[[cx-12,cy-2,cx-42,cy-20],[cx-14,cy+3,cx-40,cy+3],[cx+12,cy-2,cx+42,cy-20],[cx+14,cy+3,cx+40,cy+3]].map(([x1,y1,x2,y2],i) => (
        <path key={i} d={`M ${x1},${y1} L ${x2},${y2}`} stroke="#fde68a" strokeWidth={0.9} opacity={0.5} />
      ))}
      {/* Tail */}
      <path d={`M ${cx},${cy+30} Q ${cx+36},${cy+40} ${cx+42},${cy+26} Q ${cx+44},${cy+15} ${cx+32},${cy+12}`}
            stroke="#92400e" strokeWidth={7} fill="none" strokeLinecap="round" />
      <path d={`M ${cx},${cy+30} Q ${cx+36},${cy+40} ${cx+42},${cy+26} Q ${cx+44},${cy+15} ${cx+32},${cy+12}`}
            stroke="#fde68a" strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.4} />
      <polygon points={`${cx+32},${cy+12} ${cx+40},${cy+4} ${cx+36},${cy+14}`} fill="#ca8a04" />
      {/* Body */}
      <ellipse cx={cx} cy={cy+20} rx={24} ry={22} fill="url(#gold_body)" />
      {/* Gold scale accents */}
      {[[cx-8,cy+14],[cx+4,cy+14],[cx-4,cy+22],[cx+8,cy+22]].map(([sx,sy],i) => (
        <ellipse key={i} cx={sx} cy={sy} rx={5} ry={3.5}
                 fill="none" stroke="rgba(253,230,138,0.45)" strokeWidth={1} />
      ))}
      <ellipse cx={cx-5} cy={cy+12} rx={8} ry={10} fill="rgba(255,255,255,0.18)" />
      <rect x={cx-10} y={cy-8} width={20} height={14} rx={8} fill="url(#gold_body)" />
      {/* Head */}
      <ellipse cx={cx} cy={cy-16} rx={26} ry={22} fill="url(#gold_body)" />
      <ellipse cx={cx-7} cy={cy-22} rx={9} ry={12} fill="rgba(255,255,255,0.2)" />
      {/* Golden horns */}
      <path d={`M ${cx-10},${cy-36} L ${cx-14},${cy-52} L ${cx-6},${cy-38}`}
            fill="#ca8a04" stroke="#fde68a" strokeWidth={0.9} />
      <path d={`M ${cx+10},${cy-36} L ${cx+14},${cy-52} L ${cx+6},${cy-38}`}
            fill="#ca8a04" stroke="#fde68a" strokeWidth={0.9} />
      <circle cx={cx-14} cy={cy-52} r={3} fill="#fbbf24"
              style={{ animation: 'petGlow 1.8s ease-in-out infinite' }} />
      <circle cx={cx+14} cy={cy-52} r={3} fill="#fbbf24"
              style={{ animation: 'petGlow 1.8s ease-in-out infinite', animationDelay: '0.2s' }} />
      {/* Eyes — amber/gold glow */}
      <ellipse cx={cx-9} cy={cy-18} rx={6.5} ry={7} fill="#1a0a00" />
      <ellipse cx={cx+9} cy={cy-18} rx={6.5} ry={7} fill="#1a0a00" />
      <ellipse cx={cx-9} cy={cy-17} rx={3.5} ry={4} fill="#fbbf24"
               style={{ animation: 'petGlow 2s ease-in-out infinite' }} />
      <ellipse cx={cx+9} cy={cy-17} rx={3.5} ry={4} fill="#fbbf24"
               style={{ animation: 'petGlow 2s ease-in-out infinite', animationDelay: '0.15s' }} />
      <circle cx={cx-11} cy={cy-20} r={2} fill="white" />
      <circle cx={cx+7} cy={cy-20} r={2} fill="white" />
      <path d={`M ${cx-7},${cy-8} Q ${cx},${cy-4} ${cx+7},${cy-8}`}
            stroke="#92400e" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <ellipse cx={cx-6} cy={cy-26} rx={6} ry={8} fill="rgba(255,255,255,0.3)" />
      <ellipse cx={cx} cy={cy-16} rx={26} ry={22} fill="none" stroke="rgba(251,191,36,0.3)" strokeWidth={2} />
      <HatAccessory hatId={petHat} headCx={cx} headTopY={cy-36} />
      <CompanionAccessory companionId={petCompanion} cx={cx} cy={cy} />
      <ellipse cx={cx} cy={148} rx={24} ry={5} fill="rgba(202,138,4,0.2)" filter="url(#gold_blur)" />
    </svg>
  )
}

/* ══════════════════════════════════════════════════════════
   STAGE 8 — 烈焰 (fierce flame drake, Lv 35-39)
   Deeper crimson fire dragon, more intense flames
   ══════════════════════════════════════════════════════════ */
function Stage8b({ width, petHat, petAura, petCompanion }) {
  const cx = 60, cy = 78
  return (
    <svg viewBox="0 0 120 160" width={width} style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id="fierce_body" cx="30%" cy="25%" r="74%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="30%" stopColor="#dc2626" />
          <stop offset="70%" stopColor="#7f1d1d" />
          <stop offset="100%" stopColor="#3b0a0a" />
        </radialGradient>
        <radialGradient id="fierce_wing" cx="28%" cy="22%" r="72%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="50%" stopColor="#b91c1c" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </radialGradient>
        <radialGradient id="fierce_glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#dc2626" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
        </radialGradient>
        <filter id="fierce_blur"><feGaussianBlur stdDeviation="8" /></filter>
        <filter id="fierce_glow_f">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Intense outer glow */}
      <ellipse cx={cx} cy={cy} rx={56} ry={56} fill="url(#fierce_glow)" filter="url(#fierce_blur)"
               style={{ animation: 'petPulse 1.5s ease-in-out infinite' }} />
      <AuraEffect auraId={petAura} cx={cx} cy={cy} />
      {/* Spread wings — larger */}
      <path d={`M ${cx-12},${cy-10} L ${cx-52},${cy-35} L ${cx-48},${cy+8} L ${cx-22},${cy+18} Z`}
            fill="url(#fierce_wing)" style={{ animation: 'wingFlap 2s ease-in-out infinite' }} />
      <path d={`M ${cx-12},${cy-10} L ${cx-52},${cy-35} L ${cx-48},${cy+8} L ${cx-22},${cy+18} Z`}
            fill="none" stroke="rgba(252,165,165,0.3)" strokeWidth={1} />
      <path d={`M ${cx+12},${cy-10} L ${cx+52},${cy-35} L ${cx+48},${cy+8} L ${cx+22},${cy+18} Z`}
            fill="url(#fierce_wing)" style={{ animation: 'wingFlap 2s ease-in-out infinite', animationDelay: '0.2s' }} />
      <path d={`M ${cx+12},${cy-10} L ${cx+52},${cy-35} L ${cx+48},${cy+8} L ${cx+22},${cy+18} Z`}
            fill="none" stroke="rgba(252,165,165,0.3)" strokeWidth={1} />
      {/* Extra flame streaks from wing tips */}
      {[[-50,-33],[-48,-20],[50,-33],[48,-20]].map(([fx,fy],i) => (
        <ellipse key={i} cx={cx+fx} cy={cy+fy} rx={4} ry={6}
                 fill="#fbbf24" opacity={0.6}
                 style={{ animation: `petGlow ${1+i*0.3}s ease-in-out infinite`, animationDelay: `${i*0.2}s` }}
                 transform={`rotate(${fx > 0 ? 20 : -20}, ${cx+fx}, ${cy+fy})`} />
      ))}
      {/* Dense flame particles around body */}
      {Array.from({length: 8}, (_, i) => {
        const angle = (i / 8) * Math.PI * 2
        const r = 38 + (i % 2) * 6
        return (
          <ellipse key={i} cx={cx + Math.cos(angle)*r} cy={cy + Math.sin(angle)*r*0.6}
                   rx={3} ry={5}
                   fill={i%3===0 ? '#fbbf24' : i%3===1 ? '#f97316' : '#ef4444'}
                   opacity={0.65}
                   style={{ animation: `petGlow ${1.2+i*0.15}s ease-in-out infinite`, animationDelay: `${i*0.12}s` }} />
        )
      })}
      {/* Tail */}
      <path d={`M ${cx},${cy+34} Q ${cx+38},${cy+44} ${cx+44},${cy+28} Q ${cx+46},${cy+16} ${cx+34},${cy+12}`}
            stroke="#7f1d1d" strokeWidth={9} fill="none" strokeLinecap="round" />
      <path d={`M ${cx},${cy+34} Q ${cx+38},${cy+44} ${cx+44},${cy+28} Q ${cx+46},${cy+16} ${cx+34},${cy+12}`}
            stroke="#fca5a5" strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.4} />
      <polygon points={`${cx+34},${cy+12} ${cx+44},${cy+2} ${cx+38},${cy+14}`} fill="#dc2626" />
      {/* Body */}
      <ellipse cx={cx} cy={cy+22} rx={26} ry={24} fill="url(#fierce_body)" />
      <ellipse cx={cx-6} cy={cy+12} rx={9} ry={12} fill="rgba(255,255,255,0.14)" />
      <rect x={cx-11} y={cy-8} width={22} height={16} rx={9} fill="url(#fierce_body)" />
      {/* Head */}
      <ellipse cx={cx} cy={cy-18} rx={28} ry={24} fill="url(#fierce_body)" />
      <ellipse cx={cx-8} cy={cy-25} rx={10} ry={14} fill="rgba(255,255,255,0.15)" />
      {/* Horns — curved, aggressive */}
      <path d={`M ${cx-11},${cy-40} Q ${cx-18},${cy-52} ${cx-8},${cy-56}`}
            stroke="#dc2626" strokeWidth={5} fill="none" strokeLinecap="round" />
      <path d={`M ${cx-11},${cy-40} Q ${cx-18},${cy-52} ${cx-8},${cy-56}`}
            stroke="#fca5a5" strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.5} />
      <path d={`M ${cx+11},${cy-40} Q ${cx+18},${cy-52} ${cx+8},${cy-56}`}
            stroke="#dc2626" strokeWidth={5} fill="none" strokeLinecap="round" />
      <path d={`M ${cx+11},${cy-40} Q ${cx+18},${cy-52} ${cx+8},${cy-56}`}
            stroke="#fca5a5" strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.5} />
      <circle cx={cx-8} cy={cy-56} r={3.5} fill="#fbbf24"
              style={{ animation: 'petGlow 1s ease-in-out infinite' }} />
      <circle cx={cx+8} cy={cy-56} r={3.5} fill="#fbbf24"
              style={{ animation: 'petGlow 1s ease-in-out infinite', animationDelay: '0.25s' }} />
      {/* Eyes — deep glowing crimson */}
      <ellipse cx={cx-10} cy={cy-20} rx={7} ry={8} fill="#0f0000" />
      <ellipse cx={cx+10} cy={cy-20} rx={7} ry={8} fill="#0f0000" />
      <ellipse cx={cx-10} cy={cy-19} rx={4} ry={4.5} fill="#dc2626"
               style={{ animation: 'petGlow 0.9s ease-in-out infinite', filter: 'drop-shadow(0 0 3px #dc2626)' }} />
      <ellipse cx={cx+10} cy={cy-19} rx={4} ry={4.5} fill="#dc2626"
               style={{ animation: 'petGlow 0.9s ease-in-out infinite', animationDelay: '0.1s', filter: 'drop-shadow(0 0 3px #dc2626)' }} />
      <circle cx={cx-12} cy={cy-23} r={2.2} fill="rgba(255,200,200,0.8)" />
      <circle cx={cx+8} cy={cy-23} r={2.2} fill="rgba(255,200,200,0.8)" />
      {/* Fangs */}
      <path d={`M ${cx-5},${cy-6} L ${cx-3},${cy+1}`} stroke="#f5f5f5" strokeWidth={1.5} strokeLinecap="round" />
      <path d={`M ${cx+5},${cy-6} L ${cx+3},${cy+1}`} stroke="#f5f5f5" strokeWidth={1.5} strokeLinecap="round" />
      <ellipse cx={cx} cy={cy-18} rx={28} ry={24} fill="none" stroke="rgba(220,38,38,0.35)" strokeWidth={2} />
      <HatAccessory hatId={petHat} headCx={cx} headTopY={cy-40} />
      <CompanionAccessory companionId={petCompanion} cx={cx} cy={cy} />
      <ellipse cx={cx} cy={150} rx={30} ry={7} fill="rgba(220,38,38,0.25)" filter="url(#fierce_blur)" />
    </svg>
  )
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */
const WEAPON_CONFIGS = {
  weapon_dagger:    { emoji: '🗡️',  side: 'right' },
  weapon_staff:     { emoji: '🪄',  side: 'right' },
  weapon_bow:       { emoji: '🏹',  side: 'right' },
  weapon_shield:    { emoji: '🛡️',  side: 'left'  },
  weapon_sword:     { emoji: '⚔️',  side: 'right' },
  weapon_axe:       { emoji: '🪓',  side: 'right' },
  weapon_trident:   { emoji: '🔱',  side: 'right' },
  weapon_crystal:   { emoji: '🔮',  side: 'right' },
  weapon_lightning: { emoji: '⚡',  side: 'right' },
}

// Hats / auras that have a bespoke SVG renderer inside the evolved stages.
// Anything NOT listed here — and EVERY accessory while the pet is still an egg
// (stages 1-2, which draw no SVG accessories) — is shown as an emoji overlay
// instead, so every purchasable item is always visible on the pet.
const HAT_SVG  = new Set(['hat_flower', 'hat_magic', 'hat_star', 'hat_halo', 'hat_crown'])
const AURA_SVG = new Set(['aura_star', 'aura_flame', 'aura_ice', 'aura_thunder', 'aura_rainbow', 'aura_cosmos'])

/* What the pet "says" when petted — egg stages squeak, hatched ones talk */
const EGG_PHRASES = ['咚咚…', '里面有动静！', '✨', '快孵化了…', '咕噜~']
const PET_PHRASES = ['加油！', '你最棒！', '嘻嘻~', '答题喂我 XP！', '一起变强！', '冲鸭！', '摸摸头~']

export default function PetCreature({ level = 1, petHat = 'hat_none', petAura = 'aura_none', petCompanion = 'companion_none', petWeapon = 'weapon_none', width = 120, interactive = false }) {
  const stage = getStage(level)
  const stageProps = { width, petHat, petAura, petCompanion }
  const weaponCfg  = WEAPON_CONFIGS[petWeapon]
  const weaponSize = Math.round(width * 0.25)

  const [reacting, setReacting] = useState(false)
  const [phrase,   setPhrase]   = useState(null)
  const timers = useRef([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const react = (e) => {
    if (!interactive) return
    e.stopPropagation()
    if (reacting) return
    const pool = stage <= 2 ? EGG_PHRASES : PET_PHRASES
    setReacting(true)
    setPhrase(pool[Math.floor(Math.random() * pool.length)])
    timers.current.forEach(clearTimeout)
    timers.current = [
      setTimeout(() => setReacting(false), 750),
      setTimeout(() => setPhrase(null), 1700),
    ]
  }

  // Fill every gap the SVG leaves with an emoji overlay so nothing equipped is
  // ever invisible (eggs draw no accessories; evolved stages draw only a subset).
  const isEgg     = stage <= 2
  const hatEmoji  = petHat !== 'hat_none'             && (isEgg || !HAT_SVG.has(petHat))   ? findPetItem(petHat)?.emoji       : null
  const auraEmoji = petAura !== 'aura_none'           && (isEgg || !AURA_SVG.has(petAura))  ? findPetItem(petAura)?.emoji      : null
  const compEmoji = petCompanion !== 'companion_none' && isEgg                              ? findPetItem(petCompanion)?.emoji : null

  return (
    <div
      onClick={react}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        animation: reacting ? 'petJump 0.7s cubic-bezier(0.34,1.56,0.64,1)' : 'petFloat 3s ease-in-out infinite',
        position: 'relative',
        cursor: interactive ? 'pointer' : 'default',
      }}
    >
      <style>{PET_STYLES}</style>

      {/* Speech bubble when petted */}
      {phrase && (
        <div style={{
          position: 'absolute', top: '-14%', left: '50%',
          background: 'rgba(3,7,18,0.94)',
          border: '1.5px solid rgba(0,240,255,0.7)',
          borderRadius: 999, padding: '3px 12px',
          fontSize: `${Math.max(11, Math.round(width * 0.09))}px`, fontWeight: 900,
          color: '#00f0ff', whiteSpace: 'nowrap',
          boxShadow: '0 0 12px rgba(0,240,255,0.4)',
          animation: 'petSpeech 1.7s ease-out both',
          pointerEvents: 'none', zIndex: 5,
        }}>
          {phrase}
        </div>
      )}

      {/* Floating heart when petted */}
      {reacting && (
        <div style={{
          position: 'absolute', top: '18%', right: '2%',
          fontSize: `${Math.round(width * 0.16)}px`, lineHeight: 1,
          animation: 'petHeart 0.9s ease-out both',
          pointerEvents: 'none', zIndex: 5,
        }}>
          💖
        </div>
      )}

      {/* Aura emoji overlay (ambient corners) */}
      {auraEmoji && (
        <>
          <div style={{ position: 'absolute', top: '6%', left: '-7%', fontSize: `${Math.round(width * 0.2)}px`, lineHeight: 1, animation: 'petPulse 2s ease-in-out infinite', pointerEvents: 'none', userSelect: 'none', opacity: 0.92 }}>{auraEmoji}</div>
          <div style={{ position: 'absolute', bottom: '16%', right: '-7%', fontSize: `${Math.round(width * 0.2)}px`, lineHeight: 1, animation: 'petPulse 2s ease-in-out infinite', animationDelay: '0.7s', pointerEvents: 'none', userSelect: 'none', opacity: 0.92 }}>{auraEmoji}</div>
        </>
      )}

      {stage === 1  && <Stage1  {...stageProps} />}
      {stage === 2  && <Stage2b {...stageProps} />}
      {stage === 3  && <Stage2  {...stageProps} />}
      {stage === 4  && <Stage4b {...stageProps} />}
      {stage === 5  && <Stage3  {...stageProps} />}
      {stage === 6  && <Stage6b {...stageProps} />}
      {stage === 7  && <Stage4  {...stageProps} />}
      {stage === 8  && <Stage8b {...stageProps} />}
      {stage === 9  && <Stage5  {...stageProps} />}
      {stage === 10 && <Stage6  {...stageProps} />}

      {/* Hat emoji overlay (above head) */}
      {hatEmoji && (
        <div style={{ position: 'absolute', top: '-6%', left: '50%', transform: 'translateX(-50%)', fontSize: `${Math.round(width * 0.28)}px`, lineHeight: 1, animation: 'petFloat 3s ease-in-out infinite', pointerEvents: 'none', userSelect: 'none', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }}>
          {hatEmoji}
        </div>
      )}

      {/* Companion emoji overlay (floats at side, eggs only) */}
      {compEmoji && (
        <div style={{ position: 'absolute', top: '24%', right: '-12%', fontSize: `${Math.round(width * 0.22)}px`, lineHeight: 1, animation: 'petFloat 2.4s ease-in-out infinite', animationDelay: '0.3s', pointerEvents: 'none', userSelect: 'none', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }}>
          {compEmoji}
        </div>
      )}

      {weaponCfg && (
        <div style={{
          position: 'absolute',
          bottom: '8%',
          [weaponCfg.side === 'right' ? 'right' : 'left']: '-6%',
          fontSize: `${weaponSize}px`,
          lineHeight: 1,
          animation: 'petGlow 2.5s ease-in-out infinite',
          pointerEvents: 'none',
          userSelect: 'none',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
        }}>
          {weaponCfg.emoji}
        </div>
      )}
    </div>
  )
}
