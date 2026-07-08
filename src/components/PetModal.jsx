import { useState } from 'react'
import { getSession, buyPetItem, equipPetItem, getLevelInfo, renamePet } from '../utils/userStore'
import { PET_SHOP_ITEMS, findPetItem, getPetItemCategory } from '../utils/petShopData'
import PetCreature, { PET_STAGES, getStage, getPetStageInfo } from './PetCreature'

/* ══════════════════════════════════════════════════════════
   RARITY HELPER
   ══════════════════════════════════════════════════════════ */
function getRarity(price) {
  if (price === 0)    return { color: '#9CA3AF', glow: 'rgba(156,163,175,0.25)', label: '' }
  if (price < 150)    return { color: '#00d4ff', glow: 'rgba(0,212,255,0.35)',   label: '✦' }
  if (price < 300)    return { color: '#c084fc', glow: 'rgba(192,132,252,0.45)', label: '✦✦' }
  if (price < 500)    return { color: '#ffd60a', glow: 'rgba(255,214,10,0.55)',  label: '✦✦✦' }
  return               { color: '#f72585', glow: 'rgba(247,37,133,0.6)',          label: '✦✦✦✦' }
}

/* ══════════════════════════════════════════════════════════
   SHOP ITEM CARD  (larger fonts)
   ══════════════════════════════════════════════════════════ */
