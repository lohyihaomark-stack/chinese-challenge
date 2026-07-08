import { useState, useEffect } from 'react'
import { getCombatProgress, getCombatDamageMultiplier } from '../../utils/userStore'
import BossBattle from '../BossBattle'
import ApprenticeTier from './ApprenticeTier'
import WarriorTier from './WarriorTier'
import GrandmasterTier from './GrandmasterTier'

const TIERS = [
  {
    id: 'apprentice',
    title: '学徒试炼',
    emoji: '🥋',
    sub: '从基础开始，打稳词语根基',
    color: 'from-emerald-700/80 to-emerald-500/80',
    accent: 'emerald',
    reward: '+5 🪙',
    desc: '配对 4 个词语 · 不限时 · 有提示',
  },
  {
    id: 'warrior',
    title: '武者考验',
    emoji: '⚔️',
    sub: '速度与准度的真正较量',
    color: 'from-amber-700/85 to-amber-500/85',
    accent: 'amber',
    reward: '+12 🪙 · 1.5x 伤害加成',
    desc: '60 秒 · 含假选项 · 连击奖励',
  },
  {
    id: 'grandmaster',
    title: '宗师挑战',
    emoji: '👑',
    sub: '听音、辨意、写字三重试炼',
    color: 'from-purple-800/85 to-purple-600/85',
    accent: 'purple',
    reward: '+25 🪙 · 2x 伤害加成',
    desc: '三阶段 · 听音 + 填词 + 默字',
  },
]

