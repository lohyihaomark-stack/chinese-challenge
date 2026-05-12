import { useState, useEffect, useRef, useCallback } from 'react'
import storyData from '../data/story_xinxuexiao.json'
import { addCoins, getStoryProgress, saveEpisodeComplete } from '../utils/userStore'

/* ══════════════════════════════════════════════════════
   STATIC DATA
══════════════════════════════════════════════════════ */
const CHARS = {
  '赵宇':   { emoji: '😄', circleBg: 'bg-amber-200',  ring: 'border-amber-400',  nameBg: 'bg-amber-500',  shadow: 'shadow-amber-300' },
  '小敏':   { emoji: '🙋', circleBg: 'bg-teal-200',   ring: 'border-teal-400',   nameBg: 'bg-teal-600',   shadow: 'shadow-teal-300' },
  '陈静':   { emoji: '🤫', circleBg: 'bg-purple-200', ring: 'border-purple-400', nameBg: 'bg-purple-600', shadow: 'shadow-purple-300' },
  '陈老师': { emoji: '👨‍🏫', circleBg: 'bg-red-200',   ring: 'border-red-400',    nameBg: 'bg-red-700',    shadow: 'shadow-red-300' },
  '你':     { emoji: '🙋‍♂️', circleBg: 'bg-blue-200',  ring: 'border-blue-400',   nameBg: 'bg-blue-600',   shadow: 'shadow-blue-300' },
}

const SCENES = {
  morning:   { grad: 'from-orange-400 via-amber-300 to-yellow-200', emoji: '🌅', dim: false },
  classroom: { grad: 'from-amber-400 via-orange-300 to-yellow-300', emoji: '🏫', dim: false },
  corridor:  { grad: 'from-slate-400 via-gray-300 to-stone-300',    emoji: '🚪', dim: false },
  outdoor:   { grad: 'from-emerald-500 via-green-400 to-teal-300',  emoji: '🌳', dim: false },
  evening:   { grad: 'from-orange-600 via-amber-500 to-orange-400', emoji: '🌆', dim: false },
  sunset:    { grad: 'from-red-500 via-orange-500 to-amber-400',    emoji: '🌇', dim: false },
}
const scene_bg = (bg) => SCENES[bg] || SCENES.classroom

/* XP level helpers */
const LEVELS = [0, 200, 500, 1000, 1800, 3000, 5000]
function storyLevel(xp) {
  let lv = 1
  LEVELS.forEach((t, i) => { if (xp >= t) lv = i + 1 })
  return Math.min(lv, LEVELS.length)
}
function xpBar(xp) {
  const lv  = storyLevel(xp)
  const cur = LEVELS[lv - 1] || 0
  const nxt = LEVELS[lv]     || LEVELS[LEVELS.length - 1]
  return { pct: Math.round(((xp - cur) / (nxt - cur)) * 100), lv }
}

