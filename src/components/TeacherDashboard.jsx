import { useState, useEffect, useCallback, useMemo } from 'react'
import unit1 from '../data/unit1.json'
import unit2 from '../data/unit2.json'
import unit3 from '../data/unit3.json'
import unit4 from '../data/unit4.json'
import unit5 from '../data/unit5.json'
import unit6 from '../data/unit6.json'

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

function fmtRelative(ts) {
  if (!ts) return '从未'
  const d = Math.floor((Date.now() - ts) / 86400000)
  if (d === 0) return '今天'; if (d === 1) return '昨天'; if (d <= 6) return `${d} 天前`
  return new Date(ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

/* Local YYYY-MM-DD for the last N days, oldest → newest */
function lastNDays(n) {
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    out.push({
      key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      day:   d.getDate(),
      month: d.getMonth() + 1,
      dow:   d.getDay(),
    })
  }
  return out
}

/* The six unit tabs plus 复习 — ids match trackModeUse() calls */
const MODES = [
  { id: 'vocab',       label: '词汇', emoji: '📚', color: '#00d4ff', desc: '展开词卡学习' },
  { id: 'sentence',    label: '造句', emoji: '🖊️', color: '#ffd60a', desc: 'AI 批改造句' },
  { id: 'match',       label: '配对', emoji: '🔗', color: '#9b5de5', desc: '词义配对' },
  { id: 'boss',        label: '斗争', emoji: '⚔️', color: '#f72585', desc: '词语斗争闯关' },
  { id: 'writing',     label: '释义', emoji: '✍️', color: '#c084fc', desc: 'AI 批改释义' },
  { id: 'handwriting', label: '写字', emoji: '🖌️', color: '#06d6a0', desc: '田字格默写' },
  { id: 'review',      label: '复习', emoji: '📖', color: '#34d399', desc: '今日复习卡' },
]

function rateColor(rate) {
  return rate >= 60 ? '#f72585' : rate >= 30 ? '#ffd60a' : '#00d4ff'
}

function SortBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 18, padding: '11px 20px', borderRadius: 99, fontWeight: 800, cursor: 'pointer',
      background: active ? 'rgba(247,37,133,0.16)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${active ? 'rgba(247,37,133,0.5)' : 'rgba(255,255,255,0.1)'}`,
      color: active ? '#f72585' : 'rgba(200,220,255,0.5)',
      transition: 'all .15s',
    }}>{label}</button>
  )
}

