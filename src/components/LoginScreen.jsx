import { useState } from 'react'

export default function LoginScreen({ onLogin }) {
  const [name,  setName]  = useState('')
  const [error, setError] = useState('')

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('请输入你的名字')
      return
    }
    if (trimmed.length > 20) {
      setError('名字太长啦，最多 20 个字')
      return
    }
    onLogin(trimmed)
  }

  return (
    <div className="nanyang-bg min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">

        {/* Header banner */}
        <div className="nanyang-header w-full rounded-2xl py-8 px-6 text-center shadow-xl">
          <p className="text-gold text-sm tracking-widest mb-1">✦ 华文词汇学习 ✦</p>
          <h1
            className="text-3xl font-black text-cream"
            style={{ letterSpacing: '0.12em' }}
          >
            中一词语宝典
          </h1>
        </div>

        {/* Login card */}
        <div className="tile-card w-full">
          <div className="relative z-10 p-6 flex flex-col gap-4">
            <h2 className="text-2xl font-black text-brick text-center">学生登录</h2>
            <p className="text-brick/55 text-base text-center leading-relaxed">
              输入你的名字就可以开始学习。
              <br />每次用<strong>相同名字</strong>登录，记录不会丢失。
            </p>

            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="请输入你的名字"
              className="w-full px-4 py-3 rounded-xl border-2 border-brick-mid/40 bg-cream-dark text-brick text-xl font-bold text-center focus:outline-none focus:border-brick transition-colors"
              maxLength={20}
              autoFocus
            />

            {error && (
              <p className="text-brick text-base text-center font-semibold">{error}</p>
            )}

            <button
              onClick={submit}
              className="w-full bg-brick text-cream py-3 rounded-xl font-bold text-xl hover:bg-brick-mid transition-colors shadow-md"
            >
              开始学习 📚
            </button>
          </div>
        </div>

        <p className="text-brick/30 text-sm text-center">
          学习记录保存在本设备上
        </p>
      </div>
    </div>
  )
}