/* ══════════════════════════════════════════════════════
   STORY HUB
══════════════════════════════════════════════════════ */
function StoryHub({ progress, onPlay }) {
  const xp  = progress.storyXP  || 0
  const bar = xpBar(xp)
  const eps = progress.episodes || {}

  const unlockedUpTo = (() => {
    let max = 1
    storyData.episodes.forEach(ep => {
      if (eps[ep.id]?.completed) max = Math.min(ep.id + 1, storyData.episodes.length + 1)
    })
    return max
  })()

  return (
    <div className="flex-1 overflow-y-auto pb-6">
      {/* Banner */}
      <div className="nanyang-header px-5 py-6 text-center shrink-0">
        <p className="text-5xl mb-2 relative z-10">{storyData.emoji}</p>
        <h2 className="relative z-10 text-cream font-black text-2xl tracking-wide">{storyData.title}</h2>
        <p className="relative z-10 text-gold/80 text-sm mt-0.5">{storyData.tagline}</p>
      </div>

      {/* XP bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-cream rounded-xl p-3 border border-cream-dark shadow-sm flex items-center gap-3">
          <span className="text-2xl">📖</span>
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-brick font-black text-sm">故事等级 Lv.{bar.lv}</span>
              <span className="text-brick/50 text-xs">{xp} XP</span>
            </div>
            <div className="bg-cream-dark rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gold rounded-full transition-all duration-700" style={{ width: `${bar.pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Episode list */}
      <div className="px-4 flex flex-col gap-3 mt-1">
        {storyData.episodes.map(ep => {
          const done   = eps[ep.id]?.completed
          const stars  = eps[ep.id]?.stars || 0
          const locked = ep.id > unlockedUpTo
          const prevEp = storyData.episodes.find(e => e.id === ep.id - 1)
          const cliff  = prevEp?.scenes.find(s => s.id === `e${prevEp.id}end`)?.cliffhanger

          return (
            <div key={ep.id} className={`rounded-2xl border-2 overflow-hidden transition-all ${
              locked  ? 'border-brick/10 bg-cream/50 opacity-55' :
              done    ? 'border-nanyang-teal/40 bg-nanyang-teal/5 shadow-sm' :
                        'border-brick/30 bg-cream shadow-md'
            }`}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-brick/40 text-xs font-bold">第 {ep.id} 集</span>
                      {done && <span className="text-sm leading-none">{'⭐'.repeat(stars)}{'☆'.repeat(3-stars)}</span>}
                      {!done && !locked && <span className="bg-brick text-cream text-xs rounded-full px-2 py-0.5 font-bold">进行中</span>}
                    </div>
                    <h3 className={`font-black text-lg ${locked ? 'text-brick/25' : 'text-brick'}`}>
                      {locked ? '🔒 ' : ''}{ep.title}
                    </h3>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {ep.vocabFocus.map(v => (
                        <span key={v} className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          locked ? 'bg-brick/5 text-brick/20' : 'bg-gold/20 text-brick/70'
                        }`}>{v}</span>
                      ))}
                    </div>
                    {locked && cliff && (
                      <p className="text-xs text-brick/40 mt-2 italic leading-relaxed line-clamp-2">
                        {cliff.split('\n')[0]}
                      </p>
                    )}
                  </div>
                  {!locked && (
                    <button
                      onClick={() => onPlay(ep.id)}
                      className={`shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors ${
                        done ? 'bg-nanyang-teal/15 text-nanyang-teal border border-nanyang-teal/30 hover:bg-nanyang-teal/25'
                             : 'bg-brick text-cream hover:bg-brick-mid'
                      }`}
                    >
                      {done ? '重玩' : '开始 ▶'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Earn info */}
      <div className="mx-4 mt-4 rounded-xl bg-gold/10 border border-gold/30 p-3">
        <p className="text-brick font-bold text-sm mb-1.5">📖 故事奖励</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-brick/65">
          <span>✓ 词语答对</span>    <span className="font-bold text-brick">+5🪙 +20XP</span>
          <span>📖 完成一集</span>    <span className="font-bold text-brick">+30🪙 +80XP</span>
          <span>⭐⭐⭐ 三星</span> <span className="font-bold text-brick">+20🪙 +50XP</span>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   EPISODE COMPLETE
══════════════════════════════════════════════════════ */
function EpisodeComplete({ episode, score, attempts, relationships, onContinue }) {
  const wrong = attempts - score
  const stars = wrong === 0 ? 3 : wrong === 1 ? 2 : 1
  const pct   = attempts > 0 ? Math.round((score / attempts) * 100) : 100
  const endSc = episode.scenes.find(s => s.type === 'episode_end')
  const coins = 30 + (stars === 3 ? 20 : 0)
  const xp    = 80  + (stars === 3 ? 50 : 0)
  const isLast = episode.id === storyData.episodes.length
  const NPC   = { zhaoyou: '赵宇', xiaomin: '小敏', chenjing: '陈静' }

  useEffect(() => {
    addCoins(coins)
    saveEpisodeComplete('xinxuexiao', episode.id, stars, xp)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="nanyang-header px-5 py-6 text-center">
        <p className="relative z-10 text-6xl mb-2 animate-pop">{stars===3?'🌟':stars===2?'⭐':'📖'}</p>
        <h2 className="relative z-10 text-cream font-black text-2xl">第 {episode.id} 集完成！</h2>
        <p className="relative z-10 text-gold text-xl mt-1">{'⭐'.repeat(stars)}{'☆'.repeat(3-stars)}</p>
      </div>

      <div className="px-4 py-5 flex flex-col gap-4">
        {endSc?.text && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-brick/80 text-sm leading-relaxed whitespace-pre-line">{endSc.text}</p>
          </div>
        )}

        <div className="bg-cream rounded-xl border border-cream-dark p-4">
          <p className="text-brick/40 text-xs font-bold uppercase tracking-wider mb-3">本集成绩</p>
          <div className="flex items-center justify-between text-center">
            <div><p className="text-3xl font-black text-brick">{score}<span className="text-sm font-normal text-brick/40">/{attempts}</span></p><p className="text-xs text-brick/50 mt-0.5">答对</p></div>
            <div><p className="text-3xl font-black text-brick">{pct}%</p><p className="text-xs text-brick/50 mt-0.5">命中率</p></div>
            <div><p className="text-3xl font-black text-nanyang-teal">+{coins}</p><p className="text-xs text-brick/50 mt-0.5">词币 🪙</p></div>
          </div>
        </div>

        <div className="bg-cream rounded-xl border border-cream-dark p-4">
          <p className="text-brick/40 text-xs font-bold uppercase tracking-wider mb-2">本集词语</p>
          <div className="flex flex-wrap gap-2">
            {episode.vocabFocus.map(v => (
              <span key={v} className="bg-gold/20 text-brick font-bold text-sm px-3 py-1 rounded-full">✓ {v}</span>
            ))}
          </div>
        </div>

        {Object.entries(relationships).filter(([,v])=>v>0).length > 0 && (
          <div className="bg-cream rounded-xl border border-cream-dark p-4">
            <p className="text-brick/40 text-xs font-bold uppercase tracking-wider mb-3">好感度</p>
            {Object.entries(relationships).filter(([,v])=>v>0).map(([npc, delta]) => (
              <div key={npc} className="flex items-center gap-3 mb-2 last:mb-0">
                <span className="text-brick font-bold text-sm w-12">{NPC[npc]||npc}</span>
                <div className="flex-1 bg-cream-dark rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-nanyang-teal rounded-full" style={{width:`${Math.min(delta*2.5,100)}%`}}/>
                </div>
                <span className="text-nanyang-teal font-bold text-xs w-6 text-right">+{delta}</span>
              </div>
            ))}
          </div>
        )}

        {endSc?.cliffhanger && (
          <div className={`rounded-2xl p-4 border-2 ${isLast?'bg-gold/10 border-gold/40':'bg-black/5 border-brick/20'}`}>
            <p className="text-brick/40 text-xs font-bold uppercase tracking-wider mb-2">
              {isLast ? '未完待续…' : '下集预告 🔮'}
            </p>
            <p className="text-brick text-sm leading-relaxed whitespace-pre-line italic">{endSc.cliffhanger}</p>
          </div>
        )}

        <button onClick={onContinue} className="w-full py-4 rounded-xl font-black text-lg bg-brick text-cream hover:bg-brick-mid transition-colors shadow-md">
          返回故事列表 📖
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   CHARACTER PORTRAIT
══════════════════════════════════════════════════════ */
function CharPortrait({ name, size = 'lg' }) {
  const c = CHARS[name]
  if (!c) return null
  const sz  = size === 'lg' ? 'w-24 h-24 text-5xl' : 'w-16 h-16 text-3xl'
  const nsz = size === 'lg' ? 'text-sm mt-2' : 'text-xs mt-1'
  return (
    <div key={name} className="flex flex-col items-center animate-charEnter">
      <div className={`${sz} rounded-full ${c.circleBg} border-4 ${c.ring} flex items-center justify-center shadow-xl ${c.shadow}`}>
        <span role="img">{c.emoji}</span>
      </div>
      <span className={`${nsz} text-white/90 font-black drop-shadow`}>{name}</span>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   VISUAL NOVEL PLAYER
══════════════════════════════════════════════════════ */
function StoryPlayer({ episode, onComplete }) {
  const allScenes    = episode.scenes
  const playScenes   = allScenes.filter(s => s.type !== 'episode_end')

  const [sceneId,       setSceneId]      = useState(playScenes[0]?.id)
  const [displayed,     setDisplayed]    = useState('')
  const [textDone,      setTextDone]     = useState(false)
  const [choicePicked,  setChoicePicked] = useState(null)   // chosen choice obj
  const [vocabResult,   setVocabResult]  = useState(null)   // {correct, chosen}
  const [pendingNext,   setPendingNext]  = useState(null)
  const [score,         setScore]        = useState(0)
  const [attempts,      setAttempts]     = useState(0)
  const [relationships, setRelations]    = useState({})
  const [flashAnim,     setFlashAnim]    = useState(null)   // 'green'|'red'|null

  const timerRef = useRef(null)
  const scene    = playScenes.find(s => s.id === sceneId)

  /* ── get the main text for a scene ── */
  const getMainText = useCallback((sc) => {
    if (!sc) return ''
    if (sc.type === 'narration' || sc.type === 'dialogue') return sc.text || ''
    if (sc.type === 'choice')    return sc.setup || ''
    return ''
  }, [])

  /* ── typewriter effect ── */
  useEffect(() => {
    clearInterval(timerRef.current)
    setDisplayed('')
    setTextDone(false)
    setChoicePicked(null)
    setVocabResult(null)
    setPendingNext(null)
    setFlashAnim(null)

    if (!scene) return

    // No typewriter for vocab_fill or choice (instant)
    if (scene.type === 'vocab_fill' || scene.type === 'choice' || scene.type === 'episode_end') {
      setTextDone(true)
      return
    }

    const full = getMainText(scene)
    if (!full) { setTextDone(true); return }

    let i = 0
    timerRef.current = setInterval(() => {
      i++
      setDisplayed(full.slice(0, i))
      if (i >= full.length) { clearInterval(timerRef.current); setTextDone(true) }
    }, 28)
    return () => clearInterval(timerRef.current)
  }, [sceneId]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── advance to next scene ── */
  const advanceTo = (nextId) => {
    clearInterval(timerRef.current)
    if (!nextId || !playScenes.find(s => s.id === nextId)) {
      setSceneId('__done__')
    } else {
      setSceneId(nextId)
    }
  }

  /* ── tap scene area (skip/advance for narration+dialogue) ── */
  const handleSceneTap = () => {
    if (!scene) return
    if (scene.type !== 'narration' && scene.type !== 'dialogue') return
    if (!textDone) {
      // Skip animation
      clearInterval(timerRef.current)
      setDisplayed(getMainText(scene))
      setTextDone(true)
    } else if (pendingNext !== null) {
      advanceTo(pendingNext)
    } else if (scene.next) {
      advanceTo(scene.next)
    }
  }

  /* ── choice handler ── */
  const handleChoice = (choice) => {
    if (choicePicked) return
    if (choice.rel) {
      setRelations(prev => {
        const n = { ...prev }
        Object.entries(choice.rel).forEach(([k, v]) => { n[k] = (n[k] || 0) + v })
        return n
      })
    }
    setChoicePicked(choice)
    setPendingNext(choice.next)
  }

  /* ── vocab answer handler ── */
  const handleVocabAnswer = (opt) => {
    if (vocabResult) return
    const correct = opt === scene.blank
    if (correct) { addCoins(5); setScore(s => s + 1) }
    setAttempts(a => a + 1)
    setVocabResult({ correct, chosen: opt })
    setPendingNext(correct ? scene.correct_next : scene.wrong_next)
    setFlashAnim(correct ? 'green' : 'red')
    setTimeout(() => setFlashAnim(null), 500)
  }

  /* ── episode complete ── */
  if (!scene || sceneId === '__done__') {
    return (
      <EpisodeComplete
        episode={episode}
        score={score}
        attempts={attempts}
        relationships={relationships}
        onContinue={onComplete}
      />
    )
  }

  const bg    = scene_bg(scene.bg)
  const char  = CHARS[scene.speaker] ? scene.speaker : null
  const scIdx = playScenes.indexOf(scene)
  const progPct = ((scIdx + 1) / playScenes.length) * 100

  /* ── option class for vocab ── */
  const optClass = (opt) => {
    const base = 'flex-1 min-w-[calc(50%-6px)] px-4 py-3.5 rounded-2xl border-2 font-black text-lg transition-all duration-150 text-center'
    if (!vocabResult) return `${base} bg-white/15 border-white/30 text-white hover:bg-white/25 hover:border-white/60 cursor-pointer backdrop-blur-sm`
    if (opt === scene.blank) return `${base} bg-nanyang-teal border-nanyang-teal text-white cursor-default`
    if (opt === vocabResult.chosen && !vocabResult.correct) return `${base} bg-brick/80 border-brick text-white animate-shake cursor-default`
    return `${base} bg-white/5 border-white/10 text-white/25 cursor-default`
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ════════════════════ SCENE AREA ════════════════════ */}
      <div
        className={`relative flex-1 min-h-0 bg-gradient-to-b ${bg.grad} flex flex-col items-center justify-end pb-4 cursor-pointer select-none overflow-hidden
          ${flashAnim === 'green' ? 'animate-flashGreen' : ''}
          ${flashAnim === 'red'   ? 'animate-flashRed'   : ''}`}
        onClick={handleSceneTap}
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/20">
          <div className="h-full bg-white/60 transition-all duration-500" style={{ width: `${progPct}%` }} />
        </div>

        {/* Top bar: back + episode info */}
        <div className="absolute top-2 left-0 right-0 px-4 flex items-center justify-between z-10">
          <button
            className="text-white/80 text-sm font-bold bg-black/25 backdrop-blur-sm rounded-full px-3 py-1.5 hover:bg-black/40"
            onClick={e => { e.stopPropagation(); onComplete('back') }}
          >
            ← 返回
          </button>
          <span className="text-white/70 text-xs font-bold bg-black/20 backdrop-blur-sm rounded-full px-3 py-1">
            {episode.id}集 · {scene.type === 'vocab_fill' ? '❓词语' : `${scIdx+1}/${playScenes.length}`}
          </span>
        </div>

        {/* Large scene emoji (background decoration) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[120px] opacity-20 select-none">{bg.emoji}</span>
        </div>

        {/* Character portrait */}
        {char ? (
          <CharPortrait key={`${sceneId}-${char}`} name={char} size="lg" />
        ) : scene.type === 'choice' ? (
          <div className="animate-charEnter flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/50 flex items-center justify-center text-4xl shadow-xl backdrop-blur-sm">
              💭
            </div>
            <span className="text-sm mt-2 text-white/80 font-bold drop-shadow">做出选择</span>
          </div>
        ) : (
          <div className="animate-fadeIn flex flex-col items-center">
            <span className="text-6xl opacity-60 drop-shadow-lg">{bg.emoji}</span>
          </div>
        )}

        {/* Tap hint (narration/dialogue only) */}
        {(scene.type === 'narration' || scene.type === 'dialogue') && textDone && !pendingNext && scene.next && (
          <div className="absolute bottom-2 right-4 text-white/50 text-xs animate-pulse2 font-bold">
            点击继续 ▶
          </div>
        )}
      </div>

      {/* ════════════════════ DIALOGUE PANEL ════════════════════ */}
      <div className="shrink-0 bg-[#12060060]/[0.97] backdrop-blur-md" style={{ minHeight: '44%', background: 'rgba(18,6,0,0.97)' }}>

        {/* NARRATION */}
        {scene.type === 'narration' && (
          <div className="px-5 py-4 h-full flex flex-col justify-between" onClick={handleSceneTap}>
            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest mb-2 font-bold">旁白</p>
              <p className="text-white/95 text-base leading-relaxed whitespace-pre-line">
                {displayed}
                {!textDone && <span className="animate-pulse2 text-gold">▌</span>}
              </p>
            </div>
            {textDone && (
              <p className="text-white/30 text-xs text-right mt-2 font-bold animate-pulse2">点击继续 ▶</p>
            )}
          </div>
        )}

        {/* DIALOGUE */}
        {scene.type === 'dialogue' && (
          <div className="px-5 py-4 h-full flex flex-col justify-between" onClick={handleSceneTap}>
            <div>
              {scene.speaker && (
                <div className="mb-3">
                  <span className={`text-sm font-black px-3 py-1 rounded-full text-white ${CHARS[scene.speaker]?.nameBg || 'bg-brick'}`}>
                    {scene.speaker}
                  </span>
                </div>
              )}
              <p className="text-white/95 text-base leading-relaxed whitespace-pre-line">
                {displayed}
                {!textDone && <span className="animate-pulse2 text-gold">▌</span>}
              </p>
            </div>
            {textDone && (
              <p className="text-white/30 text-xs text-right mt-2 font-bold animate-pulse2">点击继续 ▶</p>
            )}
          </div>
        )}

        {/* CHOICE */}
        {scene.type === 'choice' && (
          <div className="px-4 py-3 flex flex-col gap-2 justify-center h-full">
            <p className="text-white/60 text-sm leading-snug whitespace-pre-line mb-1">{scene.setup}</p>

            {!choicePicked ? (
              <div className="flex flex-col gap-2">
                {scene.choices.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => handleChoice(c)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-white/25 bg-white/10 text-white font-semibold text-sm leading-snug hover:bg-white/20 hover:border-white/50 transition-all animate-slideUp backdrop-blur-sm"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    {c.text}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="bg-nanyang-teal/20 border border-nanyang-teal/50 rounded-xl px-4 py-3 animate-fadeIn">
                  <p className="text-nanyang-teal text-sm leading-relaxed whitespace-pre-line">{choicePicked.feedback}</p>
                </div>
                <button
                  onClick={() => advanceTo(pendingNext)}
                  className="w-full py-3 rounded-xl bg-white/15 border border-white/30 text-white font-bold text-sm hover:bg-white/25 transition-colors"
                >
                  继续 →
                </button>
              </div>
            )}
          </div>
        )}

        {/* VOCAB FILL */}
        {scene.type === 'vocab_fill' && (
          <div className="px-4 py-3 flex flex-col gap-3 h-full justify-between">
            <div>
              {scene.speaker && (
                <div className="mb-2">
                  <span className={`text-xs font-black px-3 py-1 rounded-full text-white ${CHARS[scene.speaker]?.nameBg || 'bg-brick'}`}>
                    {scene.speaker}
                  </span>
                </div>
              )}
              {!scene.speaker && (
                <p className="text-white/40 text-xs uppercase tracking-widest mb-2 font-bold">旁白</p>
              )}
              <p className="text-white/95 text-base leading-relaxed whitespace-pre-line">
                {scene.before}
                <span className={`inline-block mx-1 px-3 py-0.5 rounded-lg font-black align-middle transition-all ${
                  vocabResult
                    ? vocabResult.correct
                      ? 'bg-nanyang-teal text-white'
                      : 'bg-brick-mid text-white'
                    : 'bg-white/15 text-white/40 border border-dashed border-white/30 min-w-[3em] text-center'
                }`}>
                  {vocabResult ? scene.blank : '___'}
                </span>
                {scene.after}
              </p>

              {vocabResult && (
                <div className={`mt-2 rounded-xl px-3 py-2 border animate-fadeIn ${
                  vocabResult.correct
                    ? 'bg-nanyang-teal/15 border-nanyang-teal/50'
                    : 'bg-brick/15 border-brick/50'
                }`}>
                  <p className={`text-sm font-bold ${vocabResult.correct ? 'text-nanyang-teal' : 'text-brick-light'}`}>
                    {vocabResult.correct ? '✓ 答对了！' : `✗ 正确答案：「${scene.blank}」`}
                  </p>
                  {scene.correction && (
                    <p className="text-white/65 text-xs mt-0.5 leading-relaxed">{scene.correction}</p>
                  )}
                </div>
              )}
            </div>

            {/* Options */}
            {!vocabResult ? (
              <div className="flex flex-wrap gap-2">
                {scene.options.map((opt, i) => (
                  <button
                    key={opt}
                    onClick={() => handleVocabAnswer(opt)}
                    className={`${optClass(opt)} animate-slideUp`}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <button
                onClick={() => advanceTo(pendingNext)}
                className="w-full py-3 rounded-xl bg-white/15 border border-white/30 text-white font-bold text-sm hover:bg-white/25 transition-colors"
              >
                继续 →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════ */
export default function StoryAdventure() {
  const [screen,      setScreen]    = useState('hub')
  const [activeEpId,  setActiveEpId] = useState(null)
  const [progress,    setProgress]  = useState(() => getStoryProgress('xinxuexiao'))

  const handlePlay = (epId) => { setActiveEpId(epId); setScreen('playing') }

  const handleDone = (flag) => {
    setProgress(getStoryProgress('xinxuexiao'))
    setScreen('hub')
    setActiveEpId(null)
  }

  const activeEp = storyData.episodes.find(ep => ep.id === activeEpId)

  if (screen === 'playing' && activeEp) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <StoryPlayer key={activeEpId} episode={activeEp} onComplete={handleDone} />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <StoryHub progress={progress} onPlay={handlePlay} />
    </div>
  )
}
