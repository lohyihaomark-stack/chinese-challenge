import { useState, useEffect, useRef } from 'react'
import unit1 from './data/unit1.json'
import unit2 from './data/unit2.json'
import unit3 from './data/unit3.json'
import unit4 from './data/unit4.json'
import unit5 from './data/unit5.json'
import unit6 from './data/unit6.json'
import UnitPage from './components/UnitPage'
import LoginScreen from './components/LoginScreen'
import ProfileModal from './components/ProfileModal'
import PetModal from './components/PetModal'
import PetCreature from './components/PetCreature'
import AchievementToast from './components/AchievementToast'
import ChatBot from './components/ChatBot'
import CoinPopup from './components/CoinPopup'
import MissionsModal from './components/MissionsModal'
import WordOfDayModal from './components/WordOfDayModal'
import TodayLoginsModal from './components/TodayLoginsModal'
import GlobalBossModal from './components/GlobalBossModal'
import BossDamageToast from './components/BossDamageToast'
import FloatingParticles from './components/FloatingParticles'
import { loginUser, getSession, logoutUser, getDailyMissions, isWordOfDayClaimed, getLevelInfo, syncProgress } from './utils/userStore'
import { getCurrentBoss } from './utils/globalBoss'
import TeacherDashboard from './components/TeacherDashboard'


/* ══════════════════════════════════════════════════════════
   LEVEL-UP FULL SCREEN OVERLAY
   ══════════════════════════════════════════════════════════ */
function LevelUpOverlay({ info, onDone }) {
  const { current } = info
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t) }, [onDone])
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none">
      {/* Dark vignette */}
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.82)' }} />
      {/* Radial rays */}
      <div className="absolute inset-0 flex items-center justify-center">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="absolute animate-burstRay"
               style={{
                 width: 3, height: '45%',
                 background: `linear-gradient(to top, ${current.color}cc, transparent)`,
                 transformOrigin: 'bottom center',
                 transform: `rotate(${i * 22.5}deg) translateY(-100%)`,
                 animationDelay: `${i * 0.03}s`,
                 bottom: '50%', left: 'calc(50% - 1.5px)',
               }} />
        ))}
      </div>
      {/* Outer ring */}
      <div className="absolute rounded-full animate-levelBurst"
           style={{ width: 320, height: 320, border: `3px solid ${current.color}`, boxShadow: `0 0 60px ${current.color}88, inset 0 0 60px ${current.color}22` }} />
      {/* Content */}
      <div className="relative z-10 text-center animate-levelBurst">
        <div className="text-[7rem] leading-none mb-1">{current.emoji}</div>
        <div className="font-black tracking-widest mb-1"
             style={{ fontSize: '3.2rem', color: current.color, textShadow: `0 0 40px ${current.color}, 0 0 80px ${current.color}88` }}>
          LEVEL UP!
        </div>
        <div className="font-black text-2xl text-white/90 mb-0.5">Lv.{current.level} · {current.title}</div>
        <div className="text-base text-white/40 font-mono">恭喜升级！</div>
      </div>
    </div>
  )
}

const UNITS = [unit1, unit2, unit3, unit4, unit5, unit6]
const UNIT_LABELS = ['一', '二', '三', '四', '五', '六']
const UNIT_ICONS  = ['🌱', '🌸', '🌟', '🔥', '💡', '🏆']
const UNIT_COLORS = [
  { border: 'rgba(0,212,255,0.7)',  bg: 'rgba(0,212,255,0.08)',  glow: 'rgba(0,212,255,0.4)',  text: '#00d4ff'  },
  { border: 'rgba(155,93,229,0.7)', bg: 'rgba(155,93,229,0.08)', glow: 'rgba(155,93,229,0.4)', text: '#9b5de5'  },
  { border: 'rgba(6,214,160,0.7)',  bg: 'rgba(6,214,160,0.08)',  glow: 'rgba(6,214,160,0.4)',  text: '#06d6a0'  },
  { border: 'rgba(255,107,53,0.7)', bg: 'rgba(255,107,53,0.08)', glow: 'rgba(255,107,53,0.4)', text: '#ff6b35'  },
  { border: 'rgba(247,37,133,0.7)', bg: 'rgba(247,37,133,0.08)', glow: 'rgba(247,37,133,0.4)', text: '#f72585'  },
  { border: 'rgba(255,214,10,0.7)', bg: 'rgba(255,214,10,0.08)', glow: 'rgba(255,214,10,0.4)', text: '#ffd60a'  },
]

