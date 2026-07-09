import { useState, useEffect } from 'react'
import FloatingParticles from './FloatingParticles'

/* ── Boot log lines ─────────────────────────────────────── */
const BOOT_LINES = [
  { text: '系统初始化 ... 完成',       color: 'rgba(6,214,160,0.8)',   delay: 0   },
  { text: '词汇引擎加载 ... 完成',     color: 'rgba(6,214,160,0.8)',   delay: 140 },
  { text: '单元一至单元六 ... 已挂载', color: 'rgba(0,240,255,0.75)', delay: 280 },
  { text: '云端数据库 ... 已连接',     color: 'rgba(0,240,255,0.75)', delay: 420 },
  { text: 'AI 老师模块 ... 就绪',      color: 'rgba(155,93,229,0.8)', delay: 560 },
  { text: '⚠ 等待学生身份验证 ...',    color: 'rgba(253,238,48,0.9)', delay: 700 },
]

const FEATURE_CHIPS = [
  { emoji: '📚', label: '词汇卡片', color: '#00d4ff' },
  { emoji: '🖊️', label: '造句练习', color: '#ffd60a' },
  { emoji: '🔗', label: '配对游戏', color: '#9b5de5' },
  { emoji: '⚔️', label: '词语斗争', color: '#f72585' },
  { emoji: '✍️', label: '释义练习', color: '#c084fc' },
  { emoji: '🖌️', label: '写字练习', color: '#06d6a0' },
]

/* ── Ticker items ────────────────────────────────────────── */
const TICKER_ITEMS = [
  { text: '📚 词汇卡片',        color: '#00d4ff'              },
  { text: '◈',                  color: 'rgba(0,212,255,0.22)' },
  { text: '🖊️ 造句练习',        color: '#ffd60a'              },
  { text: '◈',                  color: 'rgba(0,212,255,0.22)' },
  { text: '🔗 配对游戏',        color: '#9b5de5'              },
  { text: '◈',                  color: 'rgba(0,212,255,0.22)' },
  { text: '⚔️ 词语斗争',        color: '#f72585'              },
  { text: '◈',                  color: 'rgba(0,212,255,0.22)' },
  { text: '✍️ 释义练习',        color: '#c084fc'              },
  { text: '◈',                  color: 'rgba(0,212,255,0.22)' },
  { text: '🖌️ 写字练习',        color: '#06d6a0'              },
  { text: '◈',                  color: 'rgba(0,212,255,0.22)' },
  { text: '好好学习 天天向上',  color: 'rgba(255,214,10,0.85)'  },
  { text: '◈',                  color: 'rgba(0,212,255,0.22)' },
  { text: '中一词语宝典',       color: 'rgba(0,240,255,0.75)' },
  { text: '◈',                  color: 'rgba(0,212,255,0.22)' },
  { text: '400+ 词语等你学',    color: 'rgba(6,214,160,0.85)' },
  { text: '◈',                  color: 'rgba(0,212,255,0.22)' },
  { text: '🤖 AI 老师随时答疑', color: '#ff6b35'              },
  { text: '◈',                  color: 'rgba(0,212,255,0.22)' },
  { text: '坚持就是胜利',       color: 'rgba(247,37,133,0.85)'},
  { text: '◈',                  color: 'rgba(0,212,255,0.22)' },
  { text: '努力加油 必胜！',    color: 'rgba(155,93,229,0.85)'},
  { text: '◈',                  color: 'rgba(0,212,255,0.22)' },
]

/* ── Cute student characters ────────────────────────────── */
const LEFT_STUDENTS = [
  { body: '👧🏻', accessory: '📚', speech: '好好学习！', color: '#ff6b9d', anim: 'studentBounce', dur: '2.1s', delay: '0s',   speechDelay: '0s'   },
  { body: '👦🏻', accessory: '🌟', speech: '一起学！',  color: '#ffd60a', anim: 'studentFloat',  dur: '2s',   delay: '0.2s', speechDelay: '0.4s' },
  { body: '🧒🏽', accessory: '✏️', speech: '冲鸭！',   color: '#00d4ff', anim: 'studentWave',   dur: '2.4s', delay: '0.4s', speechDelay: '0.8s' },
  { body: '🧑🏻', accessory: '🎯', speech: '必胜！',   color: '#06d6a0', anim: 'studentBounce', dur: '2.6s', delay: '0.6s', speechDelay: '1.2s' },
]