/* ── One hard word, expandable to show which students struggle ── */
function HardWordRow({ word }) {
  const [open, setOpen] = useState(false)
  const rate = word.totalSeen > 0 ? Math.round((word.totalWrong / word.totalSeen) * 100) : 0
  const color = rateColor(rate)
  const strugglers = [...word.students].sort((a, b) => b.rate - a.rate)
  const unitColor = UNIT_HEX[word.unitNum - 1]

  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{
        borderRadius: 16, cursor: 'pointer', overflow: 'hidden',
        background: open ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${open ? `${color}45` : 'rgba(255,255,255,0.07)'}`,
        transition: 'all .15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
        <span style={{ fontSize: 36, fontWeight: 900, color: '#e8f4ff', minWidth: 78 }}>{word.hanzi}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 18, color: 'rgba(200,220,255,0.55)', fontFamily: 'monospace' }}>{word.pinyin}</p>
          <p style={{ fontSize: 16, color: 'rgba(200,220,255,0.4)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {word.definition}
          </p>
        </div>
        <span style={{
          fontSize: 14, fontWeight: 800, padding: '4px 10px', borderRadius: 99, flexShrink: 0,
          background: `${unitColor}18`, border: `1px solid ${unitColor}40`, color: unitColor,
        }}>
          单元{UNIT_LABELS[word.unitNum - 1]}
        </span>
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 90 }}>
          <p style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1 }}>{rate}%</p>
          <p style={{ fontSize: 14, color: 'rgba(200,220,255,0.4)', marginTop: 3 }}>{strugglers.length} 位学生答错</p>
        </div>
        <span style={{ fontSize: 20, color: 'rgba(200,220,255,0.35)', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ padding: '0 20px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {strugglers.map(s => (
            <span key={s.name} style={{
              fontSize: 16, fontWeight: 700, padding: '6px 14px', borderRadius: 99,
              background: `${rateColor(s.rate)}14`, border: `1px solid ${rateColor(s.rate)}40`, color: rateColor(s.rate),
            }}>
              {s.name} · 错 {s.wrong}/{s.seen} 次 ({s.rate}%)
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ══════════════ MAIN DASHBOARD — 难词报告 ══════════════ */
export default function TeacherDashboard({ onClose }) {
  const [students,    setStudents]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [unitFilter,  setUnitFilter]  = useState(0)      // 0 = all units
  const [sortBy,      setSortBy]      = useState('rate')  // rate | count
  const [search,      setSearch]      = useState('')
  const [tab,         setTab]         = useState('words') // words | attendance | usage

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

  /* Aggregate wrong-answer stats per word across the whole class */
  const hardWords = useMemo(() => {
    const agg = {}
    students.forEach(student => {
      Object.entries(student.wordMastery || {}).forEach(([unitNum, unitM]) => {
        if (unitFilter && String(unitFilter) !== unitNum) return
        Object.entries(unitM).forEach(([vocabId, m]) => {
          if (!m.seen || !m.wrong) return
          const vocab = VOCAB_MAP[vocabId]; if (!vocab) return
          if (!agg[vocabId]) agg[vocabId] = { ...vocab, totalSeen: 0, totalWrong: 0, students: [] }
          agg[vocabId].totalSeen  += m.seen
          agg[vocabId].totalWrong += m.wrong
          agg[vocabId].students.push({ name: student.name, seen: m.seen, wrong: m.wrong, rate: Math.round((m.wrong / m.seen) * 100) })
        })
      })
    })
    let words = Object.values(agg)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      words = words.filter(w => w.hanzi.includes(q) || w.pinyin.toLowerCase().includes(q) || w.definition.includes(q))
    }
    if (sortBy === 'rate') words.sort((a, b) => (b.totalWrong / b.totalSeen) - (a.totalWrong / a.totalSeen))
    else                   words.sort((a, b) => b.students.length - a.students.length)
    return words
  }, [students, unitFilter, sortBy, search])

  /* ── 30-day attendance ───────────────────────────────── */
  const days = useMemo(() => lastNDays(30), [])
  const attendance = useMemo(() => {
    const todayKey = days[days.length - 1]?.key
    const rows = students.map(s => {
      const set = new Set(s.loginDates || [])
      const present = days.map(d => set.has(d.key))
      return {
        name: s.name,
        present,
        activeDays: present.filter(Boolean).length,
        onToday: set.has(todayKey),
      }
    }).sort((a, b) => b.activeDays - a.activeDays || a.name.localeCompare(b.name, 'zh'))
    return {
      rows,
      onlineToday: rows.filter(r => r.onToday).length,
      avgDays: rows.length ? (rows.reduce((s, r) => s + r.activeDays, 0) / rows.length).toFixed(1) : '0',
      neverActive: rows.filter(r => r.activeDays === 0).length,
    }
  }, [students, days])

  /* ── Mode usage across the class ─────────────────────── */
  const usage = useMemo(() => {
    const rows = MODES.map(m => {
      let count = 0, users = 0
      students.forEach(s => {
        const n = s.modeUsage?.[m.id] || 0
        if (n > 0) { count += n; users += 1 }
      })
      return { ...m, count, users }
    })
    const total = rows.reduce((s, r) => s + r.count, 0)
    const max   = Math.max(1, ...rows.map(r => r.count))
    return { rows: [...rows].sort((a, b) => b.count - a.count), total, max }
  }, [students])

  /* Export whichever view the teacher is looking at */
  function exportCSV() {
    let headers, rows, filename
    if (tab === 'attendance') {
      filename = '出勤记录'
      headers  = ['姓名', '30天出勤天数', '今日在线', ...days.map(d => `${d.month}/${d.day}`)]
      rows     = attendance.rows.map(r => [r.name, r.activeDays, r.onToday ? '是' : '否',
                                           ...r.present.map(p => (p ? '1' : ''))])
    } else if (tab === 'usage') {
      filename = '模式使用'
      headers  = ['模式', '练习次数', '占比%', '使用人数']
      rows     = usage.rows.map(m => [`${m.emoji} ${m.label}`, m.count,
                                      usage.total ? Math.round((m.count / usage.total) * 100) : 0, m.users])
    } else {
      filename = '常错词语'
      headers  = ['词语', '拼音', '释义', '单元', '错误率%', '答错学生数', '答错学生详情']
      rows     = hardWords.map(w => {
        const rate = w.totalSeen > 0 ? Math.round((w.totalWrong / w.totalSeen) * 100) : 0
        return [w.hanzi, w.pinyin, w.definition, `单元${UNIT_LABELS[w.unitNum - 1]}`, rate,
                w.students.length, w.students.map(s => `${s.name}(${s.rate}%)`).join('; ')]
      })
    }
    const csv  = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const TABS = [
    { id: 'words',      label: '🔴 常错词语' },
    { id: 'attendance', label: '📅 出勤记录' },
    { id: 'usage',      label: '🎮 模式使用' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', background: 'rgba(3,6,16,0.98)', backdropFilter: 'blur(22px)',
    }}>

      {/* ── Header ── */}
      <div style={{
        flexShrink: 0, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10,
        background: 'rgba(255,214,10,0.05)', borderBottom: '1px solid rgba(255,214,10,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 38 }}>🎓</span>
          <div>
            <p style={{ fontWeight: 900, fontSize: 26, color: '#ffd60a',
                        textShadow: '0 0 20px rgba(255,214,10,0.6)', lineHeight: 1.15 }}>
              教师控制台
            </p>
            <p style={{ fontSize: 17, fontFamily: 'monospace', color: 'rgba(255,214,10,0.45)', marginTop: 2 }}>
              {students.length} 位学生 · {lastRefresh ? `更新于 ${fmtRelative(lastRefresh)}` : '加载中…'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={exportCSV} style={{
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

      {/* ── Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {error && (
          <div style={{ borderRadius: 12, padding: '14px 20px', fontSize: 20, fontWeight: 600,
                        background: 'rgba(247,37,133,0.1)', border: '1px solid rgba(247,37,133,0.3)', color: '#f72585' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              fontSize: 19, padding: '13px 26px', borderRadius: 14, fontWeight: 900, cursor: 'pointer',
              background: tab === t.id ? 'rgba(255,214,10,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${tab === t.id ? 'rgba(255,214,10,0.4)' : 'rgba(255,255,255,0.08)'}`,
              color: tab === t.id ? '#ffd60a' : 'rgba(200,220,255,0.45)',
              transition: 'all .15s',
            }}>{t.label}</button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 64, color: 'rgba(200,220,255,0.35)', fontSize: 22 }}>
            ⏳ 加载中…
          </div>
        )}

        {!loading && students.length === 0 && (
          <div style={{ textAlign: 'center', padding: 64, color: 'rgba(200,220,255,0.35)', fontSize: 22 }}>
            还没有学生数据，学生登录后自动同步。
          </div>
        )}

        {/* ════════ COMMON MISTAKES ════════ */}
        {!loading && students.length > 0 && tab === 'words' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="🔍 搜索词语、拼音或释义…"
                style={{
                  fontSize: 18, padding: '12px 22px', borderRadius: 99, outline: 'none', minWidth: 240,
                  background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.3)',
                  color: '#e8f4ff', fontWeight: 700,
                }}
              />
              <SortBtn label="错误率优先" active={sortBy === 'rate'}  onClick={() => setSortBy('rate')} />
              <SortBtn label="困难人数优先" active={sortBy === 'count'} onClick={() => setSortBy('count')} />
              <span style={{ marginLeft: 'auto', fontSize: 17, fontFamily: 'monospace', color: 'rgba(200,220,255,0.35)' }}>
                共 {hardWords.length} 个常错词
              </span>
            </div>

            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {[0, 1, 2, 3, 4, 5, 6].map(n => (
                <button key={n} onClick={() => setUnitFilter(n)} style={{
                  fontSize: 16, padding: '9px 16px', borderRadius: 99, fontWeight: 700, cursor: 'pointer',
                  background: unitFilter === n ? 'rgba(0,212,255,0.14)' : 'rgba(0,212,255,0.04)',
                  border: `1px solid ${unitFilter === n ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.14)'}`,
                  color: unitFilter === n ? '#00d4ff' : 'rgba(200,220,255,0.4)',
                }}>
                  {n === 0 ? '全部单元' : `单元${UNIT_LABELS[n - 1]}`}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {hardWords.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 64, fontSize: 22, color: '#06d6a0' }}>
                  {search || unitFilter ? '没有符合条件的常错词语 🎉' : '太棒了！全班目前没有常错的词语 🎉'}
                </div>
              ) : (
                hardWords.map(w => <HardWordRow key={`${w.unitNum}-${w.id}`} word={w} />)
              )}
            </div>
          </>
        )}

        {/* ════════ 30-DAY ATTENDANCE ════════ */}
        {!loading && students.length > 0 && tab === 'attendance' && (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                ['🟢', '今日在线', attendance.onlineToday, '#06d6a0'],
                ['📊', '人均活跃天数', attendance.avgDays, '#00d4ff'],
                ['😴', '30天内从未登录', attendance.neverActive, attendance.neverActive ? '#f72585' : '#06d6a0'],
              ].map(([em, label, val, col]) => (
                <div key={label} style={{
                  flex: 1, minWidth: 190, borderRadius: 14, padding: '14px 18px',
                  background: 'rgba(255,255,255,0.03)', border: `1px solid ${col}30`,
                }}>
                  <p style={{ fontSize: 15, color: 'rgba(200,220,255,0.45)', fontWeight: 700 }}>{em} {label}</p>
                  <p style={{ fontSize: 30, fontWeight: 900, color: col, lineHeight: 1.2 }}>{val}</p>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 15, color: 'rgba(200,220,255,0.4)', fontFamily: 'monospace' }}>
              最近 30 天 · 左旧右新 · 绿点 = 当天有登录 · 按活跃天数排序
            </p>

            <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid rgba(0,212,255,0.1)' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,212,255,0.06)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 17, fontWeight: 900,
                                 color: 'rgba(0,212,255,0.7)', position: 'sticky', left: 0,
                                 background: '#0a1020', minWidth: 150 }}>姓名</th>
                    <th style={{ padding: '12px 10px', fontSize: 16, fontWeight: 900, color: 'rgba(0,212,255,0.7)' }}>天数</th>
                    {days.map(d => (
                      <th key={d.key} title={d.key} style={{
                        padding: '10px 2px', fontSize: 12, fontWeight: 700, minWidth: 22,
                        color: d.dow === 0 || d.dow === 6 ? 'rgba(247,37,133,0.5)' : 'rgba(200,220,255,0.3)',
                      }}>
                        {d.day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {attendance.rows.map(r => (
                    <tr key={r.name} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 16px', fontSize: 19, fontWeight: 800,
                                   color: r.onToday ? '#06d6a0' : r.activeDays === 0 ? 'rgba(200,220,255,0.3)' : '#e8f4ff',
                                   position: 'sticky', left: 0, background: '#0a1020', whiteSpace: 'nowrap' }}>
                        {r.onToday && '🟢 '}{r.name}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'center', fontSize: 18, fontWeight: 900,
                                   color: r.activeDays >= 15 ? '#06d6a0' : r.activeDays >= 5 ? '#ffd60a' : '#f72585' }}>
                        {r.activeDays}
                      </td>
                      {r.present.map((p, i) => (
                        <td key={i} style={{ padding: '5px 2px', textAlign: 'center' }}>
                          <div title={`${days[i].key}${p ? ' · 已登录' : ''}`} style={{
                            width: 15, height: 15, borderRadius: 4, margin: '0 auto',
                            background: p ? '#06d6a0' : 'rgba(255,255,255,0.05)',
                            boxShadow: p ? '0 0 6px rgba(6,214,160,0.6)' : 'none',
                          }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ════════ MODE USAGE ════════ */}
        {!loading && students.length > 0 && tab === 'usage' && (
          <>
            <p style={{ fontSize: 15, color: 'rgba(200,220,255,0.4)', fontFamily: 'monospace' }}>
              全班练习次数 · 共 {usage.total.toLocaleString()} 次 · 按使用最多排序
            </p>

            {usage.total === 0 ? (
              <div style={{ textAlign: 'center', padding: 64, fontSize: 20, color: 'rgba(200,220,255,0.4)', lineHeight: 1.8 }}>
                📊 还没有使用记录。<br />
                <span style={{ fontSize: 17 }}>这项统计从今天开始记录，学生练习后就会出现。</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {usage.rows.map(m => {
                  const pct = usage.total ? Math.round((m.count / usage.total) * 100) : 0
                  return (
                    <div key={m.id} style={{
                      borderRadius: 14, padding: '14px 18px',
                      background: 'rgba(255,255,255,0.02)', border: `1px solid ${m.color}25`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 24 }}>{m.emoji}</span>
                        <span style={{ fontSize: 21, fontWeight: 900, color: m.color }}>{m.label}</span>
                        <span style={{ fontSize: 15, color: 'rgba(200,220,255,0.35)' }}>{m.desc}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 26, fontWeight: 900, color: m.color }}>
                          {pct}%
                        </span>
                      </div>
                      <div style={{ height: 12, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 99,
                          width: `${Math.round((m.count / usage.max) * 100)}%`,
                          background: `linear-gradient(90deg, ${m.color}99, ${m.color})`,
                          boxShadow: `0 0 10px ${m.color}80`, transition: 'width .5s',
                        }} />
                      </div>
                      <p style={{ fontSize: 16, color: 'rgba(200,220,255,0.5)', marginTop: 6, fontFamily: 'monospace' }}>
                        {m.count.toLocaleString()} 次练习 · {m.users} 位学生用过
                        {m.users === 0 && <span style={{ color: '#f72585' }}> ← 没人用过</span>}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
