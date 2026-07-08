import { useState, useEffect } from 'react'

export default function TodayLoginsModal({ currentName, onClose }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = () => {
    setLoading(true)
    fetch('/api/login-stats')
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({ available: false, count: 0, names: [] }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const count = data?.count ?? 0
  const names = data?.names ?? []
  const date  = data?.date

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-cream w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">

        {/* Header */}
        <div className="nanyang-header px-5 py-4 flex items-center justify-between shrink-0">
          <div className="relative z-10">
            <p className="text-cream font-black text-xl leading-tight">🏫 今日登录</p>
            <p className="text-cream/55 text-xs mt-0.5">每日 0 点重置 · 全班共享</p>
          </div>
          <div className="relative z-10 flex items-center gap-1">
            <button
              onClick={refresh}
              disabled={loading}
              className="text-cream/70 hover:text-cream text-lg px-2 py-1 rounded disabled:opacity-40"
              title="刷新"
            >
              <span className={loading ? 'inline-block animate-spin' : ''}>⟳</span>
            </button>
            <button
              onClick={onClose}
              className="text-cream/70 hover:text-cream text-3xl leading-none w-8 h-8 flex items-center justify-center"
            >×</button>
          </div>
        </div>

        <div className="overflow-y-auto p-5 flex flex-col gap-4">

          {/* Big count */}
          <div className="relative rounded-2xl py-7 text-center overflow-hidden"
               style={{ background: 'radial-gradient(circle at 30% 30%, #FDF3E0 0%, #F0D9A8 70%, #E8C57E 100%)' }}>
            <span className="absolute top-3 left-6 text-gold/40 text-base">✦</span>
            <span className="absolute bottom-4 right-8 text-gold/40 text-base">✧</span>

            <p className="text-7xl font-black text-brick leading-none animate-charEnter relative z-10">
              {loading ? '…' : count}
            </p>
            <p className="text-brick/55 text-base mt-2 font-semibold relative z-10">
              位同学今天来过 🎉
            </p>
            {date && (
              <p className="text-brick/40 text-xs mt-1 relative z-10">{date}</p>
            )}
          </div>

          {/* Names list */}
          {data?.available && names.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-brick/45 font-bold mb-2 px-1">
                出席名单
              </p>
              <div className="flex flex-wrap gap-1.5">
                {names.map(n => (
                  <span
                    key={n}
                    className={`text-sm font-bold rounded-full px-3 py-1 border transition-all ${
                      n === currentName
                        ? 'bg-gold text-cream border-gold animate-pop'
                        : 'bg-cream-dark text-brick/75 border-brick/15'
                    }`}
                  >
                    {n === currentName && <span className="mr-0.5">👤</span>}
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Empty / disabled states */}
          {data && !data.available && (
            <div className="rounded-xl bg-brick/8 border border-brick/20 p-4 text-center">
              <p className="text-brick/70 text-sm">
                此功能尚未启用<br />
                <span className="text-brick/45 text-xs">需要管理员配置云端存储</span>
              </p>
            </div>
          )}

          {data?.available && names.length === 0 && !loading && (
            <p className="text-brick/40 text-sm text-center py-2">
              还没有同学登录哦，你是第一个！
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
