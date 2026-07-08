import { useState, useEffect } from 'react'
import { getCurrentBoss, daysLeftInWeek, GLOBAL_BOSS_MAX_HP } from '../utils/globalBoss'

const DAY_NAMES = ['星期天','星期一','星期二','星期三','星期四','星期五','星期六']

export default function GlobalBossModal({ currentName, onClose }) {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  const boss = getCurrentBoss()
  const daysLeft = daysLeftInWeek()

  const refresh = () => {
    setLoading(true)
    fetch('/api/boss-stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => setStats({ available: false }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  // Live update when our games deal damage
  useEffect(() => {
    const h = (e) => {
      const d = e.detail
      if (!d?.available) return
      setStats(prev => prev ? ({
        ...prev,
        hp: d.hp,
        defeated: d.defeated,
        // Optimistically bump current student's leaderboard entry
        leaderboard: (() => {
          const lb = [...(prev.leaderboard || [])]
          const idx = lb.findIndex(x => x.name === currentName)
          if (idx >= 0) {
            lb[idx] = { ...lb[idx], damage: d.yourDamage }
          } else {
            lb.push({ name: currentName, damage: d.yourDamage })
          }
          return lb.sort((a, b) => b.damage - a.damage)
        })(),
      }) : prev)
    }
    window.addEventListener('vocab_boss_hit', h)
    return () => window.removeEventListener('vocab_boss_hit', h)
  }, [currentName])

  const hp      = stats?.hp ?? GLOBAL_BOSS_MAX_HP
  const maxHp   = stats?.maxHp ?? GLOBAL_BOSS_MAX_HP
  const pct     = Math.max(0, Math.min(100, (hp / maxHp) * 100))
  const defeated = stats?.defeated
  const phase    = pct > 60 ? 1 : pct > 25 ? 2 : 3
  const leaderboard = stats?.leaderboard || []
  const myEntry = leaderboard.find(x => x.name === currentName)
  const myRank  = myEntry ? leaderboard.findIndex(x => x.name === currentName) + 1 : null
  const top10   = leaderboard.slice(0, 10)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-cream w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* ── Boss header with gradient ── */}
        <div
          className="relative px-5 py-5 text-center overflow-hidden"
          style={{ background: boss.gradient }}
        >
          <button
            onClick={refresh}
            disabled={loading}
            className="absolute top-2 left-3 text-cream/70 hover:text-cream text-lg px-2 py-1"
            title="刷新"
          >
            <span className={loading ? 'inline-block animate-spin' : ''}>⟳</span>
          </button>
          <button
            onClick={onClose}
            className="absolute top-2 right-3 text-cream/70 hover:text-cream text-3xl leading-none w-8 h-8 flex items-center justify-center"
          >×</button>

          <p className="text-cream/75 text-xs tracking-widest mb-1">🌐 全班共斗 · {stats?.week || '...'}</p>
          <h2 className="text-cream font-black text-2xl">{boss.name}</h2>
          <p className="text-cream/55 text-xs mt-0.5">{boss.sub}</p>
        </div>

        <div className="overflow-y-auto p-5 flex flex-col gap-4">

          {/* ── Boss sprite + HP bar ── */}
          <div className="text-center bg-cream-dark/40 rounded-2xl p-4">
            <div className={`text-7xl mb-2 ${defeated ? 'grayscale opacity-50' : phase === 3 ? 'animate-shake' : ''}`}>
              {defeated ? '💀' : boss.emoji}
            </div>

            {defeated ? (
              <>
                <p className="text-2xl font-black text-nanyang-teal animate-pop">🏆 已被击败！</p>
                <p className="text-brick/55 text-sm mt-1">下周一会出现新的Boss · 干得漂亮！</p>
              </>
            ) : (
              <>
                <div className="flex justify-between items-baseline mb-1.5 px-2">
                  <span className="text-brick/55 text-xs font-bold">HP</span>
                  <span className="text-brick font-black text-base tabular-nums">{hp.toLocaleString()} / {maxHp.toLocaleString()}</span>
                </div>
                <div className="bg-brick/10 rounded-full h-4 overflow-hidden border border-brick/15">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      pct > 60 ? 'bg-red-500' : pct > 25 ? 'bg-orange-500' : 'bg-yellow-500 animate-pulse2'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-brick/55 text-sm mt-2">
                  ⏰ 剩 <strong className="text-brick">{daysLeft}</strong> 天 · 今天{DAY_NAMES[new Date().getDay()]}
                </p>
              </>
            )}
          </div>

          {/* ── Your contribution ── */}
          {myEntry && (
            <div className="rounded-xl bg-gold/15 border border-gold/45 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-brick/55 font-bold">你的贡献</p>
                <p className="text-brick font-black text-lg">⚔️ {myEntry.damage.toLocaleString()} 伤害</p>
              </div>
              <div className="text-right">
                <p className="text-brick/55 text-xs">班级排名</p>
                <p className="text-brick font-black text-2xl tabular-nums">#{myRank}</p>
              </div>
            </div>
          )}

          {/* ── Leaderboard ── */}
          <div>
            <p className="text-xs uppercase tracking-widest text-brick/45 font-bold mb-2 px-1 flex items-center justify-between">
              <span>🏅 贡献榜</span>
              <span className="text-brick/35 lowercase tracking-normal">共 {leaderboard.length} 位同学参与</span>
            </p>
            {top10.length === 0 ? (
              <p className="text-brick/40 text-sm text-center py-4">还没有同学出手·你将是第一个！</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {top10.map((entry, i) => {
                  const isMe = entry.name === currentName
                  const medal = ['🥇', '🥈', '🥉'][i] || `#${i + 1}`
                  return (
                    <div
                      key={entry.name}
                      className={`rounded-lg px-3 py-2 flex items-center justify-between transition-all ${
                        isMe ? 'bg-gold/20 border border-gold' : 'bg-cream-dark/55'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base font-black w-8 shrink-0">{medal}</span>
                        <span className={`font-bold truncate ${isMe ? 'text-brick' : 'text-brick/80'}`}>
                          {entry.name}{isMe && ' (你)'}
                        </span>
                      </div>
                      <span className="text-brick font-black text-base tabular-nums shrink-0 ml-2">
                        {entry.damage.toLocaleString()}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── How to deal damage ── */}
          {!defeated && (
            <div className="rounded-xl bg-cream-dark/55 border border-brick/10 p-3">
              <p className="text-xs uppercase tracking-widest text-brick/55 font-bold mb-2">如何造成伤害</p>
              <div className="grid grid-cols-1 gap-1 text-sm text-brick/75">
                <div className="flex justify-between"><span>⚔️ 完成词语斗争</span><span className="font-bold text-brick">每答对 +5</span></div>
                <div className="flex justify-between"><span>🔗 完成词义配对</span><span className="font-bold text-brick">每对 +1</span></div>
                <div className="flex justify-between"><span>⚡ 急速对决答对</span><span className="font-bold text-brick">+3</span></div>
              </div>
            </div>
          )}

          <p className="text-brick/35 text-xs text-center">每周一 0 点 (UTC) 出现新的Boss</p>
        </div>
      </div>
    </div>
  )
}