const RIGHT_STUDENTS = [
  { body: '👩🏽', accessory: '💡', speech: '加加油！',  color: '#9b5de5', anim: 'studentFloat',  dur: '2.3s', delay: '0.1s', speechDelay: '0.2s' },
  { body: '🧑🏼', accessory: '🏆', speech: '我最棒！',  color: '#ff6b35', anim: 'studentWave',   dur: '2.5s', delay: '0.3s', speechDelay: '0.6s' },
  { body: '👦🏽', accessory: '🎵', speech: '学完唱歌！',color: '#f72585', anim: 'studentBounce', dur: '2.2s', delay: '0.5s', speechDelay: '1.0s' },
  { body: '👧🏼', accessory: '🌈', speech: '天天进步！',color: '#4cc9f0', anim: 'studentFloat',  dur: '2.7s', delay: '0.7s', speechDelay: '1.4s' },
]

function StudentChar({ body, accessory, speech, color, anim, dur, delay, speechDelay }) {
  const [popped, setPopped] = useState(false)

  const handleEnter = () => {
    if (popped) return
    setPopped(true)
    setTimeout(() => setPopped(false), 700)
  }

  return (
    <div
      className="flex flex-col items-center select-none"
      style={{
        gap: 4,
        animation: `studentPop 0.6s cubic-bezier(0.34,1.56,0.64,1) ${delay} both`,
        cursor: 'default',
      }}
      onMouseEnter={handleEnter}
    >
      {/* Floating accessory */}
      <div style={{
        fontSize: '1.5rem',
        lineHeight: 1,
        animation: `accessoryOrbit 2.8s ease-in-out infinite`,
        animationDelay: delay,
        filter: `drop-shadow(0 0 6px ${color}90)`,
      }}>
        {accessory}
      </div>

      {/* Speech bubble */}
      <div style={{
        background: 'rgba(3,7,18,0.92)',
        border: `1.5px solid ${color}`,
        borderRadius: 999,
        padding: '3px 10px',
        fontSize: '0.65rem',
        fontWeight: 800,
        color,
        boxShadow: `0 0 10px ${color}50, inset 0 0 6px ${color}10`,
        whiteSpace: 'nowrap',
        letterSpacing: '0.03em',
        animation: popped ? 'speechPop 0.5s ease-out both' : `speechPulse 3s ease-in-out infinite`,
        animationDelay: popped ? '0s' : speechDelay,
        position: 'relative',
      }}>
        {speech}
        <span style={{
          position: 'absolute',
          bottom: -6, left: '50%',
          transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: `6px solid ${color}`,
        }} />
      </div>

      {/* Main character emoji */}
      <div style={{
        fontSize: '3.4rem',
        lineHeight: 1,
        animation: popped
          ? 'studentHover 0.7s cubic-bezier(0.34,1.56,0.64,1) both'
          : `${anim} ${dur} ease-in-out infinite`,
        animationDelay: popped ? '0s' : delay,
        filter: `drop-shadow(0 4px 12px ${color}70)`,
      }}>
        {body}
      </div>
    </div>
  )
}