function PetShopItem({ item, owned, equipped, coins, onBuy, onEquip }) {
  const canAfford = coins >= item.price
  const isFree    = item.price === 0
  const rar       = getRarity(item.price)

  const borderCol = equipped
    ? rar.color
    : owned || isFree
      ? `${rar.color}66`
      : 'rgba(0,212,255,0.12)'

  const bgCol = equipped
    ? `${rar.color}18`
    : 'rgba(12,24,48,0.7)'

  return (
    <div
      className="rounded-xl p-2.5 flex flex-col items-center gap-1.5 transition-all relative overflow-hidden"
      style={{
        border: `2px solid ${borderCol}`,
        background: bgCol,
        boxShadow: equipped ? `0 0 14px ${rar.glow}, inset 0 0 8px ${rar.color}18` : undefined,
      }}
    >
      {/* Rarity badge */}
      {rar.label && (
        <div style={{
          position: 'absolute', top: 4, right: 5,
          fontSize: '13px', fontWeight: 'bold', lineHeight: 1,
          color: rar.color, textShadow: `0 0 5px ${rar.color}`,
        }}>
          {rar.label}
        </div>
      )}

      {/* Emoji tile */}
      <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
           style={{
             background: equipped ? `${rar.color}22` : 'rgba(0,212,255,0.06)',
             border: `1px solid ${rar.color}33`,
           }}>
        {item.emoji}
      </div>

      <p style={{ fontWeight: 900, fontSize: '19px', textAlign: 'center', lineHeight: 1.2, color: equipped ? rar.color : '#a8d8f0' }}>
        {item.name}
      </p>
      <p style={{ fontSize: '15px', textAlign: 'center', lineHeight: 1.4, opacity: 0.75, color: '#a8d8f0' }}>
        {item.desc}
      </p>

      {/* Action button */}
      {equipped ? (
        <button
          onClick={onEquip}
          style={{
            width: '100%', textAlign: 'center', fontSize: '17px', padding: '7px 0',
            borderRadius: 8, fontWeight: 900, color: 'white',
            background: rar.color, boxShadow: `0 2px 8px ${rar.glow}`,
            border: 'none', cursor: 'pointer',
          }}
        >
          已装备 ✓
        </button>
      ) : (owned || isFree) ? (
        <button
          onClick={onEquip}
          style={{
            width: '100%', fontSize: '17px', padding: '7px 0',
            borderRadius: 8, fontWeight: 700, cursor: 'pointer',
            background: `${rar.color}22`, color: rar.color, border: `1px solid ${rar.color}55`,
            transition: 'opacity 0.2s',
          }}
        >
          装　备
        </button>
      ) : (
        <button
          onClick={() => canAfford && onBuy()}
          disabled={!canAfford}
          style={{
            width: '100%', fontSize: '17px', padding: '7px 0',
            borderRadius: 8, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            cursor: canAfford ? 'pointer' : 'not-allowed',
            background: canAfford ? rar.color : 'rgba(0,212,255,0.06)',
            color: canAfford ? 'white' : 'rgba(168,216,240,0.35)',
            border: 'none',
            transition: 'opacity 0.2s',
          }}
        >
          {!canAfford && <span>🔒</span>}
          <span>{item.price} 🪙</span>
        </button>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   EVOLUTION STAGE TRACKER
   ══════════════════════════════════════════════════════════ */
function StageTracker({ level }) {
  const currentStage = getStage(level)

  return (
    <div className="flex items-center gap-0.5 w-full px-1">
      {PET_STAGES.map((s, i) => {
        const stageNum = i + 1
        const isActive = stageNum === currentStage
        const isPast   = stageNum < currentStage
        const col      = s.color
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5"
               title={`${s.name} · Lv.${s.stage === 1 ? 1 : (stageNum - 1) * 5}+`}>
            <div
              className="w-full h-1.5 rounded-full transition-all"
              style={{
                background: isPast || isActive ? col : 'rgba(255,255,255,0.08)',
                boxShadow: isActive ? `0 0 6px ${col}` : undefined,
              }}
            />
            {isActive && (
              <span style={{ fontSize: '15px', fontWeight: 900, color: col, textShadow: `0 0 4px ${col}` }}>
                {s.name}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   MAIN PET MODAL
   ══════════════════════════════════════════════════════════ */
const SHOP_TABS = ['hat', 'aura', 'companion', 'weapon']

export default function PetModal({ onClose }) {
  const [userData, setUserData] = useState(() => {
    const s = getSession()
    if (s) {
      return {
        ...s,
        petHat:        s.petHat        || 'hat_none',
        petAura:       s.petAura       || 'aura_none',
        petCompanion:  s.petCompanion  || 'companion_none',
        petWeapon:     s.petWeapon     || 'weapon_none',
        ownedPetItems: s.ownedPetItems || ['hat_none', 'aura_none', 'companion_none', 'weapon_none'],
      }
    }
    return {}
  })
  const [tab, setTab]             = useState('hat')
  const [petNameInput, setPetNameInput] = useState(() => getSession()?.petName || '')
  const [editingName,  setEditingName]  = useState(false)

  const coins     = userData.coins || 0
  const level     = getLevelInfo(userData.globalXP || 0).current.level
  const lvInfo    = getLevelInfo(userData.globalXP || 0)
  const stageInfo = getPetStageInfo(level)
  const owned     = new Set(userData.ownedPetItems || ['hat_none', 'aura_none', 'companion_none'])
  const petHat    = userData.petHat        || 'hat_none'
  const petAura   = userData.petAura       || 'aura_none'
  const petComp   = userData.petCompanion  || 'companion_none'
  const petWeapon = userData.petWeapon     || 'weapon_none'

  const refresh = (patch) => setUserData(prev => ({ ...prev, ...patch }))

  const handleBuy = (item) => {
    const result = buyPetItem(item.id, item.price)
    if (result) refresh(result)
  }

  const handleEquip = (item) => {
    const category = getPetItemCategory(item.id)
    if (!category) return
    const result = equipPetItem(category, item.id)
    if (result) refresh(result)
  }

  const handleSavePetName = () => {
    renamePet(petNameInput)
    setEditingName(false)
    refresh({ petName: petNameInput })
  }

  const isEquipped = (item) => {
    if (item.category === 'hat')       return petHat    === item.id
    if (item.category === 'aura')      return petAura   === item.id
    if (item.category === 'companion') return petComp   === item.id
    if (item.category === 'weapon')    return petWeapon === item.id
    return false
  }

  const tabItems = PET_SHOP_ITEMS[tab]?.items || []
  const tabMeta  = PET_SHOP_ITEMS[tab]
  const nextEvoLv = stageInfo.nextLv

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'rgba(7,13,26,0.97)',
          border: '1px solid rgba(0,212,255,0.25)',
          boxShadow: '0 0 60px rgba(0,212,255,0.12), 0 24px 64px rgba(0,0,0,0.7)',
          maxHeight: '92vh',
          minHeight: '80vh',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, #070d1a 0%, #0d1f3a 50%, #070d1a 100%)',
          borderBottom: '1px solid rgba(0,212,255,0.2)',
          padding: '12px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <p style={{ color: '#00d4ff', fontWeight: 900, fontSize: '1.3rem', textShadow: '0 0 12px rgba(0,212,255,0.6)', letterSpacing: '0.05em' }}>
              灵宠养成 ✨
            </p>
            <p style={{ color: 'rgba(0,212,255,0.45)', fontSize: '12px', fontFamily: 'monospace' }}>
              灵宠进化系统
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ color: 'rgba(0,212,255,0.6)', fontSize: '2.2rem', lineHeight: 1, transition: 'color 0.2s', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.color = '#00d4ff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(0,212,255,0.6)'}
          >
            ×
          </button>
        </div>

        {/* ── Outer flex column: pet section (compact) + shop section (flex-1) ── */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* ── Pet display section ── */}
          <div style={{
            flexShrink: 0,
            maxHeight: '45%',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            background: 'radial-gradient(circle at 50% 40%, rgba(0,212,255,0.08) 0%, rgba(7,13,26,0) 70%)',
            borderBottom: '1px solid rgba(0,212,255,0.15)',
            padding: '14px 18px 16px',
          }}>
            {/* ── Row 1: creature left, coins+XP right ── */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 14 }}>
              {/* Creature */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <PetCreature
                  level={level}
                  petHat={petHat}
                  petAura={petAura}
                  petCompanion={petComp}
                  petWeapon={petWeapon}
                  width={120}
                  interactive
                />
                <div style={{
                  position: 'absolute', top: 2, right: -12,
                  background: stageInfo.color, color: '#fff',
                  fontSize: '13px', fontWeight: 900,
                  borderRadius: '999px', padding: '2px 9px',
                  boxShadow: `0 0 10px ${stageInfo.color}88`,
                  border: '1.5px solid rgba(255,255,255,0.25)',
                }}>
                  Lv.{level}
                </div>
              </div>

              {/* Coin + XP */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Pet name */}
                <div style={{ textAlign: 'center' }}>
                  {editingName ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        value={petNameInput}
                        onChange={e => setPetNameInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSavePetName()}
                        maxLength={10}
                        placeholder="宠物名字…"
                        autoFocus
                        style={{
                          flex: 1, background: 'rgba(0,212,255,0.08)',
                          border: '1.5px solid rgba(0,212,255,0.5)', borderRadius: 8,
                          color: '#00d4ff', fontWeight: 900, fontSize: '17px',
                          padding: '5px 10px', outline: 'none', textAlign: 'center',
                        }}
                      />
                      <button onClick={handleSavePetName}
                        style={{ background: '#00d4ff', color: '#000', fontWeight: 900, fontSize: '14px', padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                        ✓
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingName(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <p style={{ color: '#00d4ff', fontWeight: 900, fontSize: '20px', textShadow: '0 0 8px rgba(0,212,255,0.6)', margin: 0 }}>
                        {userData.petName || '✏️ 给宠物取名'}
                      </p>
                      {userData.petName && (
                        <p style={{ color: 'rgba(0,212,255,0.45)', fontSize: '12px', margin: '2px 0 0' }}>点击改名</p>
                      )}
                    </button>
                  )}
                </div>

                {/* Coin */}
                <div>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: 'rgba(255,214,10,0.08)',
                    border: '1px solid rgba(255,214,10,0.35)',
                    borderRadius: 12, padding: '7px 12px',
                    boxShadow: '0 0 16px rgba(255,214,10,0.12)',
                  }}>
                    <span style={{ fontSize: '1.5rem' }}>🪙</span>
                    <span style={{ color: '#ffd60a', fontWeight: 900, fontSize: '1.7rem', fontVariantNumeric: 'tabular-nums' }}>
                      {coins.toLocaleString()}
                    </span>
                  </div>
                  <p style={{ color: 'rgba(168,216,240,0.65)', fontSize: '16px', fontWeight: 700, textAlign: 'center', marginTop: 4 }}>
                    词币余额
                  </p>
                </div>

                {/* Level title + XP bar */}
                <div style={{
                  background: 'rgba(0,212,255,0.05)',
                  border: '1px solid rgba(0,212,255,0.15)',
                  borderRadius: 10, padding: '9px 12px',
                }}>
                  <div style={{ color: lvInfo.current.color, fontWeight: 900, fontSize: '20px', textAlign: 'center', marginBottom: 7 }}>
                    {lvInfo.current.emoji} {lvInfo.current.title}
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      width: `${lvInfo.pct}%`,
                      background: `linear-gradient(90deg, ${lvInfo.current.color}88, ${lvInfo.current.color})`,
                      boxShadow: `0 0 6px ${lvInfo.current.color}`,
                      transition: 'width 0.7s ease',
                    }} />
                  </div>
                  <div style={{ color: 'rgba(168,216,240,0.7)', fontSize: '16px', textAlign: 'right', marginTop: 5, fontFamily: 'monospace' }}>
                    {lvInfo.next ? `${lvInfo.xpIntoLevel}/${lvInfo.xpForLevel} XP` : '✨ MAX'}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Row 2: stage tracker + name + desc — full width ── */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <StageTracker level={level} />
              <p style={{ color: stageInfo.color, fontWeight: 900, fontSize: '1.6rem', textShadow: `0 0 10px ${stageInfo.color}88`, margin: 0 }}>
                {stageInfo.name}
              </p>
              <p style={{ color: 'rgba(168,216,240,0.8)', fontSize: '17px', textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
                {stageInfo.desc}
              </p>
              {nextEvoLv ? (
                <p style={{ color: 'rgba(168,216,240,0.65)', fontSize: '16px', textAlign: 'center', margin: 0 }}>
                  下次进化: Lv.{nextEvoLv} →{' '}
                  <span style={{ color: PET_STAGES[getStage(level)].color, fontWeight: 900 }}>
                    {PET_STAGES[getStage(level)].name}
                  </span>
                </p>
              ) : (
                <p style={{ color: '#ffd60a', fontSize: '17px', fontWeight: 900, margin: 0, textShadow: '0 0 8px rgba(255,214,10,0.6)' }}>
                  ✨ 终极形态
                </p>
              )}
            </div>
          </div>

          {/* ── SHOP SECTION — flex: 1, takes ~half the modal ── */}
          <div style={{ flex: 1, minHeight: 220, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Category tabs */}
            <div style={{
              display: 'flex', flexShrink: 0,
              borderBottom: '1px solid rgba(0,212,255,0.12)',
              background: 'rgba(7,13,26,0.95)',
            }}>
              {SHOP_TABS.map(key => {
                const meta   = PET_SHOP_ITEMS[key]
                const active = tab === key
                const items  = meta.items
                const ownedN = items.filter(i => owned.has(i.id) || i.price === 0).length
                return (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    style={{
                      flex: 1, padding: '5px 2px',
                      borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                      borderBottom: active ? '2.5px solid #00d4ff' : '2.5px solid transparent',
                      color: active ? '#00d4ff' : 'rgba(168,216,240,0.4)',
                      background: 'none', cursor: 'pointer', transition: 'all 0.2s',
                      textShadow: active ? '0 0 10px rgba(0,212,255,0.5)' : 'none',
                      display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{meta.icon}</span>
                    <span style={{ fontSize: '16px', fontWeight: 700 }}>{meta.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, opacity: 0.55 }}>{ownedN}/{items.length}</span>
                  </button>
                )
              })}
            </div>

            {/* Category header */}
            <div style={{
              padding: '9px 16px 5px',
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            }}>
              <span style={{ fontSize: '1.7rem' }}>{tabMeta.icon}</span>
              <span style={{ color: '#00d4ff', fontWeight: 900, fontSize: '22px' }}>{tabMeta.label}</span>
              <span style={{ color: 'rgba(168,216,240,0.4)', fontSize: '16px', marginLeft: 'auto' }}>
                {tabItems.filter(i => owned.has(i.id) || i.price === 0).length}/{tabItems.length} 已拥有
              </span>
            </div>

            {/* Item grid — scrollable, takes remaining height */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'scroll', WebkitOverflowScrolling: 'touch', padding: '4px 12px 28px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {tabItems.map(item => (
                  <PetShopItem
                    key={item.id}
                    item={item}
                    owned={owned.has(item.id) || item.price === 0}
                    equipped={isEquipped(item)}
                    coins={coins}
                    onBuy={() => handleBuy(item)}
                    onEquip={() => handleEquip(item)}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
