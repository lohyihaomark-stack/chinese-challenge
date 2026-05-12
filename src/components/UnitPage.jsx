import { useState } from 'react'
import VocabCard from './VocabCard'
import BossBattle from './BossBattle'
import VocabMatchGame from './VocabMatchGame'

const TABS = [
  { id: 'vocab', label: '📚 词汇表' },
  { id: 'match', label: '🔗 词义配对' },
  { id: 'boss',  label: '⚔️ 词语斗争' },
]

export default function UnitPage({ unit }) {
  const [view, setView] = useState('vocab')

  return (
    <div className="flex flex-col flex-1 overflow-hidden h-full">

      {/* ── Sub-tabs ─────────────────────────────────────────── */}
      <div className="flex bg-cream border-b-2 border-cream-dark shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`shrink-0 flex-1 min-w-[90px] py-3 text-lg font-semibold transition-colors border-b-2 -mb-0.5 ${
              view === tab.id
                ? 'text-brick border-brick'
                : 'text-brick/65 border-transparent hover:text-brick/90'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      {view === 'vocab' ? (
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-center text-brick/40 text-base mb-4">
            共 {unit.vocabs.length} 个词汇 · 点击词语搭配可朗读
          </p>
          <div className="grid grid-cols-2 gap-3">
            {unit.vocabs.map((vocab, i) => (
              <VocabCard key={vocab.id} vocab={vocab} index={i} />
            ))}
          </div>
          <div className="h-4" />
        </div>
      ) : view === 'match' ? (
        <div className="flex-1 overflow-hidden flex flex-col">
          <VocabMatchGame key={unit.unit} vocabs={unit.vocabs} unitNum={unit.unit} />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          <BossBattle key={unit.unit} vocabs={unit.vocabs} unitNum={unit.unit} />
        </div>
      )}
    </div>
  )
}