export default function LoginScreen({ onLogin }) {
  const [name,      setName]      = useState('')
  const [error,     setError]     = useState('')
  const [bootLines, setBootLines] = useState([])

  useEffect(() => {
    const timers = BOOT_LINES.map((line, i) =>
      setTimeout(() => setBootLines(BOOT_LINES.slice(0, i + 1)), line.delay + 180)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed)            { setError('请输入你的名字'); return }
    if (trimmed.length > 20) { setError('名字太长了，最多 20 个字'); return }
    onLogin(trimmed)
  }

  return (
    <div className="cyber-bg min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* Keyframes */}
      <style>{`
        @keyframes studentBounce {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50%       { transform: translateY(-14px) rotate(3deg); }
        }
        @keyframes studentWave {
          0%, 100% { transform: rotate(-10deg) translateY(0); }
          30%       { transform: rotate(10deg)  translateY(-8px); }
          60%       { transform: rotate(-6deg)  translateY(-12px); }
        }
        @keyframes studentFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50%       { transform: translateY(-12px) scale(1.08); }
        }
        @keyframes studentPop {
          0%   { opacity: 0; transform: translateY(32px) scale(0.3) rotate(-6deg); }
          65%  { transform: translateY(-10px) scale(1.18) rotate(2deg); }
          85%  { transform: translateY(4px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
        }
        @keyframes studentHover {
          0%   { transform: scale(1) rotate(0deg) translateY(0); }
          25%  { transform: scale(1.5) rotate(-18deg) translateY(-16px); }
          55%  { transform: scale(1.5) rotate(18deg)  translateY(-20px); }
          80%  { transform: scale(1.1) rotate(0deg)   translateY(-5px); }
          100% { transform: scale(1) rotate(0deg) translateY(0); }
        }
        @keyframes speechPulse {
          0%, 100% { opacity: 0.65; transform: translateY(0) scale(0.97); }
          50%       { opacity: 1;   transform: translateY(-3px) scale(1.04); }
        }
        @keyframes speechPop {
          0%   { transform: scale(0.7); opacity: 0.4; }
          55%  { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes accessoryOrbit {
          0%, 100% { transform: translateY(0) rotate(-10deg) scale(1); }
          50%       { transform: translateY(-8px) rotate(10deg) scale(1.2); }
        }
        @keyframes ambientPulse {
          0%, 100% { opacity: 0.65; transform: translate(-50%, -50%) scale(1); }
          50%       { opacity: 1;   transform: translate(-50%, -50%) scale(1.14); }
        }
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (max-width: 680px) {
          .student-side { display: none !important; }
        }
        /* Short screens (e.g. 1366x768 laptops): hide decorative console and
           tighten spacing so the login form fits without scrolling */
        @media (max-height: 800px) {
          .boot-console { display: none !important; }
          .login-stack { gap: 8px !important; padding-bottom: 16px !important; }
          .login-title-panel { padding: 12px 20px 10px !important; }
          .login-title-panel h1 { font-size: clamp(1.7rem, 8.5vw, 2.2rem) !important; }
          .login-panel { padding: 14px 20px 14px !important; }
        }
      `}</style>

      {/* ── Scanline CRT overlay ── */}
      <div style={{
        position: 'fixed', inset: 0,
        zIndex: 20,
        pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.035) 2px, rgba(0,0,0,0.035) 4px)',
      }} />

      {/* ── Ambient glow behind center ── */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 520, height: 680,
        background: 'radial-gradient(ellipse at center, rgba(0,212,255,0.09) 0%, rgba(155,93,229,0.07) 50%, transparent 75%)',
        animation: 'ambientPulse 5s ease-in-out infinite',
        pointerEvents: 'none',
        zIndex: 3,
      }} />

      <FloatingParticles />

      {/* Corner L-brackets */}
      <span className="fixed pointer-events-none" style={{ zIndex: 5, top: 12, left: 12, width: 22, height: 22, borderTop: '2px solid rgba(0,240,255,0.7)', borderLeft: '2px solid rgba(0,240,255,0.7)' }} />
      <span className="fixed pointer-events-none" style={{ zIndex: 5, top: 12, right: 12, width: 22, height: 22, borderTop: '2px solid rgba(253,238,48,0.7)', borderRight: '2px solid rgba(253,238,48,0.7)' }} />
      <span className="fixed pointer-events-none" style={{ zIndex: 5, bottom: 12, left: 12, width: 22, height: 22, borderBottom: '2px solid rgba(255,0,127,0.7)', borderLeft: '2px solid rgba(255,0,127,0.7)' }} />
      <span className="fixed pointer-events-none" style={{ zIndex: 5, bottom: 12, right: 12, width: 22, height: 22, borderBottom: '2px solid rgba(155,93,229,0.7)', borderRight: '2px solid rgba(155,93,229,0.7)' }} />

      {/* ── Left student column ── */}
      <div className="student-side" style={{
        position: 'fixed', left: 16, top: 0,
        height: '100vh',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-around', alignItems: 'center',
        zIndex: 6,
        paddingTop: 48, paddingBottom: 56,
      }}>
        {LEFT_STUDENTS.map((s, i) => <StudentChar key={i} {...s} />)}
      </div>

      {/* ── Right student column ── */}
      <div className="student-side" style={{
        position: 'fixed', right: 16, top: 0,
        height: '100vh',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-around', alignItems: 'center',
        zIndex: 6,
        paddingTop: 48, paddingBottom: 56,
      }}>
        {RIGHT_STUDENTS.map((s, i) => <StudentChar key={i} {...s} />)}
      </div>

      {/* ── Ticker tape ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 8,
        background: 'rgba(3,7,18,0.88)',
        borderTop: '1px solid rgba(0,212,255,0.16)',
        padding: '5px 0',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '1.6rem',
          whiteSpace: 'nowrap',
          animation: 'tickerScroll 38s linear infinite',
        }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} style={{
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: item.color,
              textShadow: `0 0 8px ${item.color}55`,
            }}>
              {item.text}
            </span>
          ))}
        </div>
      </div>

      {/* ── Center content ── */}
      <div className="login-stack w-full max-w-sm flex flex-col gap-3 relative" style={{ zIndex: 10, paddingBottom: 28 }}>

        {/* ── Title panel ── */}
        <div className="login-title-panel relative overflow-hidden" style={{
          background: 'rgba(3,7,18,0.97)',
          border: '1px solid rgba(0,240,255,0.35)',
          clipPath: 'polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px))',
          padding: '20px 24px 16px',
        }}>
          <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{
            height: 3,
            backgroundImage: 'repeating-linear-gradient(90deg, rgba(253,238,48,0.75) 0px, rgba(253,238,48,0.75) 8px, rgba(3,7,18,0.85) 8px, rgba(3,7,18,0.85) 16px)',
            backgroundSize: '16px 3px',
            animation: 'warningStripe 0.6s linear infinite',
          }} />
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,240,255,0.8), rgba(253,238,48,0.5), transparent)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(155,93,229,0.5), rgba(0,240,255,0.4), transparent)' }} />
          <span className="absolute" style={{ top: 6, left: 6, width: 12, height: 12, borderTop: '1.5px solid rgba(0,240,255,0.9)', borderLeft: '1.5px solid rgba(0,240,255,0.9)' }} />
          <span className="absolute" style={{ bottom: 6, right: 6, width: 12, height: 12, borderBottom: '1.5px solid rgba(155,93,229,0.9)', borderRight: '1.5px solid rgba(155,93,229,0.9)' }} />

          <div className="flex items-center justify-between mb-3 select-none">
            <div className="flex items-center gap-1.5">
              <span className="status-dot status-dot-online" />
              <span style={{ fontFamily: '"Share Tech Mono",monospace', fontSize: '0.62rem', color: 'rgba(6,214,160,0.8)', letterSpacing: '0.15em' }}>系统在线</span>
            </div>
            <div className="barcode-strip" style={{ width: 32, height: 14, opacity: 0.4 }} />
          </div>

          <p className="glow-subtitle text-sm tracking-[0.3em] mb-2 uppercase text-center">
            华文词汇学习系统
          </p>
          <h1
            className="glow-title glitch-title font-black text-center"
            data-text="中一词语宝典"
            style={{ fontSize: 'clamp(1.7rem, 8.5vw, 2.6rem)', letterSpacing: '0.14em' }}
          >
            中一词语宝典
          </h1>
          <p className="text-center mt-2 select-none" style={{
            fontFamily: '"Share Tech Mono",monospace',
            fontSize: '0.65rem',
            color: 'rgba(0,240,255,0.45)',
            letterSpacing: '0.1em',
          }}>
            6 单元  ·  400+ 词语  ·  多人对战
          </p>
        </div>

        {/* ── Boot console ── */}
        <div className="boot-console relative overflow-hidden" style={{
          background: 'rgba(0,8,3,0.95)',
          border: '1px solid rgba(6,214,160,0.25)',
          clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
          padding: '10px 14px 8px',
          minHeight: 88,
        }}>
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(6,214,160,0.5), transparent)' }} />
          <div className="flex items-center gap-1.5 mb-1.5 select-none">
            <span className="status-dot status-dot-online" style={{ width: 5, height: 5 }} />
            <span style={{ fontFamily: '"Share Tech Mono",monospace', fontSize: '0.55rem', color: 'rgba(6,214,160,0.6)', letterSpacing: '0.18em' }}>系统启动日志</span>
          </div>
          {bootLines.map((line, i) => (
            <div key={i} style={{
              fontFamily: '"Share Tech Mono",monospace',
              fontSize: '0.65rem',
              color: line.color,
              letterSpacing: '0.08em',
              lineHeight: 1.75,
              animation: 'cyberFadeIn 0.18s ease-out',
            }}>
              <span style={{ color: 'rgba(0,240,255,0.3)', marginRight: 6 }}>&gt;</span>{line.text}
            </div>
          ))}
          {bootLines.length < BOOT_LINES.length && (
            <span style={{ fontFamily: '"Share Tech Mono",monospace', fontSize: '0.65rem', color: 'rgba(0,240,255,0.5)' }}>_</span>
          )}
        </div>

        {/* ── Feature chips grid ── */}
        <div className="grid grid-cols-3 gap-1.5">
          {FEATURE_CHIPS.map((f, i) => (
            <div key={i} className="relative overflow-hidden flex flex-col items-center py-3 px-1 select-none" style={{
              background: 'rgba(3,7,18,0.92)',
              border: `1px solid ${f.color}30`,
              clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
            }}>
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${f.color}70, transparent)` }} />
              <div className="text-2xl leading-none">{f.emoji}</div>
              <div className="font-black mt-1.5" style={{
                color: f.color,
                textShadow: `0 0 8px ${f.color}88`,
                fontFamily: '"Share Tech Mono",monospace',
                fontSize: '0.68rem',
                letterSpacing: '0.04em',
              }}>
                {f.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Login panel ── */}
        <div className="login-panel relative overflow-hidden" style={{
          background: 'rgba(3,7,18,0.96)',
          border: '1px solid rgba(0,240,255,0.3)',
          clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))',
          padding: '20px 20px 18px',
        }}>
          <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{
            height: 3,
            backgroundImage: 'repeating-linear-gradient(90deg, rgba(253,238,48,0.65) 0px, rgba(253,238,48,0.65) 8px, rgba(3,7,18,0.85) 8px, rgba(3,7,18,0.85) 16px)',
            backgroundSize: '16px 3px',
            animation: 'warningStripe 0.6s linear infinite',
          }} />
          <span className="absolute" style={{ top: 8, left: 8, width: 10, height: 10, borderTop: '1.5px solid rgba(0,240,255,0.85)', borderLeft: '1.5px solid rgba(0,240,255,0.85)' }} />
          <span className="absolute" style={{ bottom: 8, right: 8, width: 10, height: 10, borderBottom: '1.5px solid rgba(255,0,127,0.85)', borderRight: '1.5px solid rgba(255,0,127,0.85)' }} />

          <div className="flex items-center gap-2 mb-4">
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,240,255,0.3))' }} />
            <span style={{
              fontFamily: '"Orbitron",sans-serif',
              fontSize: '1rem', fontWeight: 900,
              color: '#00f0ff',
              textShadow: '0 0 14px rgba(0,240,255,0.7)',
              letterSpacing: '0.2em',
            }}>学生登录</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(0,240,255,0.3), transparent)' }} />
          </div>

          <p className="text-center mb-4 leading-relaxed select-none" style={{
            fontSize: '0.85rem',
            color: 'rgba(140,200,240,0.65)',
            letterSpacing: '0.04em',
            lineHeight: 1.7,
          }}>
            输入你的名字就可以开始学习。<br />
            每次用<strong style={{ color: 'rgba(0,240,255,0.9)' }}>相同名字</strong>登录，记录不会丢失。
          </p>

          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="请输入你的名字"
            className="cyber-input"
            style={{ fontSize: '1rem' }}
            maxLength={20}
            autoFocus
          />

          {error && (
            <p className="text-center mt-2 animate-shake select-none" style={{
              fontSize: '0.85rem',
              color: '#ff007f',
              textShadow: '0 0 8px rgba(255,0,127,0.6)',
              letterSpacing: '0.04em',
            }}>
              ⚠ {error}
            </p>
          )}

          <button onClick={submit} className="neon-cta mt-4">
            开始学习 🚀
          </button>

          <p className="text-center mt-3 select-none" style={{
            fontSize: '0.72rem',
            color: 'rgba(0,240,255,0.28)',
            letterSpacing: '0.08em',
            fontFamily: '"Share Tech Mono",monospace',
          }}>
            学习记录保存在本设备上
          </p>
        </div>

      </div>
    </div>
  )
}
