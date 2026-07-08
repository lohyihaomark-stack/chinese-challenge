import { useState, useEffect, useCallback, useMemo } from 'react'
import unit1 from '../data/unit1.json'
import unit2 from '../data/unit2.json'
import unit3 from '../data/unit3.json'
import unit4 from '../data/unit4.json'
import unit5 from '../data/unit5.json'
import unit6 from '../data/unit6.json'
import { getLevelInfo } from '../utils/userStore'

const ALL_UNITS   = [unit1, unit2, unit3, unit4, unit5, unit6]
const UNIT_LABELS = ['一','二','三','四','五','六']
const UNIT_HEX    = ['#00d4ff','#9b5de5','#06d6a0','#ff6b35','#f72585','#ffd60a']

/* flat vocab lookup: vocabId → { hanzi, pinyin, definition, unitNum, unitTitle } */
const VOCAB_MAP = {}
ALL_UNITS.forEach((unit, i) => {
  unit.vocabs.forEach(v => {
    VOCAB_MAP[String(v.id)] = { ...v, unitNum: i + 1, unitTitle: unit.title }
  })
})

const ACH_DEF = [
  { id: 'first_login',  emoji: '🌟', label: '初次登录',   desc: '欢迎加入' },
  { id: 'streak3',      emoji: '🔥', label: '三日坚持',   desc: '连续 3 天' },
  { id: 'streak7',      emoji: '🔥', label: '一周勤学',   desc: '连续 7 天' },
  { id: 'streak30',     emoji: '💎', label: '月度冠军',   desc: '连续 30 天' },
  { id: 'boss_clear',   emoji: '⚔️',  label: '初战告捷',   desc: '首通关卡' },
  { id: 'boss_all',     emoji: '🏆', label: '三界征服者', desc: '三单元通关' },
  { id: 'boss_perfect', emoji: '🛡️',  label: '无伤英雄',   desc: '无伤通关' },
  { id: 'match_ace',    emoji: '🧩', label: '配对达人',   desc: '配对≥90%' },
]

/* ── utils ── */
function daysAgo(ts) { if (!ts) return 999; return Math.floor((Date.now() - ts) / 86400000) }
function fmtDate(ts) { if (!ts) return '—'; return new Date(ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) }
function fmtRelative(ts) {
  if (!ts) return '从未'
  const d = daysAgo(ts)
  if (d === 0) return '今天'; if (d === 1) return '昨天'; if (d <= 6) return `${d} 天前`
  return fmtDate(ts)
}

function computeMasteryRate(student) {
  let seen = 0, correct = 0
  Object.values(student.wordMastery || {}).forEach(um => {
    Object.values(um).forEach(m => { seen += m.seen || 0; correct += m.correct || 0 })
  })
  return seen > 0 ? Math.round((correct / seen) * 100) : null
}

function computeEngagement(student) {
  const da = daysAgo(student.lastSeen)
  const recency = da === 0 ? 1 : da === 1 ? 0.75 : da <= 3 ? 0.5 : da <= 7 ? 0.25 : 0
  const streakF  = Math.min((student.streak || 1) / 14, 1)
  const mr = computeMasteryRate(student)
  const masteryF = mr !== null ? mr / 100 : 0.5
  return Math.round(recency * 50 + streakF * 25 + masteryF * 25)
}

function xpVelocity(student) {
  return Math.round((student.xp || 0) / Math.max(student.totalLogins || 1, 1))
}

function masteryColor(rate) {
  if (rate === null || rate === undefined) return 'rgba(200,220,255,0.25)'
  return rate >= 70 ? '#06d6a0' : rate >= 50 ? '#ffd60a' : '#f72585'
}

/* ── WordBubble for heatmap ── */
function WordBubble({ vocab, entry }) {
  const [hover, setHover] = useState(false)
  let bg, border, glow = ''
  if (!entry || !entry.seen) {
    bg = 'rgba(200,220,255,0.06)'; border = 'rgba(200,220,255,0.1)'
  } else {
    const errRate = Math.round(((entry.wrong || 0) / entry.seen) * 100)
    const mastered = entry.seen >= 3 && errRate < 10
    if (mastered)        { bg = 'rgba(6,214,160,0.22)';  border = '#06d6a0'; glow = '0 0 8px rgba(6,214,160,0.6)' }
    else if (errRate >= 60) { bg = 'rgba(247,37,133,0.22)'; border = '#f72585' }
    else if (errRate >= 30) { bg = 'rgba(255,214,10,0.22)'; border = '#ffd60a' }
    else                 { bg = 'rgba(0,212,255,0.18)';   border = '#00d4ff' }
  }
  const errPct = entry?.seen ? Math.round(((entry.wrong||0)/entry.seen)*100) : null
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={entry?.seen
        ? `${vocab.hanzi} ${vocab.pinyin}\n见 ${entry.seen} 次 · 错 ${entry.wrong||0} 次 · 错误率 ${errPct}%`
        : `${vocab.hanzi} — 未练习`}
      style={{
        width: 30, height: 30, borderRadius: 6, cursor: 'default',
        background: bg, border: `1px solid ${border}`,
        boxShadow: hover ? (glow || `0 0 6px ${border}55`) : glow,
        transition: 'box-shadow .15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: 'rgba(200,220,255,0.7)',
      }}>
      {entry?.seen && errPct !== null ? (errPct > 0 ? errPct : '✓') : ''}
    </div>
  )
}