export default function App() {
  const [user,        setUser]        = useState(null)
  const [activeUnit,  setActiveUnit]  = useState(0)
  const [ready,       setReady]       = useState(false)
  const [showProfile,  setShowProfile]  = useState(false)
  const [showPet,      setShowPet]      = useState(false)
  const [showMissions, setShowMissions] = useState(false)
  const [showWotD,     setShowWotD]     = useState(false)
  const [showLogins,   setShowLogins]   = useState(false)
  const [wotdClaimed,  setWotdClaimed]  = useState(false)
  const [missions,     setMissions]     = useState(null)
  const [toast,        setToast]        = useState(null)
  const [coinPopup,    setCoinPopup]    = useState(null)
  const [missionDone,  setMissionDone]  = useState(null)
  const [todayLogins,  setTodayLogins]  = useState({ available: false, count: 0 })
  const [showBoss,     setShowBoss]     = useState(false)
  const [bossState,    setBossState]    = useState({ available: false, hp: 0, maxHp: 5000, defeated: false })
  const [bossShake,    setBossShake]    = useState(false)
  const [bossToast,    setBossToast]    = useState(null)
  /* ── Teacher dashboard state ─────────────────────── */
  const [showTeacher, setShowTeacher] = useState(false)
  const titleClickCount = useRef(0)
  const titleClickTimer = useRef(null)

  const popupCounter = useRef(0)
  const bossToastCounter = useRef(0)
  const xpPushTimer = useRef(null)

  /* ── New visual state ─────────────────────────────────── */
  const [xpData,      setXpData]      = useState(() => { const s = getSession(); return s ? getLevelInfo(s.globalXP || 0) : null })
  const [levelUpInfo, setLevelUpInfo] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])

  /* ── Push XP to server (debounced 4 s) ───────────────── */
  const pushXP = (name, xp) => {
    if (!name) return
    clearTimeout(xpPushTimer.current)
    xpPushTimer.current = setTimeout(() => {
      fetch('/api/update-xp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, xp }),
      }).catch(() => {})
    }, 4000)
  }

  /* ── Tracks the student's login on the shared counter ── */
  const trackLogin = (name) => {
    if (!name) return
    fetch('/api/login-track', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name }),
    })
      .then(r => r.json())
      .then(d => setTodayLogins({ available: !!d.available, count: d.count || 0 }))
      .catch(() => {})
  }

  const fetchBossState = () => {
    fetch('/api/boss-stats')
      .then(r => r.json())
      .then(d => {
        if (d?.available) {
          setBossState({ available: true, hp: d.hp, maxHp: d.maxHp, defeated: d.defeated })
        }
      })
      .catch(() => {})
  }

  /* ── Restore session ── */
  useEffect(() => {
    const session = getSession()
    if (session) {
      const u = loginUser(session.name)
      setUser(u)
      setMissions(getDailyMissions())
      const claimed = isWordOfDayClaimed()
      setWotdClaimed(claimed)
      trackLogin(session.name)
      fetchBossState()
      // Push current XP so leaderboard stays accurate on page refresh
      fetch('/api/update-xp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: session.name, xp: u.globalXP || 0 }),
      }).catch(() => {})
      syncProgress()
      if (!claimed) setTimeout(() => setShowWotD(true), 600)
    }
    setReady(true)
  }, [])

  /* ── Sync progress on page hide ─────────────────────── */
  useEffect(() => {
    const handleHide = () => { if (getSession()) syncProgress() }
    document.addEventListener('visibilitychange', handleHide)
    window.addEventListener('beforeunload', handleHide)
    return () => {
      document.removeEventListener('visibilitychange', handleHide)
      window.removeEventListener('beforeunload', handleHide)
    }
  }, [])

  /* ── Listen for boss-hit events → live HP + shake + toast ── */
  useEffect(() => {
    const h = (e) => {
      const d = e.detail
      if (!d?.available) return
      setBossState({ available: true, hp: d.hp, maxHp: d.maxHp, defeated: d.defeated })
      setBossShake(true)
      setTimeout(() => setBossShake(false), 600)
      bossToastCounter.current += 1
      setBossToast({ id: bossToastCounter.current, damage: d.hitDealt || 0, defeated: d.defeated })
    }
    window.addEventListener('vocab_boss_hit', h)
    return () => window.removeEventListener('vocab_boss_hit', h)
  }, [])

  /* ── Listen for word-of-day claim ── */
  useEffect(() => {
    const h = () => setWotdClaimed(true)
    window.addEventListener('vocab_wotd_claimed', h)
    return () => window.removeEventListener('vocab_wotd_claimed', h)
  }, [])

  /* ── Refresh missions on change + show completion toast ── */
  useEffect(() => {
    const onChange   = () => setMissions(getDailyMissions())
    const onComplete = (e) => {
      setMissionDone(e.detail)
      setTimeout(() => setMissionDone(null), 3500)
    }
    window.addEventListener('vocab_missions_changed', onChange)
    window.addEventListener('vocab_mission_complete', onChange)
    window.addEventListener('vocab_mission_complete', onComplete)
    return () => {
      window.removeEventListener('vocab_missions_changed', onChange)
      window.removeEventListener('vocab_mission_complete', onChange)
      window.removeEventListener('vocab_mission_complete', onComplete)
    }
  }, [])

  /* ── XP bar + level-up + push XP to leaderboard ── */
  useEffect(() => {
    const hXp = (e) => {
      setXpData(getLevelInfo(e.detail.total))
      pushXP(getSession()?.name, e.detail.total)
    }
    const hLvl = (e) => setLevelUpInfo(e.detail)
    window.addEventListener('vocab_xp',      hXp)
    window.addEventListener('vocab_levelup', hLvl)
    return () => {
      window.removeEventListener('vocab_xp',      hXp)
      window.removeEventListener('vocab_levelup', hLvl)
    }
  }, [])

  /* ── Leaderboard — top 5 by XP, refresh every 60 s ── */
  const fetchLeaderboard = () => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => { if (d.available && d.entries?.length) setLeaderboard(d.entries) })
      .catch(() => {})
  }
  useEffect(() => {
    fetchLeaderboard()
    const id = setInterval(fetchLeaderboard, 60_000)
    return () => clearInterval(id)
  }, [])

  /* ── Achievement toasts ── */
  useEffect(() => {
    const h = (e) => setToast(e.detail)
    window.addEventListener('vocab_achievement', h)
    return () => window.removeEventListener('vocab_achievement', h)
  }, [])

  /* ── Live coin counter update + floating popup ── */
  useEffect(() => {
    const h = (e) => {
      const { amount, total } = e.detail
      // Pull full session to capture any pet equip changes too
      const session = getSession()
      setUser(prev => {
        if (!prev) return prev
        const base = session || prev
        return { ...base, coins: total }
      })
      if (amount > 0) {
        popupCounter.current += 1
        setCoinPopup({ id: popupCounter.current, amount })
      }
    }
    window.addEventListener('vocab_coins', h)
    return () => window.removeEventListener('vocab_coins', h)
  }, [])

  const refreshUser = () => {
    const f = getSession()
    if (f) setUser(f)
  }

  const handleLogin  = (name) => {
    const u = loginUser(name)
    setUser(u)
    setXpData(getLevelInfo(u.globalXP || 0))
    setMissions(getDailyMissions())
    const claimed = isWordOfDayClaimed()
    setWotdClaimed(claimed)
    trackLogin(name)
    fetchBossState()
    // Push XP immediately on login so leaderboard is current
    fetch('/api/update-xp', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, xp: u.globalXP || 0 }),
    }).then(() => fetchLeaderboard()).catch(() => {})
    syncProgress()
    if (!claimed) setTimeout(() => setShowWotD(true), 800)
  }
  const handleLogout = () => {
    logoutUser(); setUser(null)
    setShowProfile(false); setShowPet(false); setShowMissions(false); setShowWotD(false); setShowLogins(false); setShowBoss(false)
    setMissions(null); setWotdClaimed(false)
    setTodayLogins({ available: false, count: 0 })
    setBossState({ available: false, hp: 0, maxHp: 5000, defeated: false })
  }

  const handleOpenProfile = () => { const f = getSession(); if (f) setUser(f); setShowProfile(true) }

  /* ── Hidden teacher trigger (5 clicks on title within 3 s) ── */
  const handleTitleClick = () => {
    titleClickCount.current += 1
    clearTimeout(titleClickTimer.current)
    if (titleClickCount.current >= 5) {
      titleClickCount.current = 0
      setShowTeacher(true)
    } else {
      titleClickTimer.current = setTimeout(() => { titleClickCount.current = 0 }, 3000)
    }
  }

  if (!ready) return null
  if (!user)  return <LoginScreen onLogin={handleLogin} />

  const ac = UNIT_COLORS[activeUnit]

  return (
    <div className="cyber-bg min-h-screen flex flex-col relative">

      {/* ── Floating background particles ───────────────── */}
      <FloatingParticles />

      {/* ── Level-up overlay ─────────────────────────────── */}
      {levelUpInfo && <LevelUpOverlay info={levelUpInfo} onDone={() => setLevelUpInfo(null)} />}

      {/* ── Header ──────────────────────────────────────── */}
      <header className="cyber-header py-3 px-4 relative z-10">
        <div className="text-center relative z-10">
          <p className="glow-subtitle text-xs tracking-[0.35em] mb-0.5 font-mono uppercase">
            ◈ 华文词汇学习系统 ◈
          </p>
          <h1
            className="glow-title text-3xl sm:text-4xl font-black animate-titleFlicker cursor-default select-none"
            style={{ letterSpacing: '0.12em' }}
            onClick={handleTitleClick}
          >
            中一词语宝典
          </h1>
        </div>

        {/* Logout button — top right */}
        <button
          onClick={handleLogout}
          className="neon-btn absolute top-1/2 -translate-y-1/2 right-4 z-20 text-base font-black px-4 py-2"
        >
          切换
        </button>
      </header>

      {/* ── User bar ────────────────────────────────────── */}
      <div className="glass-panel px-3 py-2 flex items-center gap-2 shrink-0 overflow-x-auto relative z-10">

        {/* Name → profile */}
        <button
          onClick={handleOpenProfile}
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity shrink-0"
        >
          <span className="text-lg">👤</span>
          <span className="text-neon-cyan font-black text-base underline underline-offset-2 decoration-dotted max-w-[80px] truncate text-neon-glow">
            {user.name}
          </span>
        </button>

        <span className="text-neon-cyan/20 text-lg select-none">│</span>

        {/* XP bar */}
        {xpData && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-black tabular-nums" style={{ color: xpData.current.color, textShadow: `0 0 8px ${xpData.current.color}88` }}>
              {xpData.current.emoji} {xpData.current.level}
            </span>
            <div className="relative h-2 w-16 sm:w-24 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                   style={{ width: `${xpData.pct}%`, background: `linear-gradient(90deg, ${xpData.current.color}88, ${xpData.current.color})`, boxShadow: `0 0 6px ${xpData.current.color}` }} />
            </div>
          </div>
        )}

        <span className="text-neon-cyan/20 text-lg select-none">│</span>

        {/* Character button → pet modal */}
        <button
          onClick={() => setShowPet(true)}
          className="flex items-center gap-1 neon-btn-purple rounded-full px-3 py-1 text-sm shrink-0"
        >
          <span className="text-base">🧑</span>
          <span className="font-black text-sm">我的宠物</span>
        </button>

        {/* Missions button */}
        {missions && (() => {
          const done  = missions.missions.filter(m => m.done).length
          const total = missions.missions.length
          const allClaimed     = done === total && missions.bonusClaimed
          const hasUnclaimed   = !wotdClaimed || done < total
          return (
            <button
              onClick={() => setShowMissions(true)}
              className={`relative flex items-center gap-1 rounded-full px-3 py-1 border transition-all shrink-0 text-sm font-black ${
                allClaimed && wotdClaimed
                  ? 'bg-neon-green/10 border-neon-green/40 text-neon-green'
                  : hasUnclaimed
                    ? 'bg-neon-gold/10 border-neon-gold/40 text-neon-gold animate-pulse2'
                    : 'bg-neon-gold/15 border-neon-gold/60 text-neon-gold animate-glow'
              }`}
            >
              <span className="text-base">📜</span>
              <span className="tabular-nums">{done}/{total}</span>
              {((done === total && !missions.bonusClaimed) || !wotdClaimed) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-neon-gold rounded-full border-2 border-cyber animate-pulse" />
              )}
            </button>
          )
        })()}

        {/* Global boss */}
        {bossState.available && (() => {
          const boss = getCurrentBoss()
          return (
            <button
              onClick={() => setShowBoss(true)}
              className={`relative flex items-center gap-1 rounded-full px-3 py-1 border shrink-0 transition-all text-sm font-black ${
                bossState.defeated
                  ? 'bg-neon-green/10 border-neon-green/40 text-neon-green'
                  : 'bg-neon-pink/10 border-neon-pink/35 text-neon-pink hover:bg-neon-pink/20'
              } ${bossShake ? 'animate-shake' : ''}`}
              title="全班 Boss"
            >
              <span className="text-base">{bossState.defeated ? '🏆' : boss.emoji}</span>
              {bossState.defeated ? (
                <span>已击败</span>
              ) : (
                <span className="tabular-nums">{bossState.hp.toLocaleString()}</span>
              )}
            </button>
          )
        })()}

        <div className="flex-1" />

        {/* 🏫 Today's logins — far right */}
        {todayLogins.available && (
          <button
            onClick={() => setShowLogins(true)}
            className="flex items-center gap-1 bg-neon-cyan/8 hover:bg-neon-cyan/15 border border-neon-cyan/30 rounded-full px-3 py-1 transition-all shrink-0 text-sm font-black text-neon-cyan"
            title="今日登录人数"
          >
            <span className="text-base">🏫</span>
            <span className="tabular-nums">{todayLogins.count}</span>
          </button>
        )}
      </div>

      {/* ── Unit Tab Navigation ──────────────────────────── */}
      <nav className="relative z-10 overflow-x-auto shrink-0"
           style={{ background: 'rgba(7,13,26,0.95)', borderBottom: '1px solid rgba(0,212,255,0.12)' }}>
        <div className="flex">
          {UNITS.map((unit, i) => {
            const score   = user.bossScores?.[String(i + 1)]
            const cleared = score?.cleared
            const stars   = cleared ? 3 - (score.bestMistakes || 0) : 0
            const c       = UNIT_COLORS[i]
            const isActive = activeUnit === i
            return (
              <button
                key={i}
                onClick={() => setActiveUnit(i)}
                className="flex-1 min-w-[110px] px-2 py-2.5 text-center transition-all relative border-b-2"
                style={{
                  borderBottomColor: isActive ? c.border : 'transparent',
                  background:        isActive ? c.bg     : 'transparent',
                  color:             isActive ? c.text   : 'rgba(160,200,240,0.45)',
                }}
              >
                {/* Active tab glow underline */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                        style={{ background: c.border, boxShadow: `0 0 12px ${c.glow}, 0 0 4px ${c.glow}` }} />
                )}

                <div className="text-xl font-black flex items-center justify-center gap-1 leading-none"
                     style={{ textShadow: isActive ? `0 0 12px ${c.glow}` : 'none' }}>
                  <span>{UNIT_ICONS[i]}</span>
                  <span>单元{UNIT_LABELS[i]}</span>
                </div>

                <div className="text-sm leading-tight mt-0.5 truncate font-semibold opacity-90">
                  《{unit.title}》
                </div>

                <div className="text-xs mt-0.5 flex items-center justify-center gap-1 opacity-70">
                  <span>{unit.vocabs.length} 词</span>
                  {cleared && (
                    <span className="text-xs">
                      {[0,1,2].map(s => (
                        <span key={s} style={{ color: s < stars ? '#ffd60a' : 'rgba(255,214,10,0.15)',
                                               textShadow: s < stars ? '0 0 6px rgba(255,214,10,0.6)' : 'none' }}>★</span>
                      ))}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── Unit Content ─────────────────────────────────── */}
      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full overflow-hidden relative z-10">
        <UnitPage key={activeUnit} unit={UNITS[activeUnit]} user={user} />
      </main>

      {/* ── Modals ───────────────────────────────────────── */}
      {showProfile  && <ProfileModal user={user} onClose={() => setShowProfile(false)} />}
      {showPet      && <PetModal onClose={() => { setShowPet(false); refreshUser() }} />}
      {showMissions && <MissionsModal units={UNITS} onOpenWotD={() => { setShowMissions(false); setShowWotD(true) }} onClose={() => setShowMissions(false)} />}
      {showWotD     && <WordOfDayModal units={UNITS} onClose={() => setShowWotD(false)} />}
      {showLogins   && <TodayLoginsModal currentName={user.name} onClose={() => setShowLogins(false)} />}
      {showBoss     && <GlobalBossModal currentName={user.name} onClose={() => setShowBoss(false)} />}

      {/* ── Achievement toast ──────────────────────────── */}
      {toast && <AchievementToast achievement={toast} onDone={() => setToast(null)} />}

      {/* ── Floating coin popup ────────────────────────── */}
      {coinPopup && (
        <CoinPopup key={coinPopup.id} amount={coinPopup.amount} onDone={() => setCoinPopup(null)} />
      )}

      {/* ── Boss damage toast ──────────────────────────── */}
      {bossToast && (
        <BossDamageToast key={bossToast.id} damage={bossToast.damage} defeated={bossToast.defeated} onDone={() => setBossToast(null)} />
      )}

      {/* ── Mission complete toast ─────────────────────── */}
      {missionDone && (
        <div className="fixed top-32 left-1/2 -translate-x-1/2 z-[55] pointer-events-auto animate-slideUp">
          <button
            onClick={() => { setMissionDone(null); setShowMissions(true) }}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border-2 transition-all hover:scale-105 ${
              missionDone.kind === 'all_three'
                ? 'border-neon-gold/60 text-neon-gold'
                : 'border-neon-cyan/60 text-neon-cyan'
            }`}
            style={{
              background: missionDone.kind === 'all_three'
                ? 'rgba(255,214,10,0.12)' : 'rgba(0,212,255,0.10)',
              backdropFilter: 'blur(16px)',
              boxShadow: missionDone.kind === 'all_three'
                ? '0 0 30px rgba(255,214,10,0.3)' : '0 0 30px rgba(0,212,255,0.3)',
            }}
          >
            <span className="text-3xl">{missionDone.icon || '📜'}</span>
            <div className="text-left">
              <p className="font-black text-base leading-tight">
                {missionDone.kind === 'all_three' ? '🎊 全部任务完成！' : '任务完成！'}
              </p>
              <p className="text-sm leading-tight opacity-75">
                {missionDone.text} · +{missionDone.reward} 🪙
              </p>
            </div>
          </button>
        </div>
      )}

      {/* ── Pet sidebar (left) ──────────────────────────── */}
      <div className="fixed left-20 top-1/2 -translate-y-1/2 z-20 hidden 2xl:flex flex-col items-center gap-2 pointer-events-none"
           style={{ width: 190 }}>
        <div className="glass-card p-4 flex flex-col items-center gap-3 w-full">
          {/* Pet creature */}
          <div className="flex justify-center">
            <PetCreature
              level={xpData?.current?.level || 1}
              petHat={user.petHat || 'hat_none'}
              petAura={user.petAura || 'aura_none'}
              petCompanion={user.petCompanion || 'companion_none'}
              petWeapon={user.petWeapon || 'weapon_none'}
              width={165}
            />
          </div>
          {/* Pet name */}
          <p style={{ color: '#00d4ff', textShadow: '0 0 8px rgba(0,212,255,0.6)', fontWeight: 900, fontSize: '17px', textAlign: 'center', width: '100%' }}>
            {user.petName || user.avatarName || user.name}
          </p>
          {/* Level badge */}
          {xpData && (
            <div className="flex flex-col items-center gap-1 w-full">
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize: '1.4rem' }}>{xpData.current.emoji}</span>
                <span style={{ color: xpData.current.color, fontWeight: 900, fontSize: '16px' }}>
                  Lv.{xpData.current.level}
                </span>
              </div>
              <p style={{ color: xpData.current.color, opacity: 0.9, fontSize: '15px', fontWeight: 700, textAlign: 'center' }}>
                {xpData.current.title}
              </p>
              {/* Mini XP bar */}
              <div className="w-full rounded-full overflow-hidden mt-0.5" style={{ height: 7, background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                     style={{ width: `${xpData.pct}%`, background: xpData.current.color, boxShadow: `0 0 6px ${xpData.current.color}` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── XP leaderboard sidebar ──────────────────────── */}
      {leaderboard.length > 0 && (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-20 hidden 2xl:flex flex-col pointer-events-none"
             style={{ width: 270 }}>
          <div className="glass-card p-5">
            <p style={{ color: '#ffd60a', fontWeight: 900, fontSize: '20px', textAlign: 'center', marginBottom: 14, letterSpacing: '0.06em', textShadow: '0 0 12px rgba(255,214,10,0.7)' }}>
              🏆 排行榜
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {leaderboard.slice(0, 5).map((entry, i) => {
                const isMe = entry.name === user?.name
                const rankColor = i === 0 ? '#ffd60a' : i === 1 ? '#C0C0C0' : i === 2 ? '#cd7f32' : 'rgba(0,212,255,0.35)'
                return (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Rank */}
                    <span style={{ color: rankColor, fontWeight: 900, fontSize: '18px', width: 24, textAlign: 'center', flexShrink: 0 }}>
                      {i + 1}
                    </span>
                    {/* Level emoji */}
                    <span style={{ fontSize: '1.4rem', flexShrink: 0 }} title={entry.title}>{entry.emoji}</span>
                    {/* Name + title */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        color:      isMe ? '#00d4ff' : 'rgba(220,240,255,0.9)',
                        textShadow: isMe ? '0 0 10px rgba(0,212,255,0.9)' : 'none',
                        fontWeight: isMe ? 900 : 700,
                        fontSize:   '17px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        lineHeight: 1.2,
                      }}>
                        {isMe ? '▶ ' : ''}{entry.name}
                      </p>
                      <p style={{ color: entry.color || 'rgba(0,212,255,0.5)', fontSize: '14px', fontFamily: 'monospace', lineHeight: 1.3, marginTop: 2 }}>
                        {entry.title} · Lv.{entry.level}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(255,214,10,0.15)' }}>
              <p style={{ color: 'rgba(255,214,10,0.45)', fontSize: '13px', textAlign: 'center', fontFamily: 'monospace' }}>
                全班 Top 5
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Chatbot ──────────────────────────────────── */}
      <ChatBot allUnits={UNITS} studentName={user.name} currentUnitIndex={activeUnit} />

      {/* ── Teacher dashboard overlay ─────────────────── */}
      {showTeacher && (
        <TeacherDashboard onClose={() => setShowTeacher(false)} />
      )}
    </div>
  )
}
