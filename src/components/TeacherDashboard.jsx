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
  const [unitFilter,  setUnitFilter]  = useState(0)     // 0 = all units
  const [sortBy,      setSortBy]      = useState('rate') // rate | count
  const [search,      setSearch]      = useState('')

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

  function exportCSV() {
    const headers = ['词语', '拼音', '释义', '单元', '错误率%', '答错学生数', '答错学生详情']
    const rows = hardWords.map(w => {
      const rate = w.totalSeen > 0 ? Math.round((w.totalWrong / w.totalSeen) * 100) : 0
      const detail = w.students.map(s => `${s.name}(${s.rate}%)`).join('; ')
      return [w.hanzi, w.pinyin, w.definition, `单元${UNIT_LABELS[w.unitNum - 1]}`, rate, w.students.length, detail]
    })
    const csv  = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `常错词语_${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

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
              教师控制台 · 常错词语
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

        {/* Controls */}
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

        {/* Unit filter chips */}
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

        {/* Word list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 64, color: 'rgba(200,220,255,0.35)', fontSize: 22 }}>
              ⏳ 加载中…
            </div>
          ) : students.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 64, color: 'rgba(200,220,255,0.35)', fontSize: 22 }}>
              还没有学生数据，学生登录后自动同步。
            </div>
          ) : hardWords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 64, fontSize: 22, color: '#06d6a0' }}>
              {search || unitFilter ? '没有符合条件的常错词语 🎉' : '太棒了！全班目前没有常错的词语 🎉'}
            </div>
          ) : (
            hardWords.map(w => <HardWordRow key={`${w.unitNum}-${w.id}`} word={w} />)
          )}
        </div>
      </div>
    </div>
  )
}
