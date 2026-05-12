import { useState, useRef, useEffect, useMemo } from 'react'
import { addCoins } from '../utils/userStore'

/* ── Detect if message is mostly English ─────────────── */
function isEnglish(text) {
  const letters = (text.match(/[a-zA-Z]/g) || []).length
  const cjk     = (text.match(/[一-鿿]/g) || []).length
  return letters > cjk && letters > 3
}

/* ── Pick a proactive hook from unit vocab ───────────── */
function getUnitHook(unit) {
  if (!unit?.vocabs?.length) return null
  const words = [...unit.vocabs].sort(() => Math.random() - 0.5)
  const w1 = words[0], w2 = words[1]
  const templates = [
    {
      text: `「${w1.hanzi}」和「${w2.hanzi}」，你知道它们有什么区别吗？`,
      prompt: `请解释「${w1.hanzi}」和「${w2.hanzi}」的区别，什么时候用哪个？`,
    },
    {
      text: `嗨！「${w1.hanzi}」这个词你掌握了吗？`,
      prompt: `请详细讲解「${w1.hanzi}」的用法，并给我三个例句。`,
    },
    {
      text: `「${w1.hanzi}」在生活中可以怎么用？`,
      prompt: `「${w1.hanzi}」在日常生活中有哪些常见用法和场景？举例说明。`,
    },
  ]
  return templates[Math.floor(Math.random() * templates.length)]
}

/* ── System prompt ───────────────────────────────────── */
function buildSystemPrompt(allUnits, studentName) {
  const lines = allUnits.flatMap(unit =>
    unit.vocabs.map(v =>
      `${v.hanzi}（${v.pinyin}）：${v.definition}；搭配：${v.collocations.join('、')}；例：${v.example}`
    )
  )
  return `你是"词语老师"，一位专门帮助新加坡中一学生学习华文词汇的AI助手。学生叫${studentName}。

你熟悉学生正在学习的全部 ${lines.length} 个词汇（共三个单元）：
${lines.join('\n')}

你的能力：
• 解释词语的意思、用法和语境细节
• 出填空题、选择题或造句题来测验学生，出题后等学生作答再公布答案
• 分析近义词之间的微妙区别
• 提供更多贴近生活的例句
• 给出记忆词语的方法（联想、拆字、故事记忆等）
• 学生发来句子时，帮他检查用词是否正确
• 根据学生的回答给予鼓励或纠正

回答风格：
• 主要用中文，必要时可加英文注释帮助理解
• 语气像一位耐心、亲切的老师
• 回答适中，不要太长，每次聚焦一件事
• 出题时绝对不要马上给答案，要等学生作答
• 绝对不要使用任何markdown格式，不要用**加粗**、不要用*斜体*、不要用#标题，直接用普通文字`
}

/* ── Typing dots ─────────────────────────────────────── */
function TypingDots() {
  return (
    <span className="flex items-center gap-1.5 py-0.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2.5 h-2.5 rounded-full bg-brick/40 animate-pulse2"
          style={{ animationDelay: `${i * 180}ms` }}
        />
      ))}
    </span>
  )
}