/* ── StudentModal ── */
function StudentModal({ student, onClose, xpRank, total }) {
  const [innerTab, setInnerTab] = useState('overview')
  const lvl    = getLevelInfo(student.xp || 0)
  const mRate  = computeMasteryRate(student)
  const engage = computeEngagement(student)
  const velocity = xpVelocity(student)

  const totalVocabs = ALL_UNITS.reduce((s, u) => s + u.vocabs.length, 0)
  let totalSeen = 0
  ALL_UNITS.forEach((unit, i) => {
    const m = student.wordMastery?.[String(i+1)] || {}
    totalSeen += unit.vocabs.filter(v => (m[String(v.id)]?.seen || 0) > 0).length
  })

  const coveragePct = Math.round((totalSeen / totalVocabs) * 100)
  const engColor = engage >= 70 ? '#06d6a0' : engage >= 40 ? '#ffd60a' : '#f72585'
  const da = daysAgo(student.lastSeen)

  const INNER_TABS = [
    { id: 'overview', label: '📊 概况' },
    { id: 'vocab',    label: '📖 词汇地图' },
    { id: 'games',    label: '🎮 游戏成绩' },
    { id: 'ach',      label: '🏆 成就' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
    }} onClick={onClose}>
      <div style={{
        width: 'min(900px, 96vw)', maxHeight: '90vh', borderRadius: 20, overflow: 'hidden',
        background: 'rgba(8,14,32,0.98)', border: '1px solid rgba(255,214,10,0.25)',
        boxShadow: '0 0 60px rgba(255,214,10,0.12)', display: 'flex', flexDirection: 'column',
      }} onClick={e => e.stopPropagation()}>

        {/* Modal header */}
        <div style={{ padding: '16px 22px', background: 'rgba(255,214,10,0.06)', borderBottom: '1px solid rgba(255,214,10,0.15)',
                      display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <span style={{ fontSize: 44 }}>{lvl.current.emoji}</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 28, fontWeight: 900, color: '#e8f4ff', lineHeight: 1.1 }}>{student.name}</p>
            <p style={{ fontSize: 18, color: lvl.current.color, fontFamily: 'monospace', marginTop: 3 }}>
              Lv.{lvl.current.level} {lvl.current.title} · {xpRank + 1}/{total} 名
            </p>
          </div>
          <button onClick={onClose} style={{
            fontSize: 26, width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(200,220,255,0.5)', cursor: 'pointer',
          }}>×</button>
        </div>

        {/* Inner tab bar */}
        <div style={{ display: 'flex', gap: 4, padding: '10px 14px', background: 'rgba(0,0,0,0.2)', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {INNER_TABS.map(t => (
            <button key={t.id} onClick={() => setInnerTab(t.id)} style={{
              flex: 1, padding: '12px 8px', borderRadius: 10, fontSize: 17, fontWeight: 800, cursor: 'pointer',
              background: innerTab === t.id ? 'rgba(0,212,255,0.14)' : 'transparent',
              color: innerTab === t.id ? '#00d4ff' : 'rgba(200,220,255,0.4)',
              border: innerTab === t.id ? '1px solid rgba(0,212,255,0.35)' : '1px solid transparent',
              transition: 'all .12s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Modal body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>

          {/* ── 概况 ── */}
          {innerTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* XP level bar */}
              <div style={{ borderRadius: 14, padding: '16px 20px', background: 'rgba(255,214,10,0.05)', border: '1px solid rgba(255,214,10,0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 20, color: lvl.current.color, fontWeight: 900 }}>
                    {lvl.current.emoji} Lv.{lvl.current.level} {lvl.current.title}
                  </span>
                  <span style={{ fontSize: 16, color: 'rgba(200,220,255,0.35)', fontFamily: 'monospace' }}>
                    {lvl.xpIntoLevel.toLocaleString()} / {lvl.xpForLevel.toLocaleString()} XP
                  </span>
                </div>
                <MiniBar value={lvl.pct} max={100} color={lvl.current.color} height={10} />
                {lvl.next && (
                  <p style={{ fontSize: 15, color: 'rgba(200,220,255,0.28)', marginTop: 5, textAlign: 'right' }}>
                    距下一级 {lvl.next.emoji}{lvl.next.title} 还差 {(lvl.xpForLevel - lvl.xpIntoLevel).toLocaleString()} XP
                  </p>
                )}
              </div>

              {/* 12-stat grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
                {[
                  ['🎯', '掌握率',     mRate !== null ? `${mRate}%` : '—',           masteryColor(mRate)],
                  ['⚡', '参与分',     `${engage} / 100`,                             engColor],
                  ['💡', 'XP 效率',    `${velocity.toLocaleString()} XP/次`,          '#c084fc'],
                  ['📅', '总登录',     `${(student.totalLogins||1)} 次`,             '#00d4ff'],
                  ['🔥', '当前连续',   `${student.streak||1} 天`,                    student.streak>=7?'#06d6a0':student.streak>=3?'#ffd60a':'#f72585'],
                  ['🏅', '最长连续',   `${student.longestStreak||1} 天`,             '#ffd60a'],
                  ['📖', '词汇覆盖',   `${totalSeen}/${totalVocabs} (${coveragePct}%)`,'#9b5de5'],
                  ['🧊', '护盾余量',   `${student.streakFreezes??2} 次`,             '#60a5fa'],
                  ['🪙', '金币',       `${(student.coins||0).toLocaleString()}`,     '#ffd60a'],
                  ['📆', '最后登录',   da===0?'今天':da===1?'昨天':`${da}天前`,       da>3?'#f72585':'#06d6a0'],
                  ['🏆', '成就数',     `${(student.achievements||[]).length}/${ACH_DEF.length}`, '#c084fc'],
                  ['🥇', 'XP 排名',    `第 ${xpRank+1} 名`,                          xpRank===0?'#ffd60a':xpRank<=2?'#c0c0c0':'rgba(200,220,255,0.5)'],
                ].map(([em, label, val, col]) => (
                  <div key={label} style={{
                    borderRadius: 12, padding: '13px 16px',
                    background: 'rgba(255,255,255,0.03)', border: `1px solid ${col}22`,
                    display: 'flex', flexDirection: 'column', gap: 4,
                  }}>
                    <span style={{ fontSize: 15, color: 'rgba(200,220,255,0.4)', fontWeight: 700 }}>{em} {label}</span>
                    <span style={{ fontSize: 22, fontWeight: 900, color: col }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 词汇地图 ── */}
          {innerTab === 'vocab' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* legend */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', fontSize: 15 }}>
                {[
                  ['rgba(200,220,255,0.06)','rgba(200,220,255,0.1)','未练习'],
                  ['rgba(247,37,133,0.22)','#f72585','错误 ≥60%'],
                  ['rgba(255,214,10,0.22)','#ffd60a','错误 30–59%'],
                  ['rgba(0,212,255,0.18)','#00d4ff','错误 <30%'],
                  ['rgba(6,214,160,0.22)','#06d6a0','已掌握 ✓'],
                ].map(([bg,bdr,lbl]) => (
                  <div key={lbl} style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:16, height:16, borderRadius:3, background:bg, border:`1px solid ${bdr}` }} />
                    <span style={{ color:'rgba(200,220,255,0.45)' }}>{lbl}</span>
                  </div>
                ))}
              </div>
              {ALL_UNITS.map((unit, i) => {
                const unitNum = String(i+1)
                const m = student.wordMastery?.[unitNum] || {}
                const seenCount = unit.vocabs.filter(v => (m[String(v.id)]?.seen||0)>0).length
                return (
                  <div key={unitNum} style={{ borderRadius: 13, padding: '14px 16px', background: `${UNIT_HEX[i]}08`, border: `1px solid ${UNIT_HEX[i]}22` }}>
                    <p style={{ fontSize: 18, fontWeight: 900, color: UNIT_HEX[i], marginBottom: 10 }}>
                      单元{UNIT_LABELS[i]}《{unit.title}》
                      <span style={{ fontSize: 15, color: 'rgba(200,220,255,0.35)', marginLeft: 12, fontWeight: 400 }}>
                        已练 {seenCount}/{unit.vocabs.length}
                      </span>
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {unit.vocabs.map(v => {
                        const entry = m[String(v.id)]
                        return <WordBubble key={v.id} vocab={v} entry={entry} />
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── 游戏成绩 ── */}
          {innerTab === 'games' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ALL_UNITS.map((unit, i) => {
                const n = String(i+1)
                const boss = student.bossScores?.[n]
                const match = student.matchHighPct?.[n]
                const combat = student.combatProgress?.[n]
                const stars = boss?.cleared ? (3 - (boss.bestMistakes||0)) : 0
                return (
                  <div key={n} style={{ borderRadius: 13, padding: '16px 18px', background: `${UNIT_HEX[i]}08`, border: `1px solid ${UNIT_HEX[i]}25` }}>
                    <p style={{ fontSize: 20, fontWeight: 900, color: UNIT_HEX[i], marginBottom: 12 }}>
                      单元{UNIT_LABELS[i]}《{unit.title}》
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 8 }}>
                      {/* Boss */}
                      <div style={{ borderRadius: 10, padding: '10px 14px', background: boss?.cleared?'rgba(255,107,53,0.1)':'rgba(255,255,255,0.02)', border:`1px solid ${boss?.cleared?'rgba(255,107,53,0.35)':'rgba(255,255,255,0.07)'}` }}>
                        <p style={{ fontSize: 14, color:'rgba(200,220,255,0.38)', marginBottom:5 }}>⚔️ 词语对战</p>
                        {boss?.cleared
                          ? <p style={{ fontSize: 22, fontWeight:900, color:'#ff6b35' }}>{'★'.repeat(stars)}{'☆'.repeat(3-stars)}</p>
                          : <p style={{ fontSize: 18, color:'rgba(200,220,255,0.2)' }}>未通关</p>}
                        {boss?.cleared && <p style={{ fontSize: 14, color:'rgba(200,220,255,0.3)', fontFamily:'monospace', marginTop:3 }}>失误 {boss.bestMistakes||0} 次</p>}
                      </div>
                      {/* Match */}
                      <div style={{ borderRadius: 10, padding: '10px 14px', background: match!=null?'rgba(155,93,229,0.1)':'rgba(255,255,255,0.02)', border:`1px solid ${match!=null?'rgba(155,93,229,0.35)':'rgba(255,255,255,0.07)'}` }}>
                        <p style={{ fontSize: 14, color:'rgba(200,220,255,0.38)', marginBottom:5 }}>🔗 词义配对</p>
                        {match!=null
                          ? <p style={{ fontSize: 22, fontWeight:900, color:'#9b5de5' }}>{match}%</p>
                          : <p style={{ fontSize: 18, color:'rgba(200,220,255,0.2)' }}>未游玩</p>}
                      </div>
                      {/* Combat tiers */}
                      {[['🥉','学徒','apprentice','#cd7f32'],['🥈','武士','warrior','#c0c0c0'],['🥇','宗师','grandmaster','#ffd60a']].map(([em,lbl,key,col]) => {
                        const cleared = combat?.[key]?.cleared
                        return (
                          <div key={key} style={{ borderRadius: 10, padding: '10px 14px', background: cleared?`${col}15`:'rgba(255,255,255,0.02)', border:`1px solid ${cleared?`${col}40`:'rgba(255,255,255,0.07)'}` }}>
                            <p style={{ fontSize: 14, color:'rgba(200,220,255,0.38)', marginBottom:5 }}>{em} {lbl}关卡</p>
                            <p style={{ fontSize: 22 }}>{cleared ? '✅' : '⬜'}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── 成就 ── */}
          {innerTab === 'ach' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ACH_DEF.map(a => {
                const has = (student.achievements || []).includes(a.id)
                // Progress hints
                let hint = ''
                if (!has) {
                  if (a.id==='streak3')      hint = `当前 ${student.streak||1} 天，还差 ${Math.max(0,3-(student.streak||1))} 天`
                  else if (a.id==='streak7') hint = `当前 ${student.streak||1} 天，还差 ${Math.max(0,7-(student.streak||1))} 天`
                  else if (a.id==='streak30')hint = `最长 ${student.longestStreak||1} 天，还差 ${Math.max(0,30-(student.longestStreak||1))} 天`
                  else if (a.id==='match_ace'){
                    const best = Math.max(0,...Object.values(student.matchHighPct||{}))
                    hint = `最高 ${best}%，距 90% 还差 ${Math.max(0,90-best)}%`
                  } else if (a.id==='boss_all') {
                    const cleared = Object.values(student.bossScores||{}).filter(b=>b?.cleared).length
                    hint = `已通关 ${cleared}/6 个单元`
                  }
                }
                return (
                  <div key={a.id} style={{
                    borderRadius: 13, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
                    background: has?'rgba(255,214,10,0.07)':'rgba(255,255,255,0.02)',
                    border: `1px solid ${has?'rgba(255,214,10,0.3)':'rgba(255,255,255,0.06)'}`,
                  }}>
                    <span style={{ fontSize: 32, filter: has?'none':'grayscale(1)', opacity: has?1:0.3 }}>{a.emoji}</span>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize: 20, fontWeight: 900, color: has?'#ffd60a':'rgba(200,220,255,0.3)' }}>{a.label}</p>
                      <p style={{ fontSize: 16, color: 'rgba(200,220,255,0.35)', marginTop: 3 }}>{a.desc}</p>
                      {hint && <p style={{ fontSize: 15, color: 'rgba(0,212,255,0.5)', marginTop:4, fontFamily:'monospace' }}>📍 {hint}</p>}
                    </div>
                    <span style={{ fontSize: 26 }}>{has ? '✅' : '🔒'}</span>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

/* ── small reusable pieces ── */
const C = {
  card:    { background: 'rgba(255,255,255,0.03)', borderRadius: 14 },
  row:     { display: 'flex', alignItems: 'center', gap: 8 },
  label:   { fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(200,220,255,0.4)' },
  mono:    { fontFamily: 'monospace' },
  dimText: { color: 'rgba(200,220,255,0.35)' },
}

function StatCard({ emoji, label, value, color = '#00d4ff', sub }) {
  return (
    <div style={{ ...C.card, border: `1px solid ${color}30`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 6, padding: '22px 14px', minWidth: 120,
                  boxShadow: `0 0 24px ${color}10` }}>
      <span style={{ fontSize: 36 }}>{emoji}</span>
      <p style={{ fontSize: 40, fontWeight: 900, color, lineHeight: 1,
                  textShadow: `0 0 20px ${color}70, 0 0 40px ${color}35` }}>{value}</p>
      <p style={{ fontSize: 16, fontWeight: 800, color: 'rgba(200,220,255,0.65)',
                  textAlign: 'center', lineHeight: 1.35 }}>{label}</p>
      {sub && <p style={{ fontSize: 16, fontWeight: 700, color }}>{sub}</p>}
    </div>
  )
}

function MiniBar({ value, max = 100, color = '#00d4ff', height = 5 }) {
  const w = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div style={{ height, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${w}%`, borderRadius: 99, background: color, transition: 'width .4s' }} />
    </div>
  )
}

function Pill({ children, color = '#00d4ff', bg, border }) {
  return (
    <span style={{
      fontSize: 18, padding: '8px 18px', borderRadius: 99, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: bg  ?? `${color}18`,
      border:    `1px solid ${border ?? `${color}45`}`,
      color,
    }}>
      {children}
    </span>
  )
}

function SortBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 18, padding: '12px 22px', borderRadius: 99, fontWeight: 800, cursor: 'pointer',
      background: active ? 'rgba(0,212,255,0.18)' : 'rgba(0,212,255,0.05)',
      border: `1px solid ${active ? 'rgba(0,212,255,0.65)' : 'rgba(0,212,255,0.16)'}`,
      color: active ? '#00d4ff' : 'rgba(200,220,255,0.55)',
      transition: 'all .15s',
    }}>{label}</button>
  )
}

/* ── Expandable student row ── */
function StudentRow({ student, rank, onNameClick }) {
  const [open, setOpen] = useState(false)
  const lvl    = getLevelInfo(student.xp || 0)
  const da     = daysAgo(student.lastSeen)
  const mRate  = computeMasteryRate(student)
  const engage = computeEngagement(student)
  const inactive   = da >= 3
  const streakColor = student.streak >= 7 ? '#06d6a0' : student.streak >= 3 ? '#ffd60a' : '#f72585'
  const engColor    = engage >= 70 ? '#06d6a0' : engage >= 40 ? '#ffd60a' : '#f72585'
  const rankColor   = rank === 0 ? '#ffd60a' : rank === 1 ? '#c0c0c0' : rank === 2 ? '#cd7f32' : 'rgba(200,220,255,0.25)'

  /* weak words per unit */
  const weakByUnit = ALL_UNITS.map((unit, i) => {
    const unitNum = i + 1
    const m = student.wordMastery?.[String(unitNum)] || {}
    const words = unit.vocabs
      .filter(v => { const e = m[String(v.id)]; return e && e.wrong > 0 })
      .map(v => { const e = m[String(v.id)]; return { ...v, seen: e.seen, wrong: e.wrong, rate: Math.round((e.wrong / e.seen) * 100) } })
      .sort((a, b) => b.rate - a.rate).slice(0, 6)
    return { unitNum, title: unit.title, words }
  }).filter(u => u.words.length > 0)

  /* total words practiced */
  let totalPracticed = 0
  ALL_UNITS.forEach((unit, i) => {
    const m = student.wordMastery?.[String(i + 1)] || {}
    totalPracticed += unit.vocabs.filter(v => (m[String(v.id)]?.seen || 0) > 0).length
  })
  const totalVocabs = ALL_UNITS.reduce((s, u) => s + u.vocabs.length, 0)

  return (
    <>
      <tr
        style={{ borderBottom: '2px solid rgba(0,212,255,0.08)', cursor: 'pointer',
                 background: open ? 'rgba(0,212,255,0.06)' : 'transparent', transition: 'background .12s' }}
        onClick={() => setOpen(o => !o)}
      >
        {/* Rank + name */}
        <td style={{ padding: '22px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: rankColor, minWidth: 28, textAlign: 'center' }}>{rank + 1}</span>
            <span style={{ fontSize: 38 }}>{lvl.current.emoji}</span>
            <div>
              <p
                onClick={onNameClick ? e => { e.stopPropagation(); onNameClick() } : undefined}
                style={{ fontWeight: 900, fontSize: 26, color: inactive ? 'rgba(220,240,255,0.4)' : '#e8f4ff', lineHeight: 1.2,
                         ...(onNameClick ? { textDecoration: 'underline dotted', cursor: 'pointer' } : {}) }}>
                {student.name}
              </p>
              <p style={{ fontSize: 16, color: lvl.current.color, fontFamily: 'monospace', marginTop: 3 }}>
                Lv.{lvl.current.level} {lvl.current.title}
              </p>
            </div>
          </div>
        </td>
        {/* XP */}
        <td style={{ padding: '22px 14px', textAlign: 'center' }}>
          <span style={{ fontWeight: 900, fontSize: 26, color: '#ffd60a' }}>{(student.xp || 0).toLocaleString()}</span>
        </td>
        {/* Streak */}
        <td style={{ padding: '22px 14px', textAlign: 'center' }}>
          <span style={{ fontWeight: 900, fontSize: 26, color: streakColor }}>🔥 {student.streak || 1}</span>
        </td>
        {/* Mastery */}
        <td style={{ padding: '22px 14px', textAlign: 'center' }}>
          {mRate !== null
            ? <span style={{ fontWeight: 900, fontSize: 26, color: mRate >= 70 ? '#06d6a0' : mRate >= 50 ? '#ffd60a' : '#f72585' }}>{mRate}%</span>
            : <span style={{ color: 'rgba(200,220,255,0.2)', fontSize: 22 }}>—</span>}
        </td>
        {/* Engagement */}
        <td style={{ padding: '22px 14px', minWidth: 160 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MiniBar value={engage} max={100} color={engColor} height={12} />
            <span style={{ fontSize: 20, fontWeight: 900, color: engColor, minWidth: 32 }}>{engage}</span>
          </div>
        </td>
        {/* Coverage */}
        <td style={{ padding: '22px 14px', textAlign: 'center' }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'rgba(200,220,255,0.65)', fontFamily: 'monospace' }}>
            {totalPracticed}/{totalVocabs}
          </span>
        </td>
        {/* Last active */}
        <td style={{ padding: '22px 14px', textAlign: 'center' }}>
          <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: inactive ? '#f72585' : 'rgba(200,220,255,0.6)' }}>
            {fmtRelative(student.lastSeen)}
          </span>
        </td>
        {/* Toggle */}
        <td style={{ padding: '22px 14px', textAlign: 'center' }}>
          <span style={{ color: 'rgba(0,212,255,0.5)', fontSize: 22 }}>{open ? '▲' : '▼'}</span>
        </td>
      </tr>

      {open && (
        <tr style={{ background: 'rgba(0,212,255,0.015)' }}>
          <td colSpan={8} style={{ padding: '10px 20px 22px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 16 }}>

              {/* ── Core stats ── */}
              <div>
                <p style={{ ...C.label, marginBottom: 8 }}>学习概况</p>
                {[
                  ['🔥 当前连续',   `${student.streak || 1} 天`,   streakColor],
                  ['🏅 最长连续',   `${student.longestStreak || 1} 天`, '#ffd60a'],
                  ['📅 总登录',     `${student.totalLogins || 1} 次`, '#00d4ff'],
                  ['📖 词汇覆盖',   `${totalPracticed}/${totalVocabs} 词`, '#9b5de5'],
                  ['🎯 整体掌握率', mRate !== null ? `${mRate}%` : '暂无', mRate !== null ? (mRate >= 70 ? '#06d6a0' : mRate >= 50 ? '#ffd60a' : '#f72585') : 'rgba(200,220,255,0.3)'],
                  ['🧊 护盾余量',  `${student.streakFreezes ?? 2} 次`, '#60a5fa'],
                  ['🪙 金币',      `${(student.coins || 0).toLocaleString()}`, '#ffd60a'],
                  ['⚡ 参与分',    `${engage}/100`, engColor],
                ].map(([label, val, col]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '8px 12px', borderRadius: 9, marginBottom: 5,
                                            background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.07)' }}>
                    <span style={{ fontSize: 18, color: 'rgba(200,220,255,0.55)' }}>{label}</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: col }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* ── Per-unit game scores ── */}
              <div>
                <p style={{ ...C.label, marginBottom: 8 }}>各单元成绩</p>
                {ALL_UNITS.map((unit, i) => {
                  const n      = String(i + 1)
                  const boss   = student.bossScores?.[n]
                  const match  = student.matchHighPct?.[n]
                  const combat = student.combatProgress?.[n]
                  const mastery = student.wordMastery?.[n] || {}
                  const seenCnt = unit.vocabs.filter(v => (mastery[String(v.id)]?.seen || 0) > 0).length
                  const wrongCnt = unit.vocabs.filter(v => (mastery[String(v.id)]?.wrong || 0) > 0).length
                  const tiers = [
                    combat?.apprentice?.cleared  ? '🥉' : null,
                    combat?.warrior?.cleared     ? '🥈' : null,
                    combat?.grandmaster?.cleared ? '🥇' : null,
                  ].filter(Boolean)
                  return (
                    <div key={n} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 7,
                                          padding: '8px 12px', borderRadius: 9, marginBottom: 5, fontSize: 18,
                                          background: `${UNIT_HEX[i]}0a`, border: `1px solid ${UNIT_HEX[i]}22` }}>
                      <span style={{ color: UNIT_HEX[i], fontWeight: 900, minWidth: 60 }}>单元{UNIT_LABELS[i]}</span>
                      <span style={{ color: boss?.cleared ? '#06d6a0' : 'rgba(200,220,255,0.2)' }}>
                        ⚔️{boss?.cleared ? `${3 - (boss.bestMistakes || 0)}★` : '—'}
                      </span>
                      <span style={{ color: match ? '#9b5de5' : 'rgba(200,220,255,0.2)' }}>
                        🔗{match != null ? `${match}%` : '—'}
                      </span>
                      <span style={{ color: seenCnt > 0 ? '#ffd60a' : 'rgba(200,220,255,0.2)' }}>
                        📖{seenCnt}/{unit.vocabs.length}
                      </span>
                      {wrongCnt > 0 && <span style={{ color: '#f72585' }}>❌{wrongCnt}</span>}
                      {tiers.length > 0 && <span style={{ marginLeft: 'auto' }}>{tiers.join('')}</span>}
                    </div>
                  )
                })}
              </div>

              {/* ── Achievements ── */}
              <div>
                <p style={{ ...C.label, marginBottom: 8 }}>
                  成就 ({(student.achievements || []).length}/{ACH_DEF.length})
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ACH_DEF.map(a => {
                    const has = (student.achievements || []).includes(a.id)
                    return (
                      <div key={a.id} title={a.desc} style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '6px 14px', borderRadius: 99, fontSize: 18, fontWeight: 700,
                        background: has ? 'rgba(255,214,10,0.1)'  : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${has ? 'rgba(255,214,10,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        color: has ? '#ffd60a' : 'rgba(200,220,255,0.2)',
                      }}>
                        <span style={{ filter: has ? 'none' : 'grayscale(1)', opacity: has ? 1 : 0.3 }}>{a.emoji}</span>
                        <span>{a.label}</span>
                      </div>
                    )
                  })}
                </div>

                {/* XP progress bar */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 18, color: lvl.current.color, fontWeight: 700 }}>
                      {lvl.current.emoji} Lv.{lvl.current.level} {lvl.current.title}
                    </span>
                    <span style={{ fontSize: 15, color: 'rgba(200,220,255,0.35)', fontFamily: 'monospace' }}>
                      {lvl.xpIntoLevel.toLocaleString()} / {lvl.xpForLevel.toLocaleString()} XP
                    </span>
                  </div>
                  <MiniBar value={lvl.pct} max={100} color={lvl.current.color} height={9} />
                  {lvl.next && (
                    <p style={{ fontSize: 16, color: 'rgba(200,220,255,0.3)', marginTop: 4, textAlign: 'right' }}>
                      下一级：{lvl.next.emoji} {lvl.next.title}
                    </p>
                  )}
                </div>
              </div>

              {/* ── Weak words ── */}
              {weakByUnit.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ ...C.label, color: 'rgba(247,37,133,0.6)', marginBottom: 8 }}>🔴 待巩固词语</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                    {weakByUnit.map(({ unitNum, title, words }) => (
                      <div key={unitNum}>
                        <p style={{ fontSize: 16, color: 'rgba(200,220,255,0.38)', marginBottom: 6 }}>
                          单元{UNIT_LABELS[unitNum - 1]}《{title}》
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                          {words.map(w => (
                            <span key={w.id} title={`${w.definition}\n见${w.seen}次 错${w.wrong}次`} style={{
                              fontSize: 18, padding: '5px 14px', borderRadius: 99, fontWeight: 700,
                              background: 'rgba(247,37,133,0.09)', border: '1px solid rgba(247,37,133,0.3)', color: '#f72585',
                            }}>
                              {w.hanzi} <span style={{ opacity: 0.65 }}>{w.rate}%</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </td>
        </tr>
      )}
    </>
  )
}

/* ══════════════ MAIN DASHBOARD ══════════════ */
export default function TeacherDashboard({ onClose }) {
  const [students,      setStudents]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [tab,           setTab]           = useState('students')
  const [sortBy,        setSortBy]        = useState('xp')
  const [unitFilter,    setUnitFilter]    = useState(0)
  const [hardSort,      setHardSort]      = useState('rate')
  const [lastRefresh,   setLastRefresh]   = useState(null)
  const [search,        setSearch]        = useState('')
  const [wordSearch,    setWordSearch]    = useState('')
  const [expandedWord,  setExpandedWord]  = useState(null)
  const [showAtRisk,    setShowAtRisk]    = useState(true)
  const [showInactive,  setShowInactive]  = useState(true)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [autoRefresh,   setAutoRefresh]   = useState(false)
  const [hmUnit,        setHmUnit]        = useState(1)
  const [showStreakRisk, setShowStreakRisk] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/teacher-data')
      const data = await res.json()
      setStudents(data.students || [])
      setLastRefresh(Date.now())
    } catch {
      setError('无法加载数据，请检查网络连接。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  /* auto-refresh every 60 s */
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(fetchData, 60000)
    return () => clearInterval(id)
  }, [autoRefresh, fetchData])

  /* ── Overview stats ── */
  const total        = students.length
  const activeToday  = students.filter(s => daysAgo(s.lastSeen) === 0).length
  const activeWeek   = students.filter(s => daysAgo(s.lastSeen) <= 6).length
  const totalXP      = students.reduce((s, st) => s + (st.xp || 0), 0)
  const avgXP        = total ? Math.round(totalXP / total) : 0
  const avgStreak    = total ? (students.reduce((s, st) => s + (st.streak || 1), 0) / total).toFixed(1) : '0'
  const needAttn     = students.filter(s => daysAgo(s.lastSeen) >= 3).sort((a, b) => (a.lastSeen || 0) - (b.lastSeen || 0))
  const atRisk       = students.filter(s => {
    const mr = computeMasteryRate(s)
    return daysAgo(s.lastSeen) >= 5 && (mr === null || mr < 50)
  })

  /* class-wide mastery */
  const [clsSeen, clsCorrect] = useMemo(() => {
    let s = 0, c = 0
    students.forEach(st => {
      Object.values(st.wordMastery || {}).forEach(um => {
        Object.values(um).forEach(m => { s += m.seen || 0; c += m.correct || 0 })
      })
    })
    return [s, c]
  }, [students])
  const classMastery = clsSeen > 0 ? Math.round((clsCorrect / clsSeen) * 100) : null

  /* longest current streak */
  const topStreaker  = [...students].sort((a, b) => (b.streak || 0) - (a.streak || 0))[0]

  /* ── Sorted + filtered student list ── */
  const filteredStudents = useMemo(() => {
    let arr = [...students]
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      arr = arr.filter(s => s.name.toLowerCase().includes(q))
    }
    arr.sort((a, b) => {
      if (sortBy === 'xp')      return (b.xp || 0) - (a.xp || 0)
      if (sortBy === 'streak')  return (b.streak || 1) - (a.streak || 1)
      if (sortBy === 'mastery') { const ma = computeMasteryRate(a) ?? -1, mb = computeMasteryRate(b) ?? -1; return mb - ma }
      if (sortBy === 'engage')  return computeEngagement(b) - computeEngagement(a)
      if (sortBy === 'logins')  return (b.totalLogins || 1) - (a.totalLogins || 1)
      if (sortBy === 'recent')  return (b.lastSeen || 0) - (a.lastSeen || 0)
      if (sortBy === 'name')    return a.name.localeCompare(b.name, 'zh')
      return 0
    })
    return arr
  }, [students, search, sortBy])

  /* ── Hard words aggregation ── */
  const hardWords = useMemo(() => {
    const agg = {}
    students.forEach(student => {
      Object.entries(student.wordMastery || {}).forEach(([unitNum, unitM]) => {
        if (unitFilter && String(unitFilter) !== unitNum) return
        Object.entries(unitM).forEach(([vocabId, m]) => {
          if (!m.seen) return
          const vocab = VOCAB_MAP[vocabId]; if (!vocab) return
          if (!agg[vocabId]) agg[vocabId] = { ...vocab, totalSeen: 0, totalWrong: 0, studentCount: 0, students: [] }
          agg[vocabId].totalSeen    += m.seen
          agg[vocabId].totalWrong   += m.wrong || 0
          if ((m.wrong || 0) > 0) agg[vocabId].studentCount += 1
          agg[vocabId].students.push({
            name: student.name, seen: m.seen, correct: m.correct || 0, wrong: m.wrong || 0,
            rate: Math.round(((m.wrong || 0) / m.seen) * 100),
          })
        })
      })
    })
    let words = Object.values(agg).filter(w => w.totalWrong > 0)
    if (hardSort === 'rate')     words.sort((a, b) => (b.totalWrong / b.totalSeen) - (a.totalWrong / a.totalSeen))
    else if (hardSort === 'count')    words.sort((a, b) => b.studentCount - a.studentCount)
    else if (hardSort === 'attempts') words.sort((a, b) => b.totalSeen - a.totalSeen)
    return words.slice(0, 40)
  }, [students, unitFilter, hardSort])

  /* ── Coverage data ── */
  const { coverageRows, coverageAvg } = useMemo(() => {
    const rows = [...students].sort((a, b) => (b.xp || 0) - (a.xp || 0)).map(s => ({
      name: s.name,
      units: ALL_UNITS.map((unit, i) => {
        const m = s.wordMastery?.[String(i + 1)] || {}
        const seen  = unit.vocabs.filter(v => (m[String(v.id)]?.seen  || 0) > 0).length
        const wrong = unit.vocabs.filter(v => (m[String(v.id)]?.wrong || 0) > 0).length
        const pct   = Math.round((seen / unit.vocabs.length) * 100)
        return { seen, wrong, pct, total: unit.vocabs.length }
      }),
    }))
    const avg = ALL_UNITS.map((unit, i) => {
      if (!rows.length) return { seen: 0, wrong: 0, pct: 0, total: unit.vocabs.length }
      const avgSeen  = Math.round(rows.reduce((s, r) => s + r.units[i].seen,  0) / rows.length)
      const avgWrong = Math.round(rows.reduce((s, r) => s + r.units[i].wrong, 0) / rows.length)
      return { seen: avgSeen, wrong: avgWrong, pct: Math.round((avgSeen / unit.vocabs.length) * 100), total: unit.vocabs.length }
    })
    return { coverageRows: rows, coverageAvg: avg }
  }, [students])

  /* ── 7-day activity ── */
  const activity7 = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      const dateStr = d.toISOString().slice(0, 10)
      const count   = students.filter(s => s.lastSeen && new Date(s.lastSeen).toISOString().slice(0, 10) === dateStr).length
      return { label: i === 6 ? '今天' : i === 5 ? '昨天' : `${6 - i}天前`, count, dateStr }
    })
  }, [students])

  /* ── XP bucket distribution ── */
  const xpBuckets = useMemo(() => [
    { label: 'Lv 1–5',   color: '#9ca3af', min: 0,      max: 1499 },
    { label: 'Lv 6–10',  color: '#60a5fa', min: 1500,   max: 11499 },
    { label: 'Lv 11–20', color: '#34d399', min: 11500,  max: 68999 },
    { label: 'Lv 21–30', color: '#fbbf24', min: 69000,  max: 175999 },
    { label: 'Lv 31–40', color: '#f97316', min: 176000, max: 333999 },
    { label: 'Lv 41–50', color: '#c084fc', min: 334000, max: Infinity },
  ].map(b => ({ ...b, count: students.filter(s => (s.xp || 0) >= b.min && (s.xp || 0) <= b.max).length })),
  [students])

  /* ── Unit stats (boss, match, combat tiers) ── */
  const unitStats = useMemo(() => ALL_UNITS.map((unit, i) => {
    const n = String(i + 1)
    const bossCleared = students.filter(s => s.bossScores?.[n]?.cleared).length
    const matchPlayed = students.filter(s => s.matchHighPct?.[n] != null).length
    const avgMatch    = matchPlayed > 0
      ? Math.round(students.reduce((s, st) => s + (st.matchHighPct?.[n] || 0), 0) / matchPlayed) : null
    const ap = students.filter(s => s.combatProgress?.[n]?.apprentice?.cleared).length
    const wa = students.filter(s => s.combatProgress?.[n]?.warrior?.cleared).length
    const gm = students.filter(s => s.combatProgress?.[n]?.grandmaster?.cleared).length
    return { unitNum: i + 1, title: unit.title, bossCleared, matchPlayed, avgMatch, ap, wa, gm }
  }), [students])

  /* ── Achievement stats ── */
  const achStats = useMemo(() => ACH_DEF.map(a => ({
    ...a, count: students.filter(s => (s.achievements || []).includes(a.id)).length
  })), [students])

  /* ── Word search ── */
  const wordResults = useMemo(() => {
    const q = wordSearch.trim().toLowerCase()
    if (!q) return []
    return Object.values(VOCAB_MAP)
      .filter(v => v.hanzi.includes(q) || v.pinyin.toLowerCase().includes(q) || v.definition.includes(q))
      .map(vocab => {
        const perStudent = students
          .map(s => {
            const m = s.wordMastery?.[String(vocab.unitNum)]?.[String(vocab.id)]
            if (!m || !m.seen) return null
            return { name: s.name, seen: m.seen, correct: m.correct || 0, wrong: m.wrong || 0,
                     rate: Math.round(((m.wrong || 0) / m.seen) * 100) }
          })
          .filter(Boolean)
          .sort((a, b) => b.rate - a.rate)
        const ts = perStudent.reduce((s, d) => s + d.seen,  0)
        const tw = perStudent.reduce((s, d) => s + d.wrong, 0)
        return { ...vocab, perStudent, avgRate: ts > 0 ? Math.round((tw / ts) * 100) : 0 }
      })
      .slice(0, 15)
  }, [students, wordSearch])

  /* ── Streak at risk (active streak, not logged in today) ── */
  const streakAtRisk = useMemo(() =>
    students.filter(s => (s.streak || 1) > 1 && daysAgo(s.lastSeen) > 0)
  , [students])

  /* ── XP rank map ── */
  const xpRankMap = useMemo(() => {
    const sorted = [...students].sort((a,b) => (b.xp||0)-(a.xp||0))
    const map = {}; sorted.forEach((s,i) => { map[s.name] = i }); return map
  }, [students])

  /* ── Per-unit average mastery rate ── */
  const unitMasteryRates = useMemo(() => ALL_UNITS.map((unit, i) => {
    const unitNum = String(i+1)
    let ts = 0, tc = 0
    students.forEach(s => {
      const m = s.wordMastery?.[unitNum] || {}
      unit.vocabs.forEach(v => { const e = m[String(v.id)]; if (e?.seen) { ts += e.seen; tc += e.correct||0 } })
    })
    return { unitNum: i+1, title: unit.title, rate: ts>0 ? Math.round((tc/ts)*100) : null }
  }), [students])

  /* ── Class health score 0-100 ── */
  const classHealth = useMemo(() => {
    if (!students.length) return null
    const activityScore = (students.filter(s => daysAgo(s.lastSeen)<=6).length/students.length)*100
    const masteryScore  = classMastery ?? 50
    const avgEngage     = students.reduce((s,st) => s+computeEngagement(st), 0)/students.length
    const totalVocabs   = ALL_UNITS.reduce((s,u) => s+u.vocabs.length, 0)
    const avgCoverage   = students.reduce((acc,st) => {
      let seen=0
      ALL_UNITS.forEach((u,i) => { const m=st.wordMastery?.[String(i+1)]||{}; seen+=u.vocabs.filter(v=>(m[String(v.id)]?.seen||0)>0).length })
      return acc+(seen/totalVocabs)*100
    }, 0)/students.length
    const score = Math.round(activityScore*0.35 + masteryScore*0.30 + avgEngage*0.25 + avgCoverage*0.10)
    const grade = score>=80?'A':score>=65?'B':score>=50?'C':'D'
    const color = score>=80?'#06d6a0':score>=65?'#ffd60a':score>=50?'#ff6b35':'#f72585'
    return { score, grade, color }
  }, [students, classMastery])

  /* ── export CSV ── */
  function exportCSV() {
    const headers = ['姓名','XP','连续天','最长连续','总登录','XP效率','掌握率%','参与分','最后登录','成就数']
    const rows = filteredStudents.map(s => {
      const mr = computeMasteryRate(s) ?? ''
      return [s.name, s.xp||0, s.streak||1, s.longestStreak||1, s.totalLogins||1,
              xpVelocity(s), mr, computeEngagement(s), fmtDate(s.lastSeen), (s.achievements||[]).length]
    })
    const csv = [headers,...rows].map(r=>r.join(',')).join('\n')
    const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href=url; a.download=`班级数据_${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  /* ── helpers ── */
  const CellPct = ({ u, i }) => {
    const col = u.pct >= 70 ? '#06d6a0' : u.pct >= 30 ? '#ffd60a' : u.pct > 0 ? '#ff6b35' : 'rgba(200,220,255,0.12)'
    const bg  = u.pct >= 70 ? 'rgba(6,214,160,0.1)' : u.pct >= 30 ? 'rgba(255,214,10,0.08)' : u.pct > 0 ? 'rgba(255,107,53,0.08)' : 'rgba(255,255,255,0.02)'
    return (
      <td style={{ padding: '6px 6px', textAlign: 'center' }}>
        <div title={`已见 ${u.seen}/${u.total} · 错误 ${u.wrong} 词`}
             style={{ borderRadius: 8, padding: '6px 4px', fontSize: 18, fontWeight: 900, background: bg, color: col }}>
          {u.pct > 0 ? `${u.seen}/${u.total}` : '—'}
          {u.pct > 0 && <div style={{ fontSize: 16, opacity: 0.6, fontWeight: 400 }}>{u.pct}%</div>}
        </div>
      </td>
    )
  }

  const TABS = [
    { id: 'students',   label: '👤 学生列表' },
    { id: 'hardwords',  label: '🔴 难词分析' },
    { id: 'coverage',   label: '📊 单元覆盖' },
    { id: 'trends',     label: '📈 班级概况' },
    { id: 'heatmap',    label: '🗺️ 掌握热图' },
    { id: 'wordsearch', label: '🔍 词语搜索' },
  ]

  /* ══════════════ RENDER ══════════════ */
  return (
    <>
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column',
                  overflow: 'hidden', background: 'rgba(3,6,16,0.98)', backdropFilter: 'blur(22px)' }}>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(255,214,10,0.05)', borderBottom: '1px solid rgba(255,214,10,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 38 }}>🎓</span>
          <div>
            <p style={{ fontWeight: 900, fontSize: 26, color: '#ffd60a',
                        textShadow: '0 0 20px rgba(255,214,10,0.6)', lineHeight: 1.15 }}>
              教师控制台
            </p>
            <p style={{ fontSize: 18, fontFamily: 'monospace', color: 'rgba(255,214,10,0.45)', marginTop: 2 }}>
              {total} 位学生 · {lastRefresh ? `更新于 ${fmtRelative(lastRefresh)}` : '首次加载…'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setAutoRefresh(v => !v)} style={{
            fontSize: 16, padding: '11px 18px', borderRadius: 12, fontWeight: 800, cursor: 'pointer',
            background: autoRefresh ? 'rgba(6,214,160,0.14)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${autoRefresh ? 'rgba(6,214,160,0.4)' : 'rgba(255,255,255,0.12)'}`,
            color: autoRefresh ? '#06d6a0' : 'rgba(200,220,255,0.35)',
          }}>
            🔄 {autoRefresh ? '自动刷新 ON' : '自动刷新 OFF'}
          </button>
          <button onClick={() => exportCSV()} style={{
            fontSize: 16, padding: '11px 18px', borderRadius: 12, fontWeight: 800, cursor: 'pointer',
            background: 'rgba(255,214,10,0.07)', border: '1px solid rgba(255,214,10,0.25)', color: '#ffd60a',
          }}>
            📥 导出 CSV
          </button>
          <button onClick={fetchData} disabled={loading} style={{
            fontSize: 18, padding: '11px 22px', borderRadius: 12, fontWeight: 800, cursor: 'pointer',
            background: 'rgba(0,212,255,0.09)', border: '1px solid rgba(0,212,255,0.28)', color: '#00d4ff',
          }}>
            {loading ? '⏳ 刷新中…' : '🔄 刷新数据'}
          </button>
          <button onClick={onClose} style={{
            fontSize: 26, lineHeight: 1, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 12, color: 'rgba(255,214,10,0.6)', background: 'rgba(255,214,10,0.05)',
            border: '1px solid rgba(255,214,10,0.18)', cursor: 'pointer',
          }}>×</button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {error && (
          <div style={{ borderRadius: 12, padding: '14px 20px', fontSize: 20, fontWeight: 600,
                        background: 'rgba(247,37,133,0.1)', border: '1px solid rgba(247,37,133,0.3)', color: '#f72585' }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── 8 overview stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12 }}>
          <StatCard emoji="👥" label="总学生数"   value={total}                       color="#00d4ff" />
          <StatCard emoji="✅" label="今日活跃"   value={activeToday}                 color="#06d6a0"
                    sub={total ? `${Math.round(activeToday / total * 100)}%` : ''} />
          <StatCard emoji="📅" label="本周活跃"   value={activeWeek}                  color="#38bdf8"
                    sub={total ? `${Math.round(activeWeek / total * 100)}%` : ''} />
          <StatCard emoji="⚡" label="班级总 XP"  value={totalXP.toLocaleString()}    color="#ffd60a" />
          <StatCard emoji="📈" label="平均 XP"    value={avgXP.toLocaleString()}      color="#c084fc" />
          <StatCard emoji="🔥" label="平均连续"   value={`${avgStreak} 天`}           color="#ff6b35" />
          <StatCard emoji="🎯" label="班级掌握率"  value={classMastery !== null ? `${classMastery}%` : '—'}
                    color={classMastery === null ? '#9ca3af' : classMastery >= 70 ? '#06d6a0' : classMastery >= 50 ? '#ffd60a' : '#f72585'} />
          <StatCard emoji="⚠️" label="需关注"    value={needAttn.length}
                    color={needAttn.length === 0 ? '#06d6a0' : '#f72585'} />
          {classHealth && (
            <StatCard emoji="❤️" label="班级健康度"
                      value={`${classHealth.score}`}
                      color={classHealth.color}
                      sub={`等级 ${classHealth.grade}`} />
          )}
        </div>

        {/* ── Alert: inactive ── */}
        {needAttn.length > 0 && (
          <div style={{ borderRadius: 16, padding: '14px 18px', background: 'rgba(247,37,133,0.07)', border: '1px solid rgba(247,37,133,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showInactive ? 12 : 0 }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#f72585' }}>
                ⚠️ {needAttn.length} 位同学超过 3 天未登录
              </p>
              <button onClick={() => setShowInactive(v => !v)}
                      style={{ fontSize: 18, color: 'rgba(247,37,133,0.7)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                {showInactive ? '收起 ▲' : '展开 ▼'}
              </button>
            </div>
            {showInactive && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {needAttn.map(s => (
                  <Pill key={s.name} color="#f72585">
                    {s.name} · {daysAgo(s.lastSeen)} 天未登录
                  </Pill>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Alert: at-risk ── */}
        {atRisk.length > 0 && (
          <div style={{ borderRadius: 16, padding: '14px 18px', background: 'rgba(255,107,53,0.07)', border: '1px solid rgba(255,107,53,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showAtRisk ? 12 : 0 }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#ff6b35' }}>
                🆘 高危 — {atRisk.length} 位：5 天+ 未登录 且 掌握率 &lt; 50%
              </p>
              <button onClick={() => setShowAtRisk(v => !v)}
                      style={{ fontSize: 18, color: 'rgba(255,107,53,0.7)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                {showAtRisk ? '收起 ▲' : '展开 ▼'}
              </button>
            </div>
            {showAtRisk && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {atRisk.map(s => {
                  const mr = computeMasteryRate(s)
                  return (
                    <Pill key={s.name} color="#ff6b35">
                      {s.name} · {mr !== null ? `掌握 ${mr}%` : '暂无数据'} · {daysAgo(s.lastSeen)} 天
                    </Pill>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Alert: streak at risk ── */}
        {streakAtRisk.length > 0 && (
          <div style={{ borderRadius: 16, padding: '14px 18px', background: 'rgba(255,214,10,0.06)', border: '1px solid rgba(255,214,10,0.22)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showStreakRisk ? 12 : 0 }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#ffd60a' }}>
                🔥 {streakAtRisk.length} 位同学今日未登录，连续天数面临中断
              </p>
              <button onClick={() => setShowStreakRisk(v => !v)}
                      style={{ fontSize: 18, color: 'rgba(255,214,10,0.7)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                {showStreakRisk ? '收起 ▲' : '展开 ▼'}
              </button>
            </div>
            {showStreakRisk && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {streakAtRisk.sort((a,b)=>(b.streak||1)-(a.streak||1)).map(s => (
                  <Pill key={s.name} color="#ffd60a">
                    {s.name} · 🔥{s.streak||1} 天 · {daysAgo(s.lastSeen)} 天未登录
                  </Pill>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 5, borderRadius: 16, padding: 5, overflowX: 'auto', flexShrink: 0,
                      background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, minWidth: 140, padding: '16px 12px', borderRadius: 11, fontSize: 20, fontWeight: 900,
              cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
              background: tab === t.id ? 'rgba(255,214,10,0.12)' : 'transparent',
              color:      tab === t.id ? '#ffd60a' : 'rgba(200,220,255,0.45)',
              border:     tab === t.id ? '1px solid rgba(255,214,10,0.32)' : '1px solid transparent',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ════════ TAB: STUDENTS ════════ */}
        {tab === 'students' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Search + sort */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="🔍 搜索学生姓名…"
                style={{
                  fontSize: 18, padding: '12px 22px', borderRadius: 99, outline: 'none', minWidth: 220,
                  background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.3)',
                  color: '#e8f4ff', fontWeight: 700,
                }}
              />
              <span style={{ fontSize: 20, color: 'rgba(200,220,255,0.45)', fontWeight: 800 }}>排序：</span>
              {[
                ['xp',      'XP'],
                ['streak',  '连续'],
                ['mastery', '掌握率'],
                ['engage',  '参与度'],
                ['recent',  '最近活跃'],
                ['logins',  '登录次数'],
                ['name',    '姓名'],
              ].map(([id, label]) => (
                <SortBtn key={id} label={label} active={sortBy === id} onClick={() => setSortBy(id)} />
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 18, fontFamily: 'monospace', color: 'rgba(200,220,255,0.35)' }}>
                {filteredStudents.length} 人 · 点击名字查看详情
              </span>
            </div>

            <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(0,212,255,0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,212,255,0.08)', borderBottom: '2px solid rgba(0,212,255,0.14)' }}>
                    {['# 姓名 / 等级', 'XP', '连续', '掌握率', '参与度', '词覆盖', '最后活跃', ''].map((h, i) => (
                      <th key={i} style={{ padding: '18px 16px', textAlign: i === 0 ? 'left' : 'center',
                                           fontSize: 20, fontWeight: 900, color: 'rgba(0,212,255,0.7)',
                                           letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 56, color: 'rgba(200,220,255,0.35)', fontSize: 22 }}>
                      ⏳ 加载中…
                    </td></tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 56, color: 'rgba(200,220,255,0.35)', fontSize: 22 }}>
                      {search ? `没有名字包含"${search}"的学生` : '还没有学生数据，学生登录后自动同步。'}
                    </td></tr>
                  ) : filteredStudents.map((s, i) => (
                    <StudentRow key={s.name} student={s} rank={i}
                      onNameClick={() => setSelectedStudent(s)} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════ TAB: HARD WORDS ════════ */}
        {tab === 'hardwords' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Filter + sort bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 18, color: 'rgba(200,220,255,0.38)', fontWeight: 700 }}>单元：</span>
              {[0,1,2,3,4,5,6].map(n => (
                <button key={n} onClick={() => setUnitFilter(n)} style={{
                  fontSize: 16, padding: '9px 16px', borderRadius: 99, fontWeight: 700, cursor: 'pointer',
                  background: unitFilter === n ? 'rgba(247,37,133,0.14)' : 'rgba(247,37,133,0.04)',
                  border: `1px solid ${unitFilter === n ? 'rgba(247,37,133,0.5)' : 'rgba(247,37,133,0.14)'}`,
                  color: unitFilter === n ? '#f72585' : 'rgba(200,220,255,0.4)',
                }}>
                  {n === 0 ? '全部' : `单元${UNIT_LABELS[n - 1]}`}
                </button>
              ))}
              <span style={{ marginLeft: 8, fontSize: 18, color: 'rgba(200,220,255,0.38)', fontWeight: 700 }}>排序：</span>
              {[['rate','错误率'],['count','困难人数'],['attempts','练习次数']].map(([id, label]) => (
                <SortBtn key={id} label={label} active={hardSort === id} onClick={() => setHardSort(id)} />
              ))}
            </div>

            {/* Smart focus section */}
            {hardWords.length > 0 && (
              <div style={{ borderRadius: 14, padding: '14px 18px', background: 'rgba(247,37,133,0.06)', border: '1px solid rgba(247,37,133,0.2)', marginBottom: 6 }}>
                <p style={{ fontSize: 20, fontWeight: 900, color: '#f72585', marginBottom: 10 }}>🎯 重点推荐 — 高影响力词语（错误人数最多）</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {[...hardWords].sort((a,b) => b.studentCount - a.studentCount).slice(0,5).map(w => {
                    const pct = Math.round((w.totalWrong/w.totalSeen)*100)
                    return (
                      <div key={w.id} onClick={() => setExpandedWord(String(w.id))}
                           style={{ borderRadius: 12, padding: '10px 16px', cursor: 'pointer',
                                     background: 'rgba(247,37,133,0.09)', border: '1px solid rgba(247,37,133,0.28)' }}>
                        <p style={{ fontSize: 22, fontWeight: 900, color: '#e8f4ff' }}>{w.hanzi}</p>
                        <p style={{ fontSize: 15, color: '#f72585', fontFamily: 'monospace' }}>
                          {w.studentCount} 人困难 · {pct}% 错误率
                        </p>
                        <p style={{ fontSize: 14, color: 'rgba(200,220,255,0.35)', marginTop: 2 }}>{w.definition}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {hardWords.length === 0 ? (
              <p style={{ textAlign: 'center', padding: 48, color: 'rgba(200,220,255,0.3)', fontSize: 20 }}>
                还没有足够数据，学生完成练习后会出现在这里。
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {hardWords.map((w, rank) => {
                  const pct = Math.round((w.totalWrong / w.totalSeen) * 100)
                  const isExp = expandedWord === String(w.id)
                  const pctColor = pct >= 60 ? '#f72585' : pct >= 40 ? '#ffd60a' : '#06d6a0'
                  return (
                    <div key={w.id}
                         style={{ borderRadius: 13, background: 'rgba(247,37,133,0.04)', border: '1px solid rgba(247,37,133,0.12)',
                                  overflow: 'hidden', cursor: 'pointer' }}
                         onClick={() => setExpandedWord(isExp ? null : String(w.id))}>

                      {/* Word header row */}
                      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ fontSize: 20, fontWeight: 900, minWidth: 28, textAlign: 'center',
                                       color: rank < 3 ? '#f72585' : 'rgba(200,220,255,0.25)' }}>
                          {rank + 1}
                        </span>
                        <div style={{ minWidth: 72 }}>
                          <p style={{ fontSize: 30, fontWeight: 900, color: '#e8f4ff', lineHeight: 1 }}>{w.hanzi}</p>
                          <p style={{ fontSize: 18, color: '#00d4ff', marginTop: 2 }}>{w.pinyin}</p>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 18, color: 'rgba(200,220,255,0.6)', lineHeight: 1.4 }}>{w.definition}</p>
                          <p style={{ fontSize: 16, color: `${UNIT_HEX[w.unitNum - 1]}88`, marginTop: 3 }}>
                            单元{UNIT_LABELS[w.unitNum - 1]}《{w.unitTitle}》
                          </p>
                          <div style={{ marginTop: 6, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,#f72585,#ff6b35)`, borderRadius: 99 }} />
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: 72 }}>
                          <p style={{ fontSize: 26, fontWeight: 900, color: pctColor }}>{pct}%</p>
                          <p style={{ fontSize: 16, color: 'rgba(200,220,255,0.3)', fontFamily: 'monospace' }}>{w.studentCount} 人困难</p>
                          <p style={{ fontSize: 16, color: 'rgba(200,220,255,0.25)', fontFamily: 'monospace' }}>
                            错 {w.totalWrong}/{w.totalSeen}
                          </p>
                        </div>
                        <span style={{ fontSize: 18, color: 'rgba(0,212,255,0.35)', marginLeft: 4 }}>{isExp ? '▲' : '▼'}</span>
                      </div>

                      {/* Drill-down: per-student */}
                      {isExp && (
                        <div style={{ padding: '0 14px 12px', borderTop: '1px solid rgba(247,37,133,0.1)' }}
                             onClick={e => e.stopPropagation()}>
                          <p style={{ ...C.label, color: 'rgba(247,37,133,0.5)', margin: '10px 0 8px' }}>各学生表现</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {w.students.sort((a, b) => b.rate - a.rate).map(sd => (
                              <div key={sd.name} style={{
                                display: 'flex', alignItems: 'center', gap: 10, fontSize: 20,
                                padding: '8px 12px', borderRadius: 10,
                                background: sd.rate >= 60 ? 'rgba(247,37,133,0.05)' : sd.rate >= 30 ? 'rgba(255,214,10,0.04)' : 'rgba(6,214,160,0.04)',
                              }}>
                                <span style={{ fontWeight: 700, color: '#e8f4ff', minWidth: 90 }}>{sd.name}</span>
                                <MiniBar value={sd.rate} max={100}
                                         color={sd.rate >= 60 ? '#f72585' : sd.rate >= 30 ? '#ffd60a' : '#06d6a0'} />
                                <span style={{ fontWeight: 900, fontSize: 20, minWidth: 46, textAlign: 'right',
                                               color: sd.rate >= 60 ? '#f72585' : sd.rate >= 30 ? '#ffd60a' : '#06d6a0' }}>
                                  {sd.rate}%
                                </span>
                                <span style={{ fontSize: 16, color: 'rgba(200,220,255,0.3)', fontFamily: 'monospace', minWidth: 72, textAlign: 'right' }}>
                                  错 {sd.wrong}/{sd.seen}
                                </span>
                              </div>
                            ))}
                            {/* Students who never practiced this word */}
                            {(() => {
                              const tried = new Set(w.students.map(s => s.name))
                              const never = students.filter(s => !tried.has(s.name)).map(s => s.name)
                              return never.length > 0 && (
                                <p style={{ fontSize: 16, color: 'rgba(200,220,255,0.22)', marginTop: 6, padding: '4px 12px', lineHeight: 1.5 }}>
                                  未练习：{never.join('、')}
                                </p>
                              )
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════ TAB: COVERAGE ════════ */}
        {tab === 'coverage' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 18, color: 'rgba(200,220,255,0.3)', fontFamily: 'monospace' }}>
              颜色 🟢绿 ≥70% · 🟡黄 30-69% · 🟠橙 1-29% · 灰 未练习。悬停查看详情。
            </p>
            <div style={{ borderRadius: 14, overflowX: 'auto', border: '1px solid rgba(0,212,255,0.09)' }}>
              <table style={{ width: '100%', minWidth: 520, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,212,255,0.05)', borderBottom: '1px solid rgba(0,212,255,0.09)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 18, fontWeight: 700, color: 'rgba(0,212,255,0.5)' }}>
                      学生
                    </th>
                    {ALL_UNITS.map((u, i) => (
                      <th key={i} style={{ padding: '12px 8px', textAlign: 'center', fontSize: 18, fontWeight: 700, color: UNIT_HEX[i] }}>
                        单元{UNIT_LABELS[i]}<br/>
                        <span style={{ color: 'rgba(200,220,255,0.28)', fontWeight: 400 }}>{u.vocabs.length}词</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {coverageRows.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: 'rgba(200,220,255,0.3)', fontSize: 20 }}>暂无数据</td></tr>
                  ) : (
                    <>
                      {coverageRows.map(({ name, units }) => (
                        <tr key={name} style={{ borderBottom: '1px solid rgba(0,212,255,0.05)' }}>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ fontSize: 22, fontWeight: 700, color: '#e8f4ff' }}>{name}</span>
                          </td>
                          {units.map((u, i) => <CellPct key={i} u={u} i={i} />)}
                        </tr>
                      ))}
                      {/* Class average */}
                      <tr style={{ borderTop: '2px solid rgba(0,212,255,0.14)', background: 'rgba(0,212,255,0.035)' }}>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: 20, fontWeight: 900, color: '#00d4ff' }}>📊 班级平均</span>
                        </td>
                        {coverageAvg.map((u, i) => <CellPct key={i} u={u} i={i} />)}
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════ TAB: TRENDS ════════ */}
        {tab === 'trends' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* 7-day activity bar chart */}
            <div style={{ borderRadius: 14, padding: 16, background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)' }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#00d4ff', marginBottom: 14 }}>📅 近 7 天登录活跃</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140 }}>
                {activity7.map(({ label, count }) => {
                  const maxCount = Math.max(...activity7.map(d => d.count), 1)
                  const barH = count > 0 ? Math.max(10, Math.round((count / maxCount) * 100)) : 5
                  const pct  = total > 0 ? Math.round((count / total) * 100) : 0
                  return (
                    <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                      {count > 0 && <span style={{ fontSize: 18, fontWeight: 900, color: '#00d4ff' }}>{count}</span>}
                      <div style={{ width: '100%', height: barH, borderRadius: '4px 4px 0 0',
                                    background: count > 0 ? 'linear-gradient(180deg,#00d4ff,rgba(0,212,255,0.35))' : 'rgba(255,255,255,0.05)',
                                    boxShadow: count > 0 ? '0 0 8px rgba(0,212,255,0.35)' : 'none', transition: 'height .4s' }} />
                      <span style={{ fontSize: 15, color: 'rgba(200,220,255,0.4)', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
                      {pct > 0 && <span style={{ fontSize: 16, color: 'rgba(0,212,255,0.5)' }}>{pct}%</span>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* XP level distribution */}
            <div style={{ borderRadius: 14, padding: 16, background: 'rgba(255,214,10,0.04)', border: '1px solid rgba(255,214,10,0.1)' }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#ffd60a', marginBottom: 14 }}>⚡ 等级分布</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {xpBuckets.map(b => {
                  const maxC = Math.max(...xpBuckets.map(x => x.count), 1)
                  const w    = b.count > 0 ? Math.max(3, Math.round((b.count / maxC) * 100)) : 0
                  return (
                    <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: b.color, minWidth: 80 }}>{b.label}</span>
                      <MiniBar value={w} max={100} color={b.color} height={16} />
                      <span style={{ fontSize: 20, fontWeight: 900, color: b.color, minWidth: 24, textAlign: 'right' }}>{b.count}</span>
                      <span style={{ fontSize: 16, color: 'rgba(200,220,255,0.28)', fontFamily: 'monospace', minWidth: 40 }}>
                        {total > 0 ? `${Math.round((b.count / total) * 100)}%` : ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Unit completion rates */}
            <div style={{ borderRadius: 14, padding: 16, background: 'rgba(6,214,160,0.04)', border: '1px solid rgba(6,214,160,0.1)' }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#06d6a0', marginBottom: 14 }}>⚔️ 各单元游戏完成率</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 12 }}>
                {unitStats.map((u, i) => {
                  const t = total || 1
                  const rows = [
                    ['⚔️ 词语对战通关', u.bossCleared, '#ff6b35'],
                    ['🔗 词义配对玩过', u.matchPlayed, '#9b5de5'],
                    ['🥉 学徒关卡',     u.ap,          '#cd7f32'],
                    ['🥈 武士关卡',     u.wa,          '#c0c0c0'],
                    ['🥇 宗师关卡',     u.gm,          '#ffd60a'],
                  ]
                  return (
                    <div key={u.unitNum} style={{ borderRadius: 11, padding: '14px 16px',
                                                  background: `${UNIT_HEX[i]}08`, border: `1px solid ${UNIT_HEX[i]}22` }}>
                      <p style={{ fontSize: 20, fontWeight: 900, color: UNIT_HEX[i], marginBottom: 10 }}>
                        单元{UNIT_LABELS[i]}《{u.title}》
                      </p>
                      {rows.map(([label, count, col]) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                          <span style={{ fontSize: 18, color: 'rgba(200,220,255,0.45)', minWidth: 120 }}>{label}</span>
                          <MiniBar value={count} max={t} color={col} height={7} />
                          <span style={{ fontSize: 18, fontWeight: 700, color: col, minWidth: 44, textAlign: 'right' }}>
                            {count}/{total}
                          </span>
                        </div>
                      ))}
                      {u.avgMatch !== null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 4 }}>
                          <span style={{ fontSize: 18, color: 'rgba(200,220,255,0.45)', minWidth: 120 }}>🎯 平均配对率</span>
                          <span style={{ fontSize: 20, fontWeight: 900, color: '#9b5de5' }}>{u.avgMatch}%</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Achievement unlock rates */}
            <div style={{ borderRadius: 14, padding: 16, background: 'rgba(192,132,252,0.04)', border: '1px solid rgba(192,132,252,0.1)' }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#c084fc', marginBottom: 14 }}>🏆 成就解锁率</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
                {achStats.map(a => {
                  const rate = total > 0 ? Math.round((a.count / total) * 100) : 0
                  return (
                    <div key={a.id} style={{ borderRadius: 10, padding: '12px 14px',
                                             background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(192,132,252,0.14)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 22 }}>{a.emoji}</span>
                        <span style={{ fontSize: 18, fontWeight: 700, color: 'rgba(200,220,255,0.65)', flex: 1 }}>{a.label}</span>
                        <span style={{ fontSize: 22, fontWeight: 900, color: '#c084fc' }}>{rate}%</span>
                      </div>
                      <MiniBar value={rate} max={100} color="#c084fc" height={7} />
                      <p style={{ fontSize: 16, color: 'rgba(200,220,255,0.28)', marginTop: 6 }}>
                        {a.count}/{total} 人解锁
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top performers quick glance */}
            {students.length > 0 && (
              <div style={{ borderRadius: 14, padding: 16, background: 'rgba(255,214,10,0.04)', border: '1px solid rgba(255,214,10,0.12)' }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: '#ffd60a', marginBottom: 12 }}>🌟 班级精英</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10 }}>
                  {[
                    { label: '🥇 XP 冠军',    value: [...students].sort((a,b)=>(b.xp||0)-(a.xp||0))[0], sub: s => `${(s.xp||0).toLocaleString()} XP` },
                    { label: '🔥 连续登录王', value: [...students].sort((a,b)=>(b.streak||0)-(a.streak||0))[0], sub: s => `${s.streak||1} 天` },
                    { label: '🎯 掌握率最高', value: [...students].filter(s=>computeMasteryRate(s)!==null).sort((a,b)=>(computeMasteryRate(b)||0)-(computeMasteryRate(a)||0))[0], sub: s => `${computeMasteryRate(s)}%` },
                    { label: '📅 最勤登录',   value: [...students].sort((a,b)=>(b.totalLogins||0)-(a.totalLogins||0))[0], sub: s => `${s.totalLogins||1} 次` },
                  ].filter(item => item.value).map(item => {
                    const lvl = getLevelInfo(item.value.xp || 0)
                    return (
                      <div key={item.label} style={{
                        display: 'flex', alignItems: 'center', gap: 12, borderRadius: 10,
                        padding: '12px 16px', background: 'rgba(255,214,10,0.06)', border: '1px solid rgba(255,214,10,0.15)',
                      }}>
                        <span style={{ fontSize: 28 }}>{lvl.current.emoji}</span>
                        <div>
                          <p style={{ fontSize: 16, color: 'rgba(255,214,10,0.55)', fontWeight: 700, marginBottom: 3 }}>{item.label}</p>
                          <p style={{ fontSize: 22, fontWeight: 900, color: '#e8f4ff' }}>{item.value.name}</p>
                          <p style={{ fontSize: 18, color: '#ffd60a', fontFamily: 'monospace' }}>{item.sub(item.value)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Unit mastery comparison bars ── */}
            <div style={{ borderRadius: 14, padding: 16, background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)' }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#00d4ff', marginBottom: 14 }}>📊 各单元掌握率对比</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {unitMasteryRates.map((u, i) => (
                  <div key={u.unitNum} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 17, fontWeight: 700, color: UNIT_HEX[i], minWidth: 90 }}>单元{UNIT_LABELS[i]}</span>
                    <MiniBar value={u.rate ?? 0} max={100} color={masteryColor(u.rate)} height={14} />
                    <span style={{ fontSize: 20, fontWeight: 900, color: masteryColor(u.rate), minWidth: 48, textAlign: 'right' }}>
                      {u.rate !== null ? `${u.rate}%` : '—'}
                    </span>
                    <span style={{ fontSize: 15, color: 'rgba(200,220,255,0.3)', minWidth: 90, fontFamily: 'monospace' }}>
                      《{u.title}》
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ════════ TAB: HEATMAP ════════ */}
        {tab === 'heatmap' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Unit selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 18, color: 'rgba(200,220,255,0.4)', fontWeight: 700 }}>单元：</span>
              {ALL_UNITS.map((u, i) => (
                <button key={i} onClick={() => setHmUnit(i+1)} style={{
                  fontSize: 17, padding: '10px 18px', borderRadius: 99, fontWeight: 700, cursor: 'pointer',
                  background: hmUnit===i+1 ? `${UNIT_HEX[i]}25` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${hmUnit===i+1 ? UNIT_HEX[i] : 'rgba(255,255,255,0.08)'}`,
                  color: hmUnit===i+1 ? UNIT_HEX[i] : 'rgba(200,220,255,0.38)',
                }}>
                  单元{UNIT_LABELS[i]}
                </button>
              ))}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 15, alignItems: 'center' }}>
              {[
                ['rgba(200,220,255,0.06)','rgba(200,220,255,0.1)','未练习'],
                ['rgba(247,37,133,0.22)','#f72585','错误 ≥60%'],
                ['rgba(255,214,10,0.22)','#ffd60a','错误 30–59%'],
                ['rgba(0,212,255,0.18)','#00d4ff','错误 <30%'],
                ['rgba(6,214,160,0.22)','#06d6a0','已掌握（绿光）'],
              ].map(([bg,bdr,lbl]) => (
                <div key={lbl} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:16, height:16, borderRadius:3, background:bg, border:`1px solid ${bdr}` }} />
                  <span style={{ color:'rgba(200,220,255,0.45)' }}>{lbl}</span>
                </div>
              ))}
              <span style={{ color:'rgba(200,220,255,0.28)', marginLeft:'auto', fontSize:14 }}>数字 = 错误率%，✓ = 已练无错</span>
            </div>

            {/* Heatmap table */}
            {(() => {
              const unit = ALL_UNITS[hmUnit-1]
              const unitColor = UNIT_HEX[hmUnit-1]
              if (!unit) return null
              return (
                <div style={{ borderRadius: 14, overflow: 'auto', border: `1px solid ${unitColor}22` }}>
                  <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
                    <thead>
                      <tr style={{ background: `${unitColor}0a`, borderBottom: `1px solid ${unitColor}22` }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 17, fontWeight: 700, color: 'rgba(200,220,255,0.5)', minWidth: 100, whiteSpace: 'nowrap' }}>学生</th>
                        {unit.vocabs.map(v => (
                          <th key={v.id} title={`${v.hanzi} ${v.pinyin}\n${v.definition}`}
                              style={{ padding: '8px 3px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: unitColor, minWidth: 36 }}>
                            <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {v.hanzi}
                            </div>
                          </th>
                        ))}
                        <th style={{ padding: '12px 10px', textAlign: 'center', fontSize: 15, fontWeight: 700, color: 'rgba(200,220,255,0.4)' }}>掌握率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.length === 0 ? (
                        <tr><td colSpan={unit.vocabs.length+2} style={{ padding: 40, textAlign:'center', color:'rgba(200,220,255,0.3)', fontSize:18 }}>暂无学生数据</td></tr>
                      ) : filteredStudents.map(s => {
                        const m = s.wordMastery?.[String(hmUnit)] || {}
                        let ts=0,tc=0
                        unit.vocabs.forEach(v => { const e=m[String(v.id)]; if(e?.seen){ts+=e.seen;tc+=e.correct||0} })
                        const unitRate = ts>0 ? Math.round((tc/ts)*100) : null
                        return (
                          <tr key={s.name} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                            <td style={{ padding: '6px 14px', fontWeight: 700, fontSize: 17, color: '#e8f4ff', whiteSpace: 'nowrap',
                                          textDecoration: 'underline dotted', cursor: 'pointer' }}
                                onClick={() => setSelectedStudent(s)}>
                              {s.name}
                            </td>
                            {unit.vocabs.map(v => (
                              <td key={v.id} style={{ padding: '4px 3px', textAlign: 'center' }}>
                                <WordBubble vocab={v} entry={m[String(v.id)]} />
                              </td>
                            ))}
                            <td style={{ padding: '6px 10px', textAlign:'center', fontSize:17, fontWeight:900, color: masteryColor(unitRate) }}>
                              {unitRate !== null ? `${unitRate}%` : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: `2px solid ${unitColor}25`, background: `${unitColor}06` }}>
                        <td style={{ padding: '8px 14px', fontWeight: 900, fontSize: 16, color: unitColor }}>班级平均</td>
                        {unit.vocabs.map(v => {
                          let ts=0,tw=0
                          filteredStudents.forEach(s => { const e=s.wordMastery?.[String(hmUnit)]?.[String(v.id)]; if(e?.seen){ts+=e.seen;tw+=e.wrong||0} })
                          const avg = ts>0 ? { seen:ts, wrong:tw, correct:ts-tw } : null
                          return (
                            <td key={v.id} style={{ padding:'4px 3px', textAlign:'center' }}>
                              <WordBubble vocab={v} entry={avg} />
                            </td>
                          )
                        })}
                        <td style={{ padding:'8px 10px', textAlign:'center', fontSize:17, fontWeight:900, color: masteryColor(unitMasteryRates[hmUnit-1]?.rate) }}>
                          {unitMasteryRates[hmUnit-1]?.rate != null ? `${unitMasteryRates[hmUnit-1].rate}%` : '—'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            })()}
          </div>
        )}

        {/* ════════ TAB: WORD SEARCH ════════ */}
        {tab === 'wordsearch' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            <input
              value={wordSearch}
              onChange={e => setWordSearch(e.target.value)}
              placeholder="🔍 输入汉字、拼音或词义搜索任意词汇…"
              autoFocus
              style={{
                fontSize: 20, padding: '14px 22px', borderRadius: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
                background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.3)', color: '#e8f4ff',
              }}
            />

            {!wordSearch.trim() && (
              <p style={{ textAlign: 'center', padding: 40, color: 'rgba(200,220,255,0.28)', fontSize: 18, lineHeight: 1.7 }}>
                搜索任意词汇，查看<strong style={{ color: 'rgba(200,220,255,0.5)' }}>全班同学</strong>对该词的掌握情况<br/>
                支持汉字 / 拼音 / 词义 三种搜索方式
              </p>
            )}

            {wordSearch.trim() && wordResults.length === 0 && (
              <p style={{ textAlign: 'center', padding: 40, color: 'rgba(200,220,255,0.28)', fontSize: 18 }}>
                未找到匹配词汇
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {wordResults.map(vocab => (
                <div key={vocab.id} style={{ borderRadius: 14, overflow: 'hidden',
                                             background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.1)' }}>
                  {/* Vocab header */}
                  <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
                                background: 'rgba(0,212,255,0.05)' }}>
                    <div>
                      <span style={{ fontSize: 36, fontWeight: 900, color: '#e8f4ff' }}>{vocab.hanzi}</span>
                      <span style={{ fontSize: 20, color: '#00d4ff', marginLeft: 12, fontFamily: 'monospace' }}>{vocab.pinyin}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 18, color: 'rgba(200,220,255,0.65)', lineHeight: 1.4 }}>{vocab.definition}</p>
                      <p style={{ fontSize: 16, color: UNIT_HEX[vocab.unitNum - 1], marginTop: 4 }}>
                        单元{UNIT_LABELS[vocab.unitNum - 1]}《{vocab.unitTitle}》
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 26, fontWeight: 900,
                                  color: vocab.perStudent.length === 0 ? 'rgba(200,220,255,0.2)'
                                       : vocab.avgRate >= 60 ? '#f72585' : vocab.avgRate >= 30 ? '#ffd60a' : '#06d6a0' }}>
                        {vocab.perStudent.length > 0 ? `${vocab.avgRate}%` : '—'}
                      </p>
                      <p style={{ fontSize: 16, color: 'rgba(200,220,255,0.3)', fontFamily: 'monospace' }}>
                        {vocab.perStudent.length}/{total} 人练习
                      </p>
                    </div>
                  </div>

                  {/* Per-student breakdown */}
                  {vocab.perStudent.length > 0 ? (
                    <div style={{ padding: '10px 20px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {vocab.perStudent.map(sd => (
                        <div key={sd.name} style={{
                          display: 'flex', alignItems: 'center', gap: 10, fontSize: 20,
                          padding: '8px 12px', borderRadius: 10,
                          background: sd.rate >= 60 ? 'rgba(247,37,133,0.05)' : sd.rate >= 30 ? 'rgba(255,214,10,0.04)' : 'rgba(6,214,160,0.04)',
                        }}>
                          <span style={{ fontWeight: 700, color: '#e8f4ff', minWidth: 90 }}>{sd.name}</span>
                          <MiniBar value={sd.rate} max={100}
                                   color={sd.rate >= 60 ? '#f72585' : sd.rate >= 30 ? '#ffd60a' : '#06d6a0'} />
                          <span style={{ fontWeight: 900, fontSize: 20, minWidth: 46, textAlign: 'right',
                                         color: sd.rate >= 60 ? '#f72585' : sd.rate >= 30 ? '#ffd60a' : '#06d6a0' }}>
                            {sd.rate}%
                          </span>
                          <span style={{ fontSize: 16, color: 'rgba(200,220,255,0.28)', fontFamily: 'monospace', minWidth: 72, textAlign: 'right' }}>
                            错 {sd.wrong}/{sd.seen}
                          </span>
                        </div>
                      ))}
                      {/* Never practiced */}
                      {(() => {
                        const tried = new Set(vocab.perStudent.map(d => d.name))
                        const never = students.filter(s => !tried.has(s.name)).map(s => s.name)
                        return never.length > 0 && (
                          <p style={{ fontSize: 16, color: 'rgba(200,220,255,0.2)', marginTop: 6, padding: '4px 12px', lineHeight: 1.6 }}>
                            未练习：{never.join('、')}
                          </p>
                        )
                      })()}
                    </div>
                  ) : (
                    <p style={{ padding: '10px 20px 16px', fontSize: 18, color: 'rgba(200,220,255,0.28)' }}>
                      暂无同学练习过此词
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>

    {/* ── Student detail modal ── */}
    {selectedStudent && (
      <StudentModal
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
        xpRank={xpRankMap[selectedStudent.name] ?? 0}
        total={total}
      />
    )}
    </>
  )
}
