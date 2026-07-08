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
import PetCreature, { getStage, getPetStageInfo, PET_STAGES } from './components/PetCreature'
import AchievementToast from './components/AchievementToast'
import ChatBot from './components/ChatBot'
import CoinPopup from './components/CoinPopup'
import MissionsModal from './components/MissionsModal'
import WordOfDayModal from './components/WordOfDayModal'
import TodayLoginsModal from './components/TodayLoginsModal'
import GlobalBossModal from './components/GlobalBossModal'
import BossDamageToast from './components/BossDamageToast'
import FloatingParticles from './components/FloatingParticles'
import ReviewModal from './components/ReviewModal'
import { loginUser, getSession, logoutUser, getDailyMissions, isWordOfDayClaimed, getLevelInfo, syncProgress, restoreXP, getDueReviews } from './utils/userStore'
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
        <div className="tracking-widest mb-1"
             style={{ fontFamily: '"Orbitron", sans-serif', fontSize: '3.2rem', fontWeight: 900, color: current.color, textShadow: `0 0 40px ${current.color}, 0 0 80px ${current.color}88, 0 0 120px ${current.color}44` }}>
          LEVEL UP!
        </div>
        <div className="font-black text-2xl text-white/90 mb-0.5" style={{ fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.06em' }}>LV.{current.level}</div>
        <div className="text-lg text-white/70 font-black mb-0.5">{current.title}</div>
        <div className="text-sm text-white/35 font-mono" style={{ fontFamily: '"Share Tech Mono", monospace', letterSpacing: '0.15em' }}>◈ 恭喜升级 ◈</div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   PET EVOLUTION FULL SCREEN OVERLAY — the Pokémon moment
   ══════════════════════════════════════════════════════════ */
function EvolutionOverlay({ level, user, onDone }) {
  const info = getPetStageInfo(level)
  useEffect(() => { const t = setTimeout(onDone, 4200); return () => clearTimeout(t) }, [onDone])
  return (
    <div className="fixed inset-0 z-[310] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.85)' }} />
      {/* Radial rays in the new stage's colour */}
      <div className="absolute inset-0 flex items-center justify-center">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="absolute animate-burstRay"
               style={{
                 width: 3, height: '46%',
                 background: `linear-gradient(to top, ${info.color}cc, transparent)`,
                 transformOrigin: 'bottom center',
                 transform: `rotate(${i * 22.5}deg) translateY(-100%)`,
                 animationDelay: `${i * 0.03}s`,
                 bottom: '50%', left: 'calc(50% - 1.5px)',
               }} />
        ))}
      </div>
      <div className="absolute rounded-full animate-levelBurst"
           style={{ width: 340, height: 340, border: `3px solid ${info.color}`, boxShadow: `0 0 60px ${info.color}88, inset 0 0 60px ${info.color}22` }} />
      <div className="relative z-10 text-center animate-levelBurst">
        <PetCreature
          level={level}
          petHat={user?.petHat || 'hat_none'}
          petAura={user?.petAura || 'aura_none'}
          petCompanion={user?.petCompanion || 'companion_none'}
          petWeapon={user?.petWeapon || 'weapon_none'}
          width={170}
        />
        <div className="tracking-widest mt-2"
             style={{ fontFamily: '"Orbitron", sans-serif', fontSize: '2.6rem', fontWeight: 900, color: info.color, textShadow: `0 0 40px ${info.color}, 0 0 80px ${info.color}88` }}>
          进化成功！
        </div>
        <div className="font-black text-3xl mt-1" style={{ color: '#fff', textShadow: `0 0 20px ${info.color}` }}>
          {info.name}
        </div>
        <div className="text-base mt-1" style={{ color: 'rgba(255,255,255,0.75)' }}>{info.desc}</div>
        <div className="text-sm mt-2 font-mono" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>◈ Lv.{level} · 灵宠进化 ◈</div>
      </div>
    </div>
  )
}

