import { useState } from 'react'
import VocabCard from './VocabCard'
import WordCombatHub from './wordCombat/WordCombatHub'
import SentenceBuilderGame from './SentenceBuilderGame'
import VocabMatchGame from './VocabMatchGame'
import VocabWritingGame from './VocabWritingGame'
import HandwritingGame from './HandwritingGame'
import ErrorBoundary from './ErrorBoundary'

const TABS = [
  { id: 'vocab',       label: '📚 词汇', color: '#00d4ff' },
  { id: 'sentence',    label: '🖊️ 造句',  color: '#ffd60a' },
  { id: 'match',       label: '🔗 配对',  color: '#9b5de5' },
  { id: 'boss',        label: '⚔️ 斗争',  color: '#f72585' },
  { id: 'writing',     label: '✍️ 释义',  color: '#c084fc' },
  { id: 'handwriting', label: '🖌️ 写字',  color: '#06d6a0' },
]

/* ── Vocab grid (with search) ── */
function VocabView({ unit }) {
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()
  const filtered = q
    ? unit.vocabs.filter(v =>
        v.hanzi.includes(search) ||
        v.pinyin.toLowerCase().includes(q) ||
        v.definition.includes(search)
      )
    : unit.vocabs

  return (
    <div className="flex-1 overflow-y-auto flex flex-col" style={{ background: 'rgba(7,13,26,0.8)' }}>
      {/* Search bar */}
      <div className="sticky top-0 px-4 pt-3 pb-2 z-10" style={{ background: 'rgba(7,13,26,0.97)', borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl select-none" style={{ color: 'rgba(0,212,255,0.4)' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索词汇、拼音或释义…"
            className="w-full pl-10 pr-4 py-3 rounded-xl text-base font-medium outline-none"
            style={{
              background: 'rgba(0,212,255,0.06)',
              border: '1.5px solid rgba(0,212,255,0.2)',
              color: '#ddeeff',
              caretColor: '#00d4ff',
            }}
            onFocus={e  => e.target.style.borderColor = 'rgba(0,212,255,0.55)'}
            onBlur={e   => e.target.style.borderColor = 'rgba(0,212,255,0.2)'}
          />
          {search && (
            <button onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                    style={{ color: 'rgba(0,212,255,0.4)' }}>✕</button>
          )}
        </div>
        <p className="text-center text-neon-cyan/30 text-sm mt-1.5 font-mono">
          {q ? `${filtered.length} / ${unit.vocabs.length} 个词汇` : `共 ${unit.vocabs.length} 个词汇`}
        </p>
      </div>

      <div className="p-4 pt-3 grid grid-cols-2 gap-3">
        {filtered.length > 0
          ? filtered.map((vocab, i) => <VocabCard key={vocab.id} vocab={vocab} index={i} />)
          : <p className="col-span-2 text-center py-8 font-mono text-sm" style={{ color: 'rgba(0,212,255,0.3)' }}>没有找到匹配的词汇</p>
        }
      </div>
      <div className="h-4" />
    </div>
  )
}

/* ── Component map ── */
const VIEW_MAP = {
  vocab:       (unit) => <VocabView         unit={unit} />,
  sentence:    (unit) => <SentenceBuilderGame key={unit.unit} vocabs={unit.vocabs} unitNum={unit.unit} />,
  match:       (unit) => <VocabMatchGame      key={unit.unit} vocabs={unit.vocabs} unitNum={unit.unit} />,
  boss:        (unit) => <WordCombatHub       key={unit.unit} vocabs={unit.vocabs} unitNum={unit.unit} />,
  writing:     (unit) => <VocabWritingGame    key={unit.unit} vocabs={unit.vocabs} unitNum={unit.unit} />,
  handwriting: (unit) => <HandwritingGame     key={unit.unit} vocabs={unit.vocabs} unitNum={unit.unit} />,
}

export default function UnitPage({ unit, user }) {
  const [view, setView] = useState('vocab')
  const renderView = VIEW_MAP[view] ?? VIEW_MAP.vocab

  return (
    <div className="flex flex-col flex-1 overflow-hidden h-full">

      {/* ── Sub-tabs ── */}
      <div className="flex shrink-0 relative overflow-x-auto"
           style={{ background: 'rgba(7,13,26,0.95)', borderBottom: '1px solid rgba(0,212,255,0.12)' }}>
        {TABS.map(tab => {
          const isActive = view === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className="shrink-0 flex-1 min-w-[68px] py-4 text-base font-black transition-all relative"
              style={{
                color:        isActive ? tab.color : 'rgba(140,180,220,0.45)',
                background:   isActive ? `${tab.color}10` : 'transparent',
                borderBottom: `2px solid ${isActive ? tab.color : 'transparent'}`,
                textShadow:   isActive ? `0 0 10px ${tab.color}80` : 'none',
              }}
            >
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: tab.color, boxShadow: `0 0 10px ${tab.color}, 0 0 20px ${tab.color}60` }} />
              )}
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Content ── */}
      <ErrorBoundary key={view}>
        <div className="flex-1 overflow-hidden flex flex-col view-enter">
          {renderView(unit)}
        </div>
      </ErrorBoundary>
    </div>
  )
}
