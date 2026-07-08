import { ACHIEVEMENTS } from '../utils/userStore'

const UNIT_NAMES  = { 1: '单元一', 2: '单元二', 3: '单元三', 4: '单元四', 5: '单元五', 6: '单元六' }
const BOSS_NAMES  = { 1: '词汇魔王', 2: '年兽', 3: '词语狮王', 4: '习惯魔君', 5: '创新领主', 6: '贡献之神' }

function BossRow({ unitNum, score }) {
  const cleared = score?.cleared
  const stars   = cleared ? 3 - (score.bestMistakes || 0) : 0
  return (
    <div className="flex items-center justify-between bg-cream-dark rounded-xl px-4 py-3">
      <div>
        <p className="text-brick font-bold text-base">{UNIT_NAMES[unitNum]}</p>
        <p className="text-brick/45 text-sm">{BOSS_NAMES[unitNum]}</p>
      </div>
      {cleared ? (
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-xl leading-none">
            {[0,1,2].map(i => (
              <span key={i} className={i < stars ? 'text-gold' : 'text-brick/15'}>⭐</span>
            ))}
          </span>
          <span className="text-sm text-brick/40">
            {score.bestMistakes === 0 ? '完美无伤' : `最少失误 ${score.bestMistakes} 次`}
          </span>
        </div>
      ) : (
        <span className="text-brick/30 text-sm">未挑战</span>
      )}
    </div>
  )
}

export default function ProfileModal({ user, onClose }) {
  const earned = new Set(user.achievements || [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-cream w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">

        {/* Header */}
        <div className="nanyang-header px-5 py-4 flex items-center justify-between shrink-0">
          <p className="relative z-10 text-cream font-black text-xl">我的学习档案</p>
          <button
            onClick={onClose}
            className="relative z-10 text-cream/70 hover:text-cream text-3xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto">

          {/* ── Stats ───────────────────────────────────── */}
          <div className="p-5 border-b border-cream-dark">
            <p className="text-2xl font-black text-brick mb-4">👤 {user.name}</p>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center justify-between bg-cream-dark rounded-xl px-4 py-3">
                <span className="text-brick font-bold text-base">🔥 当前连续登录</span>
                <span className="text-brick font-black text-2xl">{user.streak} 天</span>
              </div>
              <div className="flex items-center justify-between bg-cream-dark rounded-xl px-4 py-3">
                <span className="text-brick font-bold text-base">🏅 最长连续登录</span>
                <span className="text-brick font-black text-2xl">{user.longestStreak || user.streak} 天</span>
              </div>
              <div className="flex items-center justify-between bg-cream-dark rounded-xl px-4 py-3">
                <span className="text-brick font-bold text-base">📅 总登录天数</span>
                <span className="text-brick font-black text-2xl">{user.totalLogins || 1} 天</span>
              </div>
              <div className="flex items-center justify-between bg-cream-dark rounded-xl px-4 py-3">
                <div>
                  <span className="text-brick font-bold text-base">🧊 本月护盾</span>
                  <p className="text-brick/45 text-xs mt-0.5">缺勤一天自动保护连续登录</p>
                </div>
                <span className="text-brick font-black text-2xl">{user.streakFreezes ?? 2} 次</span>
              </div>
            </div>
          </div>

          {/* ── Boss scores ──────────────────────────────── */}
          <div className="p-5 border-b border-cream-dark">
            <p className="text-base font-bold text-brick/40 uppercase tracking-wider mb-3">⚔️ 词语斗争成绩</p>
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <BossRow key={n} unitNum={n} score={user.bossScores?.[String(n)]} />
              ))}
            </div>
          </div>

          {/* ── Match scores ─────────────────────────────── */}
          <div className="p-5 border-b border-cream-dark">
            <p className="text-base font-bold text-brick/40 uppercase tracking-wider mb-3">🔗 词义配对最高命中率</p>
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4, 5, 6].map(n => {
                const pct = user.matchHighPct?.[String(n)]
                return (
                  <div key={n} className="flex items-center justify-between bg-cream-dark rounded-xl px-4 py-3">
                    <span className="text-brick font-bold text-base">{UNIT_NAMES[n]}</span>
                    {pct != null
                      ? <span className="text-nanyang-teal font-black text-xl">{pct}%</span>
                      : <span className="text-brick/30 text-sm">未完成</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Achievements ─────────────────────────────── */}
          <div className="p-5">
            <p className="text-base font-bold text-brick/40 uppercase tracking-wider mb-3">
              🎖️ 成就徽章 — {earned.size} / {ACHIEVEMENTS.length}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ACHIEVEMENTS.map(ach => {
                const unlocked = earned.has(ach.id)
                return (
                  <div
                    key={ach.id}
                    className={`rounded-xl px-3 py-3 border-2 flex items-start gap-2 transition-all ${
                      unlocked
                        ? 'bg-gold/10 border-gold'
                        : 'bg-cream-dark border-transparent opacity-35'
                    }`}
                  >
                    <span className="text-2xl leading-none mt-0.5">{ach.emoji}</span>
                    <div>
                      <p className="text-brick font-black text-base">{ach.label}</p>
                      <p className="text-brick/50 text-sm leading-snug mt-0.5">{ach.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