export default function WordCombatHub({ vocabs, unitNum }) {
  const [view, setView] = useState('hub')  // 'hub' | 'apprentice' | 'warrior' | 'grandmaster' | 'boss'
  const [progress, setProgress] = useState(() => getCombatProgress(unitNum))

  // Refresh progress whenever we return to hub
  useEffect(() => {
    if (view === 'hub') setProgress(getCombatProgress(unitNum))
  }, [view, unitNum])

  const multiplier = getCombatDamageMultiplier(unitNum)

  const tierState = (id) => {
    if (id === 'apprentice') return { unlocked: true, cleared: progress.apprentice.cleared }
    if (id === 'warrior')    return { unlocked: progress.apprentice.cleared, cleared: progress.warrior.cleared }
    if (id === 'grandmaster')return { unlocked: progress.warrior.cleared,    cleared: progress.grandmaster.cleared }
    return { unlocked: false, cleared: false }
  }

  /* ── Route to sub-tier ── */
  if (view === 'apprentice')
    return <ApprenticeTier vocabs={vocabs} unitNum={unitNum} onBack={() => setView('hub')} />
  if (view === 'warrior')
    return <WarriorTier vocabs={vocabs} unitNum={unitNum} onBack={() => setView('hub')} />
  if (view === 'grandmaster')
    return <GrandmasterTier vocabs={vocabs} unitNum={unitNum} onBack={() => setView('hub')} />
  if (view === 'boss')
    return (
      <div className="flex-1 flex flex-col">
        <div className="px-3 py-2 bg-cream-dark/60 flex items-center justify-between shrink-0">
          <button onClick={() => setView('hub')} className="text-brick/70 hover:text-brick text-sm font-bold">← 返回斗争大厅</button>
          <span className="text-brick/60 text-sm">伤害加成 <strong className="text-brick">{multiplier}x</strong></span>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          <BossBattle vocabs={vocabs} unitNum={unitNum} />
        </div>
      </div>
    )

  /* ── Hub view ── */
  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

      {/* Intro banner */}
      <div className="bg-gradient-to-br from-brick to-brick-mid text-cream rounded-2xl p-4 shadow-lg relative overflow-hidden">
        <div className="absolute top-2 right-3 text-4xl opacity-25 select-none">⚔️</div>
        <p className="text-gold text-xs tracking-widest mb-1">✦ 词语斗争 ✦</p>
        <h2 className="text-2xl font-black mb-1">闯关三试炼，挑战魔王</h2>
        <p className="text-cream/80 text-sm leading-snug">
          通过三个难度试炼，获得伤害加成，再向魔王发起总攻！
        </p>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="bg-cream/15 backdrop-blur rounded-full px-3 py-1 border border-cream/25">
            当前伤害加成 <strong className="text-gold">{multiplier}x</strong>
          </span>
        </div>
      </div>

      {/* Tier cards */}
      <div className="flex flex-col gap-3">
        {TIERS.map((t, i) => {
          const { unlocked, cleared } = tierState(t.id)
          return (
            <button
              key={t.id}
              disabled={!unlocked}
              onClick={() => setView(t.id)}
              className={`text-left rounded-2xl p-4 border-2 shadow-md transition-all relative overflow-hidden ${
                !unlocked
                  ? 'bg-cream-dark/60 border-brick/15 opacity-60 cursor-not-allowed'
                  : cleared
                    ? 'bg-gradient-to-br ' + t.color + ' border-cream/30 text-cream hover:scale-[1.01] active:scale-100'
                    : 'bg-cream border-brick/25 text-brick hover:border-brick hover:shadow-lg active:scale-100'
              }`}
            >
              {/* Locked overlay */}
              {!unlocked && (
                <div className="absolute top-3 right-3 text-2xl">🔒</div>
              )}
              {/* Cleared badge */}
              {unlocked && cleared && (
                <div className="absolute top-3 right-3 bg-gold text-brick text-xs font-black px-2 py-0.5 rounded-full border border-brick/30">
                  ✓ 已通关
                </div>
              )}

              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">{t.emoji}</span>
                <div>
                  <p className={`text-xs tracking-widest ${cleared && unlocked ? 'text-cream/70' : 'text-brick/40'}`}>
                    第 {i + 1} 关
                  </p>
                  <h3 className="text-xl font-black leading-tight">{t.title}</h3>
                </div>
              </div>

              <p className={`text-sm leading-snug ${cleared && unlocked ? 'text-cream/85' : 'text-brick/65'}`}>
                {t.sub}
              </p>
              <p className={`text-xs mt-1 ${cleared && unlocked ? 'text-cream/60' : 'text-brick/45'}`}>
                {t.desc}
              </p>

              <div className={`mt-2 text-sm font-bold ${cleared && unlocked ? 'text-gold' : 'text-nanyang-teal'}`}>
                奖励：{t.reward}
              </div>

              {!unlocked && (
                <p className="text-xs text-brick/50 mt-2 italic">
                  通过上一关解锁
                </p>
              )}
            </button>
          )
        })}
      </div>

      {/* Boss battle gateway */}
      {progress.apprentice.cleared ? (
        <button
          onClick={() => setView('boss')}
          className="rounded-2xl p-5 border-2 shadow-xl bg-gradient-to-br from-[#4a0e00] to-[#8B2500] border-gold/40 text-cream hover:scale-[1.01] active:scale-100 transition-all relative overflow-hidden"
        >
          <div className="absolute top-2 right-3 text-5xl opacity-20 select-none">👹</div>
          <p className="text-gold text-xs tracking-widest mb-1">✦ 最终挑战 ✦</p>
          <h3 className="text-2xl font-black mb-1">魔王战</h3>
          <p className="text-cream/80 text-sm leading-snug mb-2">
            15 题决战 · 两命挑战 · 全班 Boss 贡献伤害
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="bg-cream/15 backdrop-blur rounded-full px-3 py-1 border border-cream/25 text-sm">
              你的伤害 <strong className="text-gold">{multiplier}x</strong>
            </span>
            {multiplier < 2 && (
              <span className="text-cream/60 text-xs">通过更高试炼提升伤害</span>
            )}
          </div>
        </button>
      ) : (
        <div className="rounded-2xl p-5 border-2 shadow-xl border-brick/20 text-brick/40 relative overflow-hidden opacity-70 cursor-not-allowed"
             style={{ background: 'rgba(74,14,0,0.15)' }}>
          <div className="absolute top-2 right-3 text-4xl opacity-20 select-none">🔒</div>
          <p className="text-xs tracking-widest mb-1 opacity-60">✦ 最终挑战 ✦</p>
          <h3 className="text-2xl font-black mb-1">魔王战</h3>
          <p className="text-sm leading-snug mb-2 opacity-70">先通过「学徒试炼」才能挑战魔王！</p>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-full border border-brick/20 opacity-60">
              🔒 完成第 1 关解锁
            </span>
          </div>
        </div>
      )}

      <div className="h-2" />
    </div>
  )
}
