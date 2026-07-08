import { useState, useEffect } from 'react'
import { getDailyMissions, isWordOfDayClaimed } from '../utils/userStore'
import { ALL_3_BONUS } from '../utils/missions'
import { pickWordOfTheDay, WORD_OF_DAY_REWARD } from '../utils/wordOfDay'

function todayStr() { return new Date().toISOString().slice(0, 10) }

/* ── Single mission row ──────────────────────────────── */
function MissionRow({ m }) {
  const pct = Math.min(100, Math.round((m.progress / m.target) * 100))
  return (
    <div className={`rounded-xl border-2 p-3 transition-all ${
      m.done
        ? 'border-nanyang-teal bg-nanyang-teal/10'
        : 'border-brick/15 bg-cream-dark/50'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-2xl ${
          m.done ? 'bg-nanyang-teal text-cream' : 'bg-cream border border-brick/15'
        }`}>
          {m.done ? '✓' : m.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-base ${m.done ? 'text-nanyang-teal' : 'text-brick'}`}>
            {m.text}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-2 bg-cream rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  m.done ? 'bg-nanyang-teal' : 'bg-gold'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`text-xs font-bold tabular-nums shrink-0 ${
              m.done ? 'text-nanyang-teal' : 'text-brick/60'
            }`}>
              {m.progress}/{m.target}
            </span>
          </div>
        </div>
        <div className={`shrink-0 text-right ${m.done ? 'opacity-60' : ''}`}>
          <div className="text-brick font-black text-base">+{m.reward}</div>
          <div className="text-xs text-brick/45">🪙</div>
        </div>
      </div>
    </div>
  )
}

/* ── Modal ───────────────────────────────────────────── */
export default function MissionsModal({ units, onOpenWotD, onClose }) {
  const [state, setState] = useState(() => getDailyMissions())
  const [wotdClaimed, setWotdClaimed] = useState(() => isWordOfDayClaimed())
  const wotd = units ? pickWordOfTheDay(units, todayStr()) : null

  // Re-read whenever missions change (e.g. tracking from games)
  useEffect(() => {
    const h = () => setState(getDailyMissions())
    const wh = () => setWotdClaimed(isWordOfDayClaimed())
    window.addEventListener('vocab_missions_changed', h)
    window.addEventListener('vocab_mission_complete', h)
    window.addEventListener('vocab_wotd_claimed', wh)
    return () => {
      window.removeEventListener('vocab_missions_changed', h)
      window.removeEventListener('vocab_mission_complete', h)
      window.removeEventListener('vocab_wotd_claimed', wh)
    }
  }, [])

  if (!state) return null

  const allDone = state.missions.every(m => m.done)
  const doneCount = state.missions.filter(m => m.done).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-cream w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">

        {/* Header */}
        <div className="nanyang-header px-5 py-4 flex items-center justify-between shrink-0">
          <div className="relative z-10">
            <p className="text-cream font-black text-xl leading-tight">📜 今日任务</p>
            <p className="text-cream/55 text-xs mt-0.5">{doneCount}/3 完成 · 每日 0 点重置</p>
          </div>
          <button
            onClick={onClose}
            className="relative z-10 text-cream/70 hover:text-cream text-3xl leading-none w-8 h-8 flex items-center justify-center"
          >×</button>
        </div>

        <div className="overflow-y-auto p-5 flex flex-col gap-3">

          {/* ── Word of the Day card ── */}
          {wotd && onOpenWotD && (
            <button
              onClick={onOpenWotD}
              className={`text-left rounded-xl border-2 p-3 transition-all active:scale-[0.98] ${
                wotdClaimed
                  ? 'border-gold/40 bg-gold/10'
                  : 'border-gold bg-gradient-to-br from-gold/20 to-gold/5 animate-glow'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br from-gold to-[#8B6914] text-cream shadow-md">
                  ✨
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-widest text-brick/55 font-bold">今日词语</p>
                  <p className="text-brick font-black text-2xl leading-tight truncate">{wotd.hanzi}</p>
                  <p className="text-brick/55 text-xs">{wotd.pinyin}</p>
                </div>
                <div className="shrink-0 text-right">
                  {wotdClaimed ? (
                    <div className="text-nanyang-teal font-black text-sm">✓ 已领</div>
                  ) : (
                    <>
                      <div className="text-brick font-black text-base">+{WORD_OF_DAY_REWARD}</div>
                      <div className="text-xs text-brick/45">🪙</div>
                    </>
                  )}
                </div>
              </div>
            </button>
          )}

          <p className="text-xs uppercase tracking-widest text-brick/40 font-bold mt-1 mb-0.5 px-1">📜 今日任务</p>

          {/* Mission list */}
          {state.missions.map(m => <MissionRow key={m.id} m={m} />)}

          {/* All-3 bonus */}
          <div className={`mt-2 rounded-xl border-2 px-4 py-3 flex items-center justify-between transition-all ${
            state.bonusClaimed
              ? 'border-gold bg-gold/15'
              : allDone
                ? 'border-gold bg-gold/10 animate-glow'
                : 'border-dashed border-brick/30 bg-cream-dark/40'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-3xl">{state.bonusClaimed ? '🏆' : '🎁'}</span>
              <div>
                <p className="text-brick font-black text-base">三任务全清</p>
                <p className="text-brick/55 text-xs">
                  {state.bonusClaimed ? '已领取！明天再战' : '完成全部 3 个任务'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-black text-xl ${state.bonusClaimed ? 'text-gold' : 'text-brick'}`}>
                +{ALL_3_BONUS}
              </div>
              <div className="text-xs text-brick/45">🪙</div>
            </div>
          </div>

          {/* Tip footer */}
          <p className="text-brick/40 text-xs text-center mt-2 leading-relaxed">
            💡 完成任务自动获得词币奖励<br />
            明天 0 点会有 3 个全新任务等你挑战！
          </p>
        </div>
      </div>
    </div>
  )
}
