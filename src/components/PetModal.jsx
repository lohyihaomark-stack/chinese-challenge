import { useState } from 'react'
import { getSession, buyItem, equipItem, unequipItem, saveCharacterGender } from '../utils/userStore'
import { SHOP_ITEMS, findCharItem } from '../utils/shopData'

/* ══════════════════════════════════════════════════════════
   Character figure — CSS-drawn chibi character
   ══════════════════════════════════════════════════════════ */
function CharacterFigure({ character, sc = 1 }) {
  const S = (n) => Math.round(n * sc)

  const hair = findCharItem('hair',      character?.hair)
  const top  = findCharItem('top',       character?.top)
  const bot  = findCharItem('bottom',    character?.bottom)
  const shoe = findCharItem('shoes',     character?.shoes)
  const acc  = findCharItem('accessory', character?.accessory)

  const hc  = hair?.color || '#1C1C1E'
  const tc  = top?.color  || '#BFDBFE'
  const bc  = bot?.color  || '#1E3A8A'
  const sc2 = shoe?.color || '#F3F4F6'
  const isSk   = bot?.isSkirt  || false
  const accType = acc?.type || 'none'
  const skin = '#F5CBA7'

  const hasCrown   = accType === 'crown'
  const hasCap     = accType === 'cap'
  const hasBow     = accType === 'bow'
  const hasGlasses = accType === 'glasses'
  const hasScarf   = accType === 'scarf'
  const hasBag     = accType === 'bag'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', userSelect: 'none' }}>

      {/* Crown / Cap — floats above hair */}
      <div style={{ height: S(22), display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontSize: S(19) }}>
        {hasCrown && <span>👑</span>}
        {hasCap   && <span>🧢</span>}
      </div>

      {/* Hair dome + head group */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Hair dome */}
        <div style={{
          width: S(46), height: S(22),
          backgroundColor: hc,
          borderRadius: `${S(23)}px ${S(23)}px 0 0`,
          position: 'relative', zIndex: 2,
        }}>
          {hasBow && (
            <span style={{
              position: 'absolute', right: S(-14), top: 0,
              fontSize: S(15), lineHeight: 1,
            }}>🎀</span>
          )}
        </div>

        {/* Head */}
        <div style={{
          width: S(46), height: S(46),
          backgroundColor: skin,
          borderRadius: '50%',
          marginTop: S(-4),
          zIndex: 1,
          position: 'relative',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Glasses overlay */}
          {hasGlasses && (
            <div style={{
              position: 'absolute', top: S(13),
              display: 'flex', alignItems: 'center', gap: S(2), zIndex: 4,
            }}>
              <div style={{ width: S(15), height: S(11), borderRadius: S(4), border: `${S(1.5)}px solid #374151` }} />
              <div style={{ width: S(3), height: S(1.5), backgroundColor: '#374151' }} />
              <div style={{ width: S(15), height: S(11), borderRadius: S(4), border: `${S(1.5)}px solid #374151` }} />
            </div>
          )}
          {/* Eyes */}
          <div style={{ display: 'flex', gap: S(10), marginTop: S(6) }}>
            <div style={{ width: S(5), height: S(5), backgroundColor: '#111', borderRadius: '50%' }} />
            <div style={{ width: S(5), height: S(5), backgroundColor: '#111', borderRadius: '50%' }} />
          </div>
          {/* Smile */}
          <div style={{
            width: S(14), height: S(6),
            borderBottom: `${S(2)}px solid #92400E`,
            borderLeft:   `${S(1)}px solid #92400E`,
            borderRight:  `${S(1)}px solid #92400E`,
            borderRadius: '0 0 50% 50%',
            marginTop: S(3),
          }} />
          {/* Hair side strands */}
          <div style={{ position: 'absolute', left: S(-2), top: S(18), width: S(8), height: S(14), backgroundColor: hc, borderRadius: `0 0 ${S(4)}px ${S(4)}px` }} />
          <div style={{ position: 'absolute', right: S(-2), top: S(18), width: S(8), height: S(14), backgroundColor: hc, borderRadius: `0 0 ${S(4)}px ${S(4)}px` }} />
        </div>
      </div>

      {/* Scarf or Neck */}
      {hasScarf ? (
        <div style={{
          width: S(36), height: S(9),
          backgroundColor: '#EF4444',
          borderRadius: S(5), zIndex: 3,
        }} />
      ) : (
        <div style={{ width: S(12), height: S(7), backgroundColor: skin }} />
      )}

      {/* Arms + Body */}
      <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
        {/* Left arm */}
        <div style={{
          width: S(10), height: S(32), backgroundColor: tc,
          borderRadius: `${S(5)}px 0 ${S(5)}px ${S(5)}px`,
          marginTop: S(4),
        }} />
        {/* Body */}
        <div style={{ width: S(30), height: S(36), backgroundColor: tc, position: 'relative' }}>
          {/* Collar detail */}
          <div style={{
            position: 'absolute', top: 0, left: '20%', right: '20%', height: S(8),
            borderBottom: `${S(1)}px solid rgba(0,0,0,0.12)`,
          }} />
        </div>
        {/* Right arm */}
        <div style={{
          width: S(10), height: S(32), backgroundColor: tc,
          borderRadius: `0 ${S(5)}px ${S(5)}px ${S(5)}px`,
          marginTop: S(4),
        }} />
        {/* Bag */}
        {hasBag && (
          <span style={{ position: 'absolute', right: S(-20), top: S(4), fontSize: S(16) }}>🎒</span>
        )}
      </div>

      {/* Bottom — skirt or pants */}
      {isSk ? (
        <div style={{
          width: S(44), height: S(26), backgroundColor: bc,
          clipPath: 'polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)',
        }} />
      ) : (
        <div style={{ display: 'flex', gap: S(2) }}>
          <div style={{ width: S(14), height: S(28), backgroundColor: bc, borderRadius: `0 0 ${S(4)}px ${S(4)}px` }} />
          <div style={{ width: S(14), height: S(28), backgroundColor: bc, borderRadius: `0 0 ${S(4)}px ${S(4)}px` }} />
        </div>
      )}

      {/* Shoes */}
      <div style={{ display: 'flex', gap: isSk ? S(10) : S(2), marginTop: S(1) }}>
        <div style={{ width: S(17), height: S(8), backgroundColor: sc2, borderRadius: S(4), border: '1px solid rgba(0,0,0,0.14)' }} />
        <div style={{ width: S(17), height: S(8), backgroundColor: sc2, borderRadius: S(4), border: '1px solid rgba(0,0,0,0.14)' }} />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Shop item card
   ══════════════════════════════════════════════════════════ */
function ShopItem({ item, slot, owned, equipped, coins, onBuy, onEquip }) {
  const canAfford = coins >= item.price
  const isFree    = item.price === 0

  // Visual swatch
  let swatch
  if (slot === 'accessory') {
    swatch = (
      <div className="w-14 h-14 rounded-xl flex items-center justify-center text-4xl border-2 border-brick/10 bg-cream-dark">
        {item.emoji}
      </div>
    )
  } else {
    // color circle/square based on slot
    const isHair = slot === 'hair'
    swatch = (
      <div
        className="w-14 h-14 border-2 border-brick/10 shadow-sm"
        style={{
          backgroundColor: item.color,
          borderRadius: isHair ? '50%' : '0.75rem',
        }}
      />
    )
  }

  return (
    <div className={`rounded-xl border-2 p-3 flex flex-col items-center gap-2 transition-all ${
      equipped
        ? 'border-nanyang-teal bg-nanyang-teal/8'
        : owned
          ? 'border-gold/50 bg-gold/5'
          : 'border-brick-mid/20 bg-cream'
    }`}>
      {swatch}
      <p className="text-brick font-bold text-sm text-center leading-tight">{item.name}</p>

      {equipped ? (
        <div className="w-full text-center text-sm py-1.5 rounded-lg bg-nanyang-teal text-cream font-bold">
          已装备 ✓
        </div>
      ) : (owned || isFree) ? (
        <button
          onClick={onEquip}
          className="w-full text-sm py-1.5 rounded-lg bg-gold/20 text-brick font-bold hover:bg-gold/40 transition-colors"
        >
          装备
        </button>
      ) : (
        <button
          onClick={() => canAfford && onBuy()}
          className={`w-full text-sm py-1.5 rounded-lg font-bold transition-colors ${
            canAfford
              ? 'bg-brick text-cream hover:bg-brick-mid'
              : 'bg-brick/20 text-brick/40 cursor-not-allowed'
          }`}
        >
          {item.price} 🪙
        </button>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Gender picker screen
   ══════════════════════════════════════════════════════════ */
function GenderPicker({ onPick, onClose }) {
  const boyPreview  = { gender: 'boy',  hair: 'hair_black', top: 'top_uniform', bottom: 'bottom_uniform_boy',  shoes: 'shoes_white', accessory: 'acc_none' }
  const girlPreview = { gender: 'girl', hair: 'hair_black', top: 'top_uniform', bottom: 'bottom_uniform_girl', shoes: 'shoes_white', accessory: 'acc_none' }

  return (
    <div className="bg-cream w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
      {/* Header */}
      <div className="nanyang-header px-5 py-4 flex items-center justify-between shrink-0">
        <p className="relative z-10 text-cream font-black text-2xl">选择你的形象</p>
        <button onClick={onClose} className="relative z-10 text-cream/70 hover:text-cream text-4xl leading-none">×</button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        <p className="text-brick/60 text-base text-center">你好！先选一个形象，之后可以在商店换装。</p>

        <div className="flex gap-6 justify-center w-full">
          {/* Boy */}
          <button
            onClick={() => onPick('boy')}
            className="flex-1 max-w-[160px] flex flex-col items-center gap-3 bg-cream-dark hover:bg-gold/15 border-2 border-transparent hover:border-gold rounded-2xl py-6 px-4 transition-all active:scale-95"
          >
            <CharacterFigure character={boyPreview} sc={0.9} />
            <span className="text-brick font-black text-xl mt-1">男生 👦</span>
          </button>

          {/* Girl */}
          <button
            onClick={() => onPick('girl')}
            className="flex-1 max-w-[160px] flex flex-col items-center gap-3 bg-cream-dark hover:bg-gold/15 border-2 border-transparent hover:border-gold rounded-2xl py-6 px-4 transition-all active:scale-95"
          >
            <CharacterFigure character={girlPreview} sc={0.9} />
            <span className="text-brick font-black text-xl mt-1">女生 👧</span>
          </button>
        </div>

        <p className="text-brick/35 text-xs text-center">选定后可以在商店自由换装 🎽</p>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Main wardrobe modal
   ══════════════════════════════════════════════════════════ */
const TABS = Object.keys(SHOP_ITEMS)

export default function PetModal({ onClose }) {
  const [userData,  setUserData]  = useState(() => getSession() || {})
  const [tab,       setTab]       = useState('hair')

  const character = userData.character || {}
  const owned     = new Set(userData.ownedItems || [])
  const coins     = userData.coins || 0
  const gender    = character.gender

  const refresh = (patch) => setUserData(prev => ({ ...prev, ...patch }))

  /* ── Gender pick ── */
  const handlePickGender = (g) => {
    const newChar = saveCharacterGender(g)
    if (newChar) refresh({ character: newChar })
  }

  /* ── Buy ── */
  const handleBuy = (item) => {
    const result = buyItem(item.id, item.price)
    if (result) refresh(result)
  }

  /* ── Equip ── */
  const handleEquip = (slot, item) => {
    const newChar = equipItem(slot, item.id)
    if (newChar) refresh({ character: newChar })
  }

  /* ── Unequip (click equipped item again) ── */
  const handleUnequip = (slot) => {
    const newChar = unequipItem(slot)
    if (newChar) refresh({ character: newChar })
  }

  /* ── Is item equipped? ── */
  const isEquipped = (slot, item) => character[slot] === item.id

  /* ── Filter items by gender ── */
  const visibleItems = (slot) => {
    const cat = SHOP_ITEMS[slot]
    if (!cat) return []
    return cat.items.filter(i => i.forGender === 'both' || !gender || i.forGender === gender)
  }

  /* ── Gender picker screen ── */
  if (!gender) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <GenderPicker onPick={handlePickGender} onClose={onClose} />
      </div>
    )
  }

  const cat     = SHOP_ITEMS[tab]
  const items   = visibleItems(tab)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-cream w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* ── Header ── */}
        <div className="nanyang-header px-5 py-4 flex items-center justify-between shrink-0">
          <p className="relative z-10 text-cream font-black text-2xl">我的形象</p>
          <button onClick={onClose} className="relative z-10 text-cream/70 hover:text-cream text-4xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex flex-col">

          {/* ── Character preview + coins ── */}
          <div className="py-5 px-4 flex items-center justify-around border-b border-cream-dark bg-cream-dark/30">
            {/* Character */}
            <div className="flex flex-col items-center gap-2">
              <div className="bg-cream rounded-2xl px-6 py-4 shadow-inner">
                <CharacterFigure character={character} sc={1} />
              </div>
              <span className="text-brick/40 text-xs">{gender === 'girl' ? '👧 女生' : '👦 男生'}</span>
            </div>

            {/* Coin balance + guide */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-3xl">🪙</span>
                <span className="text-brick font-black text-3xl">{coins.toLocaleString()}</span>
              </div>
              <span className="text-brick/45 text-sm font-semibold">词币</span>
              <div className="text-xs text-brick/40 text-center leading-relaxed mt-1">
                <div>⚔️ 斗争答对 +2</div>
                <div>⚔️ 斗争通关 +15</div>
                <div>🛡️ 无伤通关 +40</div>
                <div>🔗 配对正确 +1</div>
                <div>⚡ 急速对决 +8</div>
                <div>📅 每日登录 +20</div>
              </div>
            </div>
          </div>

          {/* ── Shop category tabs ── */}
          <div className="flex border-b border-cream-dark shrink-0 bg-cream overflow-x-auto">
            {TABS.map(key => {
              const c = SHOP_ITEMS[key]
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-1 min-w-[60px] py-3 text-sm font-semibold transition-colors border-b-2 -mb-px whitespace-nowrap ${
                    tab === key
                      ? 'border-brick text-brick'
                      : 'border-transparent text-brick/55 hover:text-brick/80'
                  }`}
                >
                  <div className="text-base">{c.icon}</div>
                  <div className="text-xs mt-0.5">{c.label}</div>
                </button>
              )
            })}
          </div>

          {/* ── Item grid ── */}
          <div className="p-4 grid grid-cols-3 gap-3">
            {items.map(item => (
              <ShopItem
                key={item.id}
                item={item}
                slot={tab}
                owned={owned.has(item.id) || item.price === 0}
                equipped={isEquipped(tab, item)}
                coins={coins}
                onBuy={() => handleBuy(item)}
                onEquip={
                  isEquipped(tab, item)
                    ? () => handleUnequip(tab)
                    : () => handleEquip(tab, item)
                }
              />
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
