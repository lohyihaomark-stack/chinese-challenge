import { useEffect } from 'react'

/** Floating "+N 🪙" pop-up shown when the user earns coins. */
export default function CoinPopup({ amount, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div
      className="fixed top-20 right-4 z-[60] pointer-events-none animate-coinFloat"
      style={{ filter: 'drop-shadow(0 6px 18px rgba(201,150,42,0.5))' }}
    >
      <div className="bg-gradient-to-br from-gold to-[#A07418] text-cream font-black px-4 py-2 rounded-2xl shadow-2xl text-xl flex items-center gap-1.5 border-2 border-cream/40">
        <span className="text-2xl animate-bounceCoin">🪙</span>
        <span className="tabular-nums">+{amount}</span>
      </div>
    </div>
  )
}