/* ══ Main component ══════════════════════════════════════ */
export default function ChatBot({ allUnits, studentName, currentUnitIndex }) {
  const [open,        setOpen]        = useState(false)
  const [messages,    setMessages]    = useState([])
  const [input,       setInput]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [apiError,    setApiError]    = useState(null)
  const [bubble,      setBubble]      = useState(null)       // { text, prompt }
  const [duel,        setDuel]        = useState(null)       // { word, pinyin, definition, timeLeft }
  const [englishMsgs, setEnglishMsgs] = useState(new Set()) // message indices typed in English

  const bottomRef    = useRef(null)
  const inputRef     = useRef(null)
  const isFirstMount = useRef(true)
  const bubbleTimers = useRef([])

  const systemPrompt = useMemo(
    () => buildSystemPrompt(allUnits, studentName),
    [allUnits, studentName]
  )

  /* ── Scroll to latest message ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* ── Focus input when panel opens ── */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  /* ── Proactive bubble on unit switch ── */
  useEffect(() => {
    // Skip initial mount
    if (isFirstMount.current) { isFirstMount.current = false; return }
    if (open) return

    // Clear any pending bubble timers
    bubbleTimers.current.forEach(clearTimeout)
    setBubble(null)

    const hook = getUnitHook(allUnits[currentUnitIndex])
    if (!hook) return

    // Small delay so unit transition animation finishes first
    const t1 = setTimeout(() => {
      setBubble(hook)
      const t2 = setTimeout(() => setBubble(null), 7000)
      bubbleTimers.current = [t2]
    }, 1000)

    bubbleTimers.current = [t1]
    return () => bubbleTimers.current.forEach(clearTimeout)
  }, [currentUnitIndex])

  /* ── Quick Duel countdown ── */
  useEffect(() => {
    if (!duel) return
    if (duel.timeLeft <= 0) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `时间到！正确答案是「${duel.word}」（${duel.pinyin}）。\n意思是：${duel.definition}\n\n再来一局？`,
        },
      ])
      setDuel(null)
      return
    }
    const t = setTimeout(
      () => setDuel(prev => (prev ? { ...prev, timeLeft: prev.timeLeft - 1 } : null)),
      1000
    )
    return () => clearTimeout(t)
  }, [duel])

  /* ── Start Quick Duel ── */
  const startDuel = () => {
    if (loading || duel) return
    const unit = allUnits[currentUnitIndex]
    if (!unit?.vocabs?.length) return
    const vocab = unit.vocabs[Math.floor(Math.random() * unit.vocabs.length)]
    setDuel({ word: vocab.hanzi, pinyin: vocab.pinyin, definition: vocab.definition, timeLeft: 15 })
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: `⚡ 急速对决！\n\n释义：${vocab.definition}\n\n你有15秒钟！这是哪个词？`,
        isDuel: true,
      },
    ])
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  /* ── Submit duel answer (called from sendMessage) ── */
  const submitDuelAnswer = (text) => {
    if (!duel) return false
    const correct = text.trim() === duel.word
    if (correct) {
      addCoins(8)
      setMessages(prev => [
        ...prev,
        { role: 'user', content: text.trim() },
        { role: 'assistant', content: `答对了！「${duel.word}」！你获得了 +8 🪙 继续加油！` },
      ])
    } else {
      setMessages(prev => [
        ...prev,
        { role: 'user', content: text.trim() },
        { role: 'assistant', content: `答错了，正确答案是「${duel.word}」（${duel.pinyin}）。\n意思是：${duel.definition}` },
      ])
    }
    setDuel(null)
    return true
  }

  /* ── Send message ── */
  const sendMessage = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    // Duel intercept
    if (duel) {
      submitDuelAnswer(trimmed)
      setInput('')
      return
    }

    setInput('')
    setApiError(null)

    // English detection → block, +5 coins as nudge, no API call
    const english = isEnglish(trimmed)
    const msgIdx  = messages.length
    if (english) {
      addCoins(5)
      setEnglishMsgs(prev => new Set([...prev, msgIdx]))
      setMessages(prev => [
        ...prev,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: '请用中文提问！用中文问我可以获得 +5 🪙 哦，加油！' },
      ])
      return
    }

    const userMsg = { role: 'user', content: trimmed }
    const history = [...messages, userMsg]
    setMessages([...history, { role: 'assistant', content: '', streaming: true }])
    setLoading(true)

    const apiHistory = history.map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiHistory, systemPrompt }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.error === 'NO_API_KEY') setApiError('no_key')
        else throw new Error(data.error || 'Request failed')
        setMessages(prev => prev.slice(0, -1))
        return
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''
      let assembled = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') break
          try {
            const chunk = JSON.parse(payload)
            if (chunk.text) {
              assembled += chunk.text
              setMessages(prev => {
                const u = [...prev]
                u[u.length - 1] = { role: 'assistant', content: assembled, streaming: true }
                return u
              })
            }
          } catch { /* skip */ }
        }
      }

      setMessages(prev => {
        const u = [...prev]
        u[u.length - 1] = { role: 'assistant', content: assembled }
        return u
      })
    } catch (err) {
      console.error(err)
      setMessages(prev => {
        const u = [...prev]
        u[u.length - 1] = { role: 'assistant', content: '抱歉，连接失败。请检查网络后重试。' }
        return u
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  /* ════════════════════════════════════════════════════════ */
  return (
    <>
      {/* ── Proactive speech bubble ───────────────────────── */}
      {bubble && !open && (
        <div className="fixed bottom-24 right-4 z-40 max-w-[210px] bg-cream border-2 border-brick rounded-2xl rounded-br-sm px-4 py-3 shadow-xl animate-slideUp">
          <button
            onClick={() => setBubble(null)}
            className="absolute top-1 right-2 text-brick/35 hover:text-brick/60 text-xl leading-none"
          >×</button>
          <p className="text-brick text-sm leading-snug pr-4">{bubble.text}</p>
          <button
            onClick={() => {
              setBubble(null)
              setOpen(true)
              setTimeout(() => sendMessage(bubble.prompt), 200)
            }}
            className="mt-2 text-xs font-black text-nanyang-teal hover:underline"
          >
            问问词语老师 →
          </button>
        </div>
      )}

      {/* ── Floating trigger button ───────────────────────── */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setBubble(null) }}
          className="fixed bottom-6 right-4 z-40 bg-brick hover:bg-brick-mid text-cream rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-2 transition-colors animate-fadeIn"
        >
          <span className="text-2xl leading-none">📚</span>
          <div className="text-left">
            <p className="font-black text-base leading-tight">词语老师</p>
            <p className="text-cream/65 text-xs leading-tight">AI 词汇助手</p>
          </div>
        </button>
      )}

      {/* ── Chat panel ────────────────────────────────────── */}
      {open && (
        <div className="fixed bottom-0 right-0 z-50 flex flex-col
                        w-full sm:w-[420px] h-[88dvh] sm:h-[600px]
                        sm:bottom-4 sm:right-4
                        bg-cream rounded-t-3xl sm:rounded-2xl
                        shadow-2xl border border-cream-dark overflow-hidden animate-slideUp">

          {/* Header */}
          <div className="nanyang-header px-5 py-3.5 flex items-center justify-between shrink-0">
            <div className="relative z-10 flex items-center gap-3">
              <span className="text-3xl leading-none">📚</span>
              <div>
                <p className="text-cream font-black text-lg leading-tight">词语老师</p>
                <p className="text-cream/60 text-sm">
                  {loading ? '正在思考…' : 'AI 词汇助手 · 随时提问'}
                </p>
              </div>
            </div>
            <div className="relative z-10 flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => { setMessages([]); setDuel(null); setEnglishMsgs(new Set()) }}
                  className="text-cream/50 hover:text-cream text-sm px-2 py-1 rounded-lg transition-colors"
                >清空</button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-cream/70 hover:text-cream text-4xl leading-none w-9 h-9 flex items-center justify-center pb-1"
              >×</button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

            {/* Welcome */}
            {messages.length === 0 && (
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-brick flex items-center justify-center text-lg shrink-0 shadow">📚</div>
                <div className="bg-cream-dark rounded-2xl rounded-tl-sm px-4 py-3 max-w-[88%] shadow-sm">
                  <p className="text-brick text-base leading-relaxed">你好，<strong>{studentName}</strong>！我是你的词语老师 🎉</p>
                  <p className="text-brick/70 text-base leading-relaxed mt-2">我认识你正在学习的所有词汇。有任何问题尽管问我吧！</p>
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-9 h-9 rounded-full bg-brick flex items-center justify-center text-lg shrink-0 shadow self-end">📚</div>
                )}
                <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>
                  <div className={`rounded-2xl px-4 py-3 shadow-sm text-base leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-brick text-cream rounded-tr-sm'
                      : 'bg-cream-dark text-brick rounded-tl-sm'
                  }`}>
                    {msg.content
                      ? msg.content.replace(/\*\*/g, '').replace(/\*/g, '')
                      : (msg.streaming && loading && i === messages.length - 1)
                        ? <TypingDots />
                        : null}
                  </div>
                  {/* English correction badge */}
                  {msg.role === 'user' && englishMsgs.has(i) && (
                    <p className="text-xs text-gold font-semibold mt-1 pr-1">+5 🪙 下次试试用中文哦！</p>
                  )}
                </div>
              </div>
            ))}

            <div ref={bottomRef} />
          </div>

          {/* Duel countdown bar */}
          {duel && (
            <div className="px-4 py-2.5 bg-brick/8 border-t border-brick/20 shrink-0 flex items-center justify-between">
              <span className="text-brick font-bold text-sm">⚡ 快输入词语！</span>
              <span className={`font-black text-2xl tabular-nums ${
                duel.timeLeft <= 5 ? 'text-brick animate-pulse2' : 'text-nanyang-teal'
              }`}>
                {duel.timeLeft}s
              </span>
            </div>
          )}

          {/* API key error */}
          {apiError === 'no_key' && (
            <div className="mx-4 mb-2 bg-brick/8 border border-brick/25 rounded-xl px-4 py-3 text-brick/80 text-sm shrink-0">
              ⚠️ 请在 Vercel 控制台设置 <code className="bg-brick/10 px-1 rounded">GEMINI_API_KEY</code> 环境变量后重新部署。
            </div>
          )}

          {/* Input row */}
          <div className="px-4 py-3 border-t border-cream-dark shrink-0 flex flex-col gap-2">

            {/* Quick Duel trigger */}
            {!duel && !loading && (
              <button
                onClick={startDuel}
                className="self-start flex items-center gap-1.5 text-sm font-bold text-brick/55 hover:text-brick border border-brick/25 hover:border-brick/60 rounded-full px-3 py-1 transition-colors"
              >
                ⚡ 急速对决
              </button>
            )}

            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                }}
                onKeyDown={handleKeyDown}
                placeholder={duel ? '输入词语… （15秒内！）' : '问我任何关于词汇的问题…'}
                disabled={loading && !duel}
                className="flex-1 bg-cream-dark rounded-xl px-4 py-2.5 text-brick text-base
                           outline-none border-2 border-transparent focus:border-brick/30
                           placeholder-brick/30 disabled:opacity-50 resize-none overflow-hidden leading-snug"
                style={{ minHeight: '44px' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || (loading && !duel)}
                className="bg-brick hover:bg-brick-mid disabled:opacity-40 text-cream
                           w-11 h-11 rounded-xl flex items-center justify-center
                           text-xl transition-colors shrink-0 shadow"
              >↑</button>
            </div>
          </div>

        </div>
      )}
    </>
  )
}
