import { useEffect } from 'react'

/** Floating "⚔️ 击中 Boss! -N HP" toast — shown when this student contributes damage. */
export default function BossDamageToast({ damage, defeated, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div
      className="fixed top-20 left-1/2 -translate-x-1/2 z-[55] pointer-events-none animate-coinFloat"
      style={{ filter: 'drop-shadow(0 6px 18px rgba(139,37,0,0.5))' }}
    >
      <div className="bg-gradient-to-br from-brick to-brick-mid text-cream font-black px-4 py-2.5 rounded-2xl shadow-2xl text-lg flex items-center gap-2 border-2 border-cream/40">
        <span className="text-2xl animate-wiggle">{defeated ? '🏆' : '💢'}</span>
        <span className="leading-tight">
          {defeated
            ? '击败 Boss! 全班胜利!'
            : <>击中 Boss! <span className="text-gold">-{damage}</span> HP</>}
        </span>
      </div>
    </div>
  )
}