const UNITS = [unit1, unit2, unit3, unit4, unit5, unit6]
const UNIT_LABELS = ['一', '二', '三', '四', '五', '六']
const UNIT_ICONS  = ['🌱', '🌸', '🌟', '🔥', '💡', '🏆']
const UNIT_COLORS = [
  { border: 'rgba(0,240,255,0.7)',  bg: 'rgba(0,240,255,0.08)',  glow: 'rgba(0,240,255,0.4)',  text: '#00f0ff'  },
  { border: 'rgba(155,93,229,0.7)', bg: 'rgba(155,93,229,0.08)', glow: 'rgba(155,93,229,0.4)', text: '#9b5de5'  },
  { border: 'rgba(6,214,160,0.7)',  bg: 'rgba(6,214,160,0.08)',  glow: 'rgba(6,214,160,0.4)',  text: '#06d6a0'  },
  { border: 'rgba(255,107,53,0.7)', bg: 'rgba(255,107,53,0.08)', glow: 'rgba(255,107,53,0.4)', text: '#ff6b35'  },
  { border: 'rgba(247,37,133,0.7)', bg: 'rgba(247,37,133,0.08)', glow: 'rgba(247,37,133,0.4)', text: '#ff007f'  },
  { border: 'rgba(255,214,10,0.7)', bg: 'rgba(255,214,10,0.08)', glow: 'rgba(255,214,10,0.4)', text: '#fdee30'  },
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
  const [showReview,   setShowReview]   = useState(false)
  const [dueCount,     setDueCount]     = useState(0)
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
  const [evolutionLv, setEvolutionLv] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])

  /* ── Restore XP from Redis if localStorage was wiped ──── */
  const restoreXPFromRedis = (name, localXP) => {
    fetch(`/api/update-xp?name=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(d => {
        if (d.xp && d.xp > (localXP || 0)) {
          restoreXP(d.xp)
          setXpData(getLevelInfo(d.xp))
        }
      })
      .catch(() => {})
  }

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
      // Push current XP so leaderboard stays accurate on page refresh,
      // then restore from Redis if this browser's localStorage was reset.
      fetch('/api/update-xp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: session.name, xp: u.globalXP || 0 }),
      }).catch(() => {})
      restoreXPFromRedis(session.name, u.globalXP || 0)
      syncProgress()
      if (!claimed) setTimeout(() => setShowWotD(true), 600)
    }
    setReady(true)
  }, [])

  /* ── Refresh the review-due badge on login and after answering ── */
  useEffect(() => {
    if (!user) { setDueCount(0); return }
    setDueCount(getDueReviews(UNITS).length)
  }, [user, showReview])

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
    const hLvl = (e) => {
      const lv = e.detail?.level
      // Crossing an evolution threshold gets the big pet moment instead
      if (lv && getStage(lv) > getStage(lv - 1)) setEvolutionLv(lv)
      else setLevelUpInfo(e.detail)
    }
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
    // Push XP immediately on login so leaderboard is current,
    // then restore from Redis if this browser's localStorage was reset.
    fetch('/api/update-xp', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, xp: u.globalXP || 0 }),
    }).then(() => fetchLeaderboard()).catch(() => {})
    restoreXPFromRedis(name, u.globalXP || 0)
    syncProgress()
    if (!claimed) setTimeout(() => setShowWotD(true), 800)
  }
  const handleLogout = () => {
    logoutUser(); setUser(null)
    setShowProfile(false); setShowPet(false); setShowMissions(false); setShowWotD(false); setShowLogins(false); setShowBoss(false); setShowReview(false)
    setMissions(null); setWotdClaimed(false)
    setTodayLogins({ available: false, count: 0 })
    setBossState({ available: false, hp: 0, maxHp: 5000, defeated: false })
  }

  /* Close WotD if open, then open the requested modal */
  const openModal = (setter) => { setShowWotD(false); setter(true) }

  const handleOpenProfile = () => { const f = getSession(); if (f) setUser(f); openModal(setShowProfile) }

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
    <div className="cyber-bg h-[100dvh] overflow-hidden flex flex-col relative">

      {/* ── Floating background particles ───────────────── */}
      <FloatingParticles />

      {/* ── Level-up overlay ─────────────────────────────── */}
      {levelUpInfo && <LevelUpOverlay info={levelUpInfo} onDone={() => setLevelUpInfo(null)} />}

      {/* ── Pet evolution overlay ────────────────────────── */}
      {evolutionLv && <EvolutionOverlay level={evolutionLv} user={user} onDone={() => setEvolutionLv(null)} />}

      {/* ── Header ──────────────────────────────────────── */}
      <header className="cyber-header relative" style={{ paddingTop: 0, paddingBottom: 0, zIndex: 30 }}>

        {/* ── WARNING STRIPE — very top edge ── */}
        <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{
          height: 3,
          backgroundImage: 'repeating-linear-gradient(90deg, rgba(253,238,48,0.75) 0px, rgba(253,238,48,0.75) 8px, rgba(3,7,18,0.85) 8px, rgba(3,7,18,0.85) 16px)',
          backgroundSize: '16px 3px',
          animation: 'warningStripe 0.6s linear infinite',
          zIndex: 20,
        }} />

        {/* ── Sweeping bottom beam ── */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none" style={{ height: 2 }}>
          <div style={{
            position: 'absolute', top: 0, left: 0,
            width: '50%', height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(0,240,255,1), rgba(155,93,229,0.8), rgba(255,0,127,0.5), transparent)',
            animation: 'headerBeam 4s ease-in-out infinite',
            filter: 'blur(1px)',
            boxShadow: '0 0 14px rgba(0,240,255,0.9)',
          }} />
        </div>

        {/* ── Side accent lines ── */}
        <div className="absolute left-0 top-0 bottom-0 w-px pointer-events-none"
             style={{ background: 'linear-gradient(to bottom, rgba(0,240,255,0.7), rgba(0,240,255,0.2), transparent)' }} />
        <div className="absolute right-0 top-0 bottom-0 w-px pointer-events-none"
             style={{ background: 'linear-gradient(to bottom, rgba(253,238,48,0.5), rgba(155,93,229,0.3), transparent)' }} />

        {/* ── 4-color L-bracket corners ── */}
        {/* TL cyan */}
        <span className="absolute pointer-events-none" style={{ top: 4, left: 4, width: 16, height: 16, borderTop: '2px solid rgba(0,240,255,0.95)', borderLeft: '2px solid rgba(0,240,255,0.95)', boxShadow: '0 0 10px rgba(0,240,255,0.6)' }} />
        {/* TR acid yellow */}
        <span className="absolute pointer-events-none" style={{ top: 4, right: 4, width: 16, height: 16, borderTop: '2px solid rgba(253,238,48,0.9)', borderRight: '2px solid rgba(253,238,48,0.9)', boxShadow: '0 0 10px rgba(253,238,48,0.5)' }} />
        {/* BL laser pink */}
        <span className="absolute pointer-events-none" style={{ bottom: 4, left: 4, width: 16, height: 16, borderBottom: '2px solid rgba(255,0,127,0.9)', borderLeft: '2px solid rgba(255,0,127,0.9)', boxShadow: '0 0 10px rgba(255,0,127,0.5)' }} />
        {/* BR purple */}
        <span className="absolute pointer-events-none" style={{ bottom: 4, right: 4, width: 16, height: 16, borderBottom: '2px solid rgba(155,93,229,0.9)', borderRight: '2px solid rgba(155,93,229,0.9)', boxShadow: '0 0 10px rgba(155,93,229,0.5)' }} />

        {/* ── HUD STATUS ROW — top ── */}
        <div className="flex items-center justify-between px-8 pt-2.5 pb-0.5 pointer-events-none select-none">
          <div className="flex items-center gap-2.5">
            <span className="status-dot status-dot-online" />
            <span style={{ fontFamily: '"Share Tech Mono",monospace', fontSize: '0.6rem', color: 'rgba(6,214,160,0.8)', letterSpacing: '0.12em' }}>系统在线</span>
            <span className="sys-tag" style={{ color: 'rgba(6,214,160,0.7)', background: 'rgba(6,214,160,0.08)', padding: '1px 6px', border: '1px solid rgba(6,214,160,0.25)', fontSize: '0.6rem' }}>身份已验证</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="sys-tag sys-tag-yellow" style={{ fontSize: '0.58rem' }}>备考模式</span>
          </div>
        </div>

        {/* ── BARCODE STRIPS — left and right of title ── */}
        <div className="absolute pointer-events-none select-none" style={{ top: '50%', left: 36, transform: 'translateY(-50%)', opacity: 0.35 }}>
          <div className="barcode-strip" style={{ width: 32, height: 28 }} />
          <div style={{ fontFamily: '"Share Tech Mono",monospace', fontSize: '0.38rem', color: 'rgba(0,240,255,0.5)', letterSpacing: '0.06em', marginTop: 2 }}>CHS·A3</div>
        </div>
        <div className="absolute pointer-events-none select-none" style={{ top: '50%', right: 90, transform: 'translateY(-50%)', opacity: 0.35 }}>
          <div className="barcode-strip" style={{ width: 32, height: 28 }} />
          <div style={{ fontFamily: '"Share Tech Mono",monospace', fontSize: '0.38rem', color: 'rgba(253,238,48,0.45)', letterSpacing: '0.06em', marginTop: 2 }}>FF·7E</div>
        </div>

        {/* ── TITLE BLOCK ── */}
        <div className="text-center relative z-10 py-1">
          <p className="glow-subtitle text-xs tracking-[0.35em] mb-0.5 uppercase">
            华文词汇学习系统
          </p>
          <h1
            className="glow-title glitch-title text-3xl sm:text-4xl font-black cursor-default select-none"
            data-text="中一词语宝典"
            style={{ letterSpacing: '0.12em' }}
            onClick={handleTitleClick}
          >
            中一词语宝典
          </h1>
        </div>

        {/* ── HUD STATUS ROW — bottom ── */}
        <div className="flex items-center justify-between px-8 pt-0.5 pb-2.5 pointer-events-none select-none">
          <span style={{ fontFamily: '"Share Tech Mono",monospace', fontSize: '0.58rem', color: 'rgba(0,240,255,0.4)', letterSpacing: '0.1em' }}>6 单元 · 400+ 词语</span>
          <span className="sys-tag sys-tag-yellow" style={{ fontSize: '0.58rem' }}>⚠ 备考模式</span>
        </div>

        {/* ── Logout button ── */}
        <button
          onClick={handleLogout}
          className="cyber-btn z-20 text-sm"
          style={{ position: 'absolute', top: '50%', right: '1rem', transform: 'translateY(-50%)' }}
        >
          切换
        </button>
      </header>

      {/* ── User bar ────────────────────────────────────── */}
      <div className="glass-panel holo-card px-3 py-2 flex items-center gap-2 shrink-0 overflow-x-auto relative" style={{ zIndex: 30 }}>

        {/* Name → profile */}
        <button
          onClick={handleOpenProfile}
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity shrink-0"
        >
          <span className="text-lg">👤</span>
          <span className="text-neon-cyan font-black text-base neon-underline max-w-[80px] truncate text-neon-glow">
            {user.name}
          </span>
        </button>

        <span className="text-neon-cyan/15 text-lg select-none">│</span>

        {/* XP bar */}
        {xpData && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="tabular-nums" style={{
              fontFamily: '"Orbitron", sans-serif',
              fontSize: '0.62rem',
              fontWeight: 700,
              color: xpData.current.color,
              textShadow: `0 0 10px ${xpData.current.color}aa, 0 0 20px ${xpData.current.color}44`,
              letterSpacing: '0.04em',
            }}>
              {xpData.current.emoji} {xpData.current.level}
            </span>
            {/* XP bar with energy flow */}
            <div className="relative h-2 w-16 sm:w-24 rounded-full overflow-hidden"
                 style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${xpData.current.color}33` }}>
              <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 xp-bar-fill"
                   style={{
                     width: `${xpData.pct}%`,
                     background: `linear-gradient(90deg, ${xpData.current.color}44, ${xpData.current.color}cc, ${xpData.current.color}ff, ${xpData.current.color}88, ${xpData.current.color}cc)`,
                     backgroundSize: '200% 100%',
                     boxShadow: `0 0 8px ${xpData.current.color}88, 0 0 2px ${xpData.current.color}`,
                   }} />
            </div>
          </div>
        )}

        <span className="text-neon-cyan/20 text-lg select-none">│</span>

        {/* Character button → pet modal */}
        <button
          onClick={() => openModal(setShowPet)}
          className="hud-pill flex items-center gap-1 neon-btn-purple rounded-full px-3 py-1 text-sm shrink-0"
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
              onClick={() => openModal(setShowMissions)}
              className={`hud-pill relative flex items-center gap-1 rounded-full px-3 py-1 border shrink-0 text-sm font-black ${
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

        {/* 今日复习 — spaced-repetition deck */}
        <button
          onClick={() => openModal(setShowReview)}
          className={`hud-pill relative flex items-center gap-1 rounded-full px-3 py-1 shrink-0 text-sm font-black ${dueCount > 0 ? 'animate-pulse2' : ''}`}
          style={{
            background: dueCount > 0 ? 'rgba(6,214,160,0.12)' : 'rgba(6,214,160,0.05)',
            border: `1px solid ${dueCount > 0 ? 'rgba(6,214,160,0.5)' : 'rgba(6,214,160,0.2)'}`,
            color: dueCount > 0 ? '#06d6a0' : 'rgba(6,214,160,0.45)',
          }}
          title="今日复习"
        >
          <span className="text-base">📖</span>
          <span>复习</span>
          {dueCount > 0 && (
            <span className="tabular-nums rounded-full px-1.5"
                  style={{ background: 'rgba(6,214,160,0.2)', fontSize: '0.72rem' }}>
              {dueCount}
            </span>
          )}
        </button>

        {/* AI 词语老师 chatbot launcher — beside 今日任务 */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('vocab_open_chat'))}
          className="hud-pill flex items-center gap-1 rounded-full px-3 py-1 shrink-0 text-sm font-black"
          style={{ background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.45)', color: '#ff6b35' }}
          title="AI 词语老师"
        >
          <span className="text-base">📚</span>
          <span>词语老师</span>
        </button>

        {/* Global boss */}
        {bossState.available && (() => {
          const boss = getCurrentBoss()
          return (
            <button
              onClick={() => openModal(setShowBoss)}
              className={`hud-pill relative flex items-center gap-1 rounded-full px-3 py-1 border shrink-0 text-sm font-black ${
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
            onClick={() => openModal(setShowLogins)}
            className="hud-pill flex items-center gap-1 bg-neon-cyan/8 hover:bg-neon-cyan/15 border border-neon-cyan/30 rounded-full px-3 py-1 shrink-0 text-sm font-black text-neon-cyan"
            title="今日登录人数"
          >
            <span className="text-base">🏫</span>
            <span className="tabular-nums">{todayLogins.count}</span>
          </button>
        )}
      </div>

      {/* ── Unit Tab Navigation ──────────────────────────── */}
      <nav className="relative overflow-x-auto shrink-0"
           style={{ zIndex: 30, background: 'rgba(4,10,22,0.97)', borderBottom: '1px solid rgba(0,240,255,0.15)' }}>
        <div className="flex">
          {UNITS.map((unit, i) => {
            const score    = user.bossScores?.[String(i + 1)]
            const cleared  = score?.cleared
            const stars    = cleared ? 3 - (score.bestMistakes || 0) : 0
            const c        = UNIT_COLORS[i]
            const isActive = activeUnit === i
            return (
              <button
                key={i}
                onClick={() => setActiveUnit(i)}
                className="flex-1 min-w-[110px] px-2 py-2.5 text-center transition-all relative border-b-2 overflow-hidden"
                style={{
                  borderBottomColor: isActive ? c.border : 'transparent',
                  background:        isActive ? c.bg     : 'transparent',
                  color:             isActive ? c.text   : 'rgba(160,200,240,0.4)',
                  transition:        'all 0.25s ease',
                }}
              >
                {/* Active state: radial aura glow from bottom */}
                {isActive && (
                  <>
                    {/* Glow underline bar */}
                    <span className="absolute bottom-0 left-0 right-0 h-[3px]"
                          style={{
                            background: `linear-gradient(90deg, transparent, ${c.text}, transparent)`,
                            boxShadow:  `0 0 16px ${c.glow}, 0 0 32px ${c.glow}66, 0 0 48px ${c.glow}33`,
                          }} />
                    {/* Radial glow aura from bottom-center */}
                    <span className="absolute inset-0 pointer-events-none"
                          style={{
                            background: `radial-gradient(ellipse 80% 60% at 50% 120%, ${c.glow} 0%, transparent 70%)`,
                            opacity: 0.28,
                          }} />
                    {/* Top-edge highlight */}
                    <span className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                          style={{ background: `linear-gradient(90deg, transparent, ${c.text}55, transparent)` }} />
                  </>
                )}

                <div className="text-xl font-black flex items-center justify-center gap-1 leading-none"
                     style={{
                       textShadow: isActive ? `0 0 18px ${c.glow}, 0 0 36px ${c.glow}66` : 'none',
                       transition: 'text-shadow 0.25s',
                     }}>
                  <span>{UNIT_ICONS[i]}</span>
                  <span>单元{UNIT_LABELS[i]}</span>
                </div>

                <div className="text-sm leading-tight mt-0.5 truncate font-semibold opacity-90">
                  《{unit.title}》
                </div>

                <div className="text-xs mt-0.5 flex items-center justify-center gap-1 opacity-70">
                  <span style={{ fontFamily: '"Share Tech Mono", monospace', letterSpacing: '0.05em' }}>{unit.vocabs.length}</span>
                  <span>词</span>
                  {cleared && (
                    <span className="text-xs">
                      {[0,1,2].map(s => (
                        <span key={s} style={{
                          color:      s < stars ? '#fdee30' : 'rgba(255,214,10,0.12)',
                          textShadow: s < stars ? '0 0 8px rgba(255,214,10,0.8), 0 0 16px rgba(255,214,10,0.4)' : 'none',
                        }}>★</span>
                      ))}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── Content row: pet card · main · leaderboard card ──
           Flex columns reserve their own space, so they can never overlap the
           centred content — on a narrow screen the main column shrinks. ── */}
      <div className="flex-1 flex justify-center overflow-hidden relative z-10 min-h-0">

        {/* Pet card (left) — clickable, themed to the pet's evolution stage */}
        <aside className="hidden lg:flex shrink-0 items-center justify-center" style={{ width: 222 }}>
          {(() => {
            const petLv      = xpData?.current?.level || 1
            const stage      = getStage(petLv)
            const stageInfo  = getPetStageInfo(petLv)
            const nextStage  = PET_STAGES[stage]           // undefined at max stage
            const stageStart = stage === 1 ? 0 : (stage - 1) * 5
            const evoPct     = stageInfo.nextLv
              ? Math.min(100, Math.round(((petLv - stageStart) / (stageInfo.nextLv - stageStart)) * 100))
              : 100
            return (
              <button
                onClick={() => openModal(setShowPet)}
                className="glass-card p-4 flex flex-col items-center gap-2.5 text-left transition-all"
                style={{ width: 164, cursor: 'pointer', borderColor: `${stageInfo.color}55` }}
                title="打开灵宠养成"
              >
                {/* Stage-coloured glow bed behind the pet */}
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', inset: -12,
                    background: `radial-gradient(circle, ${stageInfo.color}33 0%, transparent 70%)`,
                    filter: 'blur(10px)', pointerEvents: 'none',
                  }} />
                  <PetCreature
                    level={petLv}
                    petHat={user.petHat || 'hat_none'}
                    petAura={user.petAura || 'aura_none'}
                    petCompanion={user.petCompanion || 'companion_none'}
                    petWeapon={user.petWeapon || 'weapon_none'}
                    width={150}
                    interactive
                  />
                </div>

                <p style={{ color: stageInfo.color, textShadow: `0 0 10px ${stageInfo.color}88`, fontWeight: 900, fontSize: '17px', textAlign: 'center', width: '100%' }}>
                  {user.petName || user.avatarName || user.name}
                </p>

                {xpData && (
                  <div className="flex flex-col items-center gap-1 w-full">
                    <div className="flex items-center gap-1.5">
                      <span style={{ fontSize: '1.3rem' }}>{xpData.current.emoji}</span>
                      <span style={{ color: xpData.current.color, fontWeight: 900, fontSize: '15px' }}>
                        Lv.{xpData.current.level} · {stageInfo.name}
                      </span>
                    </div>
                    <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                           style={{ width: `${xpData.pct}%`, background: xpData.current.color, boxShadow: `0 0 6px ${xpData.current.color}` }} />
                    </div>
                  </div>
                )}

                {/* Evolution progress — the anticipation hook */}
                {stageInfo.nextLv ? (
                  <div className="w-full flex flex-col gap-1">
                    <div className="flex justify-between items-baseline">
                      <span style={{ fontSize: '11px', color: 'rgba(168,216,240,0.55)', fontFamily: 'monospace' }}>
                        {stage <= 2 ? '🐣 孵化进度' : '⚡ 进化进度'}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 900, color: (nextStage?.color || stageInfo.color) }}>
                        Lv.{stageInfo.nextLv} → {nextStage?.name}
                      </span>
                    </div>
                    <div className="w-full rounded-full overflow-hidden" style={{ height: 5, background: 'rgba(255,255,255,0.07)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                           style={{
                             width: `${evoPct}%`,
                             background: `linear-gradient(90deg, ${stageInfo.color}, ${nextStage?.color || stageInfo.color})`,
                             boxShadow: `0 0 8px ${(nextStage?.color || stageInfo.color)}aa`,
                           }} />
                    </div>
                    {stage <= 2 && (
                      <p style={{ fontSize: '11px', color: stageInfo.color, fontWeight: 700, textAlign: 'center', marginTop: 1 }}>
                        还差 {stageInfo.nextLv - petLv} 级孵化！点我摸摸 ✨
                      </p>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: '12px', color: '#ffd60a', fontWeight: 900, textShadow: '0 0 8px rgba(255,214,10,0.5)' }}>
                    ✨ 终极形态 ✨
                  </p>
                )}
              </button>
            )
          })()}
        </aside>

        {/* Main */}
        <main className="flex flex-col w-full max-w-3xl min-w-0 min-h-0 overflow-hidden">
          <UnitPage key={activeUnit} unit={UNITS[activeUnit]} user={user} />
        </main>

        {/* Leaderboard card (right) */}
        <aside className="hidden lg:flex shrink-0 items-center justify-center pointer-events-none" style={{ width: 222 }}>
          {leaderboard.length > 0 && (
            <div className="glass-card p-4" style={{ width: 210 }}>
              <p style={{ color: '#fdee30', fontWeight: 900, fontSize: '20px', textAlign: 'center', marginBottom: 14, letterSpacing: '0.06em', textShadow: '0 0 12px rgba(255,214,10,0.7)' }}>
                🏆 排行榜
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {leaderboard.slice(0, 5).map((entry, i) => {
                  const isMe = entry.name === user?.name
                  const rankColor = i === 0 ? '#fdee30' : i === 1 ? '#C0C0C0' : i === 2 ? '#cd7f32' : 'rgba(0,240,255,0.35)'
                  return (
                    <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: rankColor, fontWeight: 900, fontSize: '18px', width: 24, textAlign: 'center', flexShrink: 0 }}>
                        {i + 1}
                      </span>
                      <span style={{ fontSize: '1.4rem', flexShrink: 0 }} title={entry.title}>{entry.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          color:      isMe ? '#00f0ff' : 'rgba(220,240,255,0.9)',
                          textShadow: isMe ? '0 0 10px rgba(0,240,255,0.9)' : 'none',
                          fontWeight: isMe ? 900 : 700,
                          fontSize:   '17px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          lineHeight: 1.2,
                        }}>
                          {isMe ? '▶ ' : ''}{entry.name}
                        </p>
                        <p style={{ color: entry.color || 'rgba(0,240,255,0.5)', fontSize: '14px', fontFamily: 'monospace', lineHeight: 1.3, marginTop: 2 }}>
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
          )}
        </aside>

      </div>

      {/* ── Modals ───────────────────────────────────────── */}
      {showProfile  && <ProfileModal user={user} onClose={() => setShowProfile(false)} />}
      {showPet      && <PetModal onClose={() => { setShowPet(false); refreshUser() }} />}
      {showMissions && <MissionsModal units={UNITS} onOpenWotD={() => { setShowMissions(false); setShowWotD(true) }} onClose={() => setShowMissions(false)} />}
      {showWotD     && <WordOfDayModal units={UNITS} onClose={() => setShowWotD(false)} />}
      {showLogins   && <TodayLoginsModal currentName={user.name} onClose={() => setShowLogins(false)} />}
      {showBoss     && <GlobalBossModal currentName={user.name} onClose={() => setShowBoss(false)} />}
      {showReview   && <ReviewModal units={UNITS} onClose={() => setShowReview(false)} />}

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
                ? 'rgba(255,214,10,0.12)' : 'rgba(0,240,255,0.10)',
              backdropFilter: 'blur(16px)',
              boxShadow: missionDone.kind === 'all_three'
                ? '0 0 30px rgba(255,214,10,0.3)' : '0 0 30px rgba(0,240,255,0.3)',
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

      {/* ── AI Chatbot ──────────────────────────────────── */}
      <ChatBot allUnits={UNITS} studentName={user.name} currentUnitIndex={activeUnit} />

      {/* ── Teacher dashboard overlay ─────────────────── */}
      {showTeacher && (
        <TeacherDashboard onClose={() => setShowTeacher(false)} />
      )}
    </div>
  )
}
