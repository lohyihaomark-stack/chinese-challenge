import { useState, useEffect } from 'react'
import unit1 from './data/unit1.json'
import unit2 from './data/unit2.json'
import unit3 from './data/unit3.json'
import UnitPage from './components/UnitPage'
import LoginScreen from './components/LoginScreen'
import ProfileModal from './components/ProfileModal'
import PetModal from './components/PetModal'
import AchievementToast from './components/AchievementToast'
import ChatBot from './components/ChatBot'
import { loginUser, getSession, logoutUser } from './utils/userStore'

const UNITS = [unit1, unit2, unit3]
const UNIT_LABELS = ['一', '二', '三']

export default function App() {
  const [user,        setUser]        = useState(null)
  const [activeUnit,  setActiveUnit]  = useState(0)
  const [ready,       setReady]       = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showPet,     setShowPet]     = useState(false)
  const [toast,       setToast]       = useState(null)

  /* ── Restore session ── */
  useEffect(() => {
    const session = getSession()
    if (session) setUser(loginUser(session.name))
    setReady(true)
  }, [])

  /* ── Achievement toasts ── */
  useEffect(() => {
    const h = (e) => setToast(e.detail)
    window.addEventListener('vocab_achievement', h)
    return () => window.removeEventListener('vocab_achievement', h)
  }, [])

  /* ── Live coin counter update ── */
  useEffect(() => {
    const h = (e) => setUser(prev => prev ? { ...prev, coins: e.detail.total } : prev)
    window.addEventListener('vocab_coins', h)
    return () => window.removeEventListener('vocab_coins', h)
  }, [])

  const handleLogin  = (name) => setUser(loginUser(name))
  const handleLogout = () => { logoutUser(); setUser(null); setShowProfile(false); setShowPet(false) }

  const handleOpenProfile = () => { const f = getSession(); if (f) setUser(f); setShowProfile(true) }

  if (!ready) return null
  if (!user)  return <LoginScreen onLogin={handleLogin} />

  const streak = user.streak || 1
  const streakText  = `🔥 ${streak} 天连续`
  const streakColor =
    streak >= 30 ? 'text-nanyang-teal font-black' :
    streak >= 7  ? 'text-gold font-black' :
    streak >= 3  ? 'text-brick-light font-bold' :
                   'text-brick/55 font-semibold'

  return (
    <div className="nanyang-bg min-h-screen flex flex-col">

      {/* ── Header ────────────────────────────────── */}
      <header className="nanyang-header py-4 px-4 shadow-lg">
        <div className="text-center relative z-10">
          <p className="text-gold text-xs tracking-widest mb-0.5">✦ 华文词汇学习 ✦</p>
          <h1 className="text-3xl sm:text-4xl font-black text-cream" style={{ letterSpacing: '0.12em' }}>
            中一词语宝典
          </h1>
        </div>
      </header>

      {/* ── User bar ──────────────────────────────── */}
      <div className="bg-cream border-b-2 border-cream-dark px-3 py-2 flex items-center gap-2 shrink-0">

        {/* Name → profile */}
        <button
          onClick={handleOpenProfile}
          className="flex items-center gap-1.5 hover:opacity-70 transition-opacity shrink-0"
        >
          <span className="text-lg">👤</span>
          <span className="text-brick font-black text-base underline underline-offset-2 decoration-dotted max-w-[80px] truncate">
            {user.name}
          </span>
        </button>

        <span className="text-brick/20 text-lg">│</span>

        {/* Pet button → pet modal */}
        <button
          onClick={() => setShowPet(true)}
          className="flex items-center gap-1 bg-gold/15 hover:bg-gold/30 border border-gold/40 rounded-lg px-2.5 py-1 transition-colors shrink-0"
        >
          <span className="text-base">🐲</span>
          <span className="text-brick font-black text-base">我的宠物</span>
        </button>

        <span className="text-brick/20 text-lg">│</span>

        {/* Streak */}
        <span className={`text-base flex-1 ${streakColor}`}>
          {streakText}
        </span>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="text-brick/40 text-sm hover:text-brick/70 transition-colors border border-brick/20 rounded-lg px-2 py-1 shrink-0"
        >
          切换
        </button>
      </div>

      {/* ── Unit Tab Navigation ─────────────────────── */}
      <nav className="bg-cream-dark shadow-sm overflow-x-auto">
        <div className="flex">
          {UNITS.map((unit, i) => (
            <button
              key={i}
              onClick={() => setActiveUnit(i)}
              className={`flex-1 min-w-[120px] px-3 py-3 text-center transition-colors border-b-2 ${
                activeUnit === i
                  ? 'border-brick text-brick bg-cream font-bold'
                  : 'border-brick/20 text-brick/75 hover:text-brick hover:bg-cream/60 font-medium'
              }`}
            >
              <div className="text-xl font-bold">单元{UNIT_LABELS[i]}</div>
              <div className="text-base leading-tight mt-0.5 truncate opacity-90">《{unit.title}》</div>
              <div className="text-base text-brick/55 mt-0.5">{unit.vocabs.length} 词</div>
            </button>
          ))}
        </div>
      </nav>

      {/* ── Unit Content ──────────────────────────── */}
      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full overflow-hidden">
        <UnitPage key={activeUnit} unit={UNITS[activeUnit]} />
      </main>

      {/* ── Modals ────────────────────────────────── */}
      {showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} />}
      {showPet     && <PetModal onClose={() => { setShowPet(false); const f=getSession(); if(f) setUser(f) }} />}

      {/* ── Achievement toast ────────────────────── */}
      {toast && <AchievementToast achievement={toast} onDone={() => setToast(null)} />}

      {/* ── AI Chatbot ───────────────────────────── */}
      <ChatBot allUnits={UNITS} studentName={user.name} currentUnitIndex={activeUnit} />
    </div>
  )
}
