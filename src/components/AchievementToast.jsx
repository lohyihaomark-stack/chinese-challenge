import { useEffect, useState } from 'react'

export default function AchievementToast({ achievement, onDone }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Small delay so the enter animation is visible
    const show = setTimeout(() => setVisible(true), 30)
    const hide = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 400)
    }, 3500)
    return () => { clearTimeout(show); clearTimeout(hide) }
  }, [achievement])

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] transition-all duration-400 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'
      }`}
    >
      <div className="bg-brick text-cream px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-[320px] border-2 border-gold/40">
        <span className="text-4xl leading-none">{achievement.emoji}</span>
        <div>
          <p className="text-cream/70 text-xs font-bold tracking-wider mb-0.5">🎖️ 成就解锁！</p>
          <p className="font-black text-lg leading-tight">{achievement.label}</p>
          <p className="text-cream/65 text-sm">{achievement.desc}</p>
        </div>
      </div>
    </div>
  )
}
