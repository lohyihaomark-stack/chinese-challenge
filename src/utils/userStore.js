import { DEFAULT_OWNED_CHAR, DEFAULT_CHARACTER } from './shopData'
import { DEFAULT_PET_OWNED } from './petShopData'
import { MISSION_EVENTS, ALL_3_BONUS, generateDailyMissions } from './missions'
import { WORD_OF_DAY_REWARD } from './wordOfDay'

const USERS_KEY   = 'vocab_users'
const SESSION_KEY = 'vocab_current_user'

/* ── Achievement definitions ─────────────────────────── */
export const ACHIEVEMENTS = [
  { id: 'first_login',  emoji: '🌟', label: '初次登录',   desc: '欢迎加入词语宝典！' },
  { id: 'streak3',      emoji: '🔥', label: '三日坚持',   desc: '连续登录 3 天' },
  { id: 'streak7',      emoji: '🔥', label: '一周勤学',   desc: '连续登录 7 天' },
  { id: 'streak30',     emoji: '💎', label: '月度冠军',   desc: '连续登录 30 天' },
  { id: 'boss_clear',   emoji: '⚔️', label: '初战告捷',   desc: '首次完成词语斗争' },
  { id: 'boss_all',     emoji: '🏆', label: '三界征服者', desc: '三个单元全部通关' },
  { id: 'boss_perfect', emoji: '🛡️', label: '无伤英雄',   desc: '词语斗争无伤通关' },
  { id: 'match_ace',    emoji: '🧩', label: '配对达人',   desc: '词义配对命中率达 90%' },
]

/* ── Helpers ─────────────────────────────────────────── */
function todayStr()     { return new Date().toISOString().slice(0, 10) }
function yesterdayStr() { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10) }
function twoDaysAgoStr(){ const d = new Date(); d.setDate(d.getDate()-2); return d.toISOString().slice(0,10) }

// In-memory cache — avoids repeated JSON.parse/stringify within the same
// synchronous call chain (e.g. addCoins → addXP → trackMissionProgress).
let _cache = null

function loadUsers() {
  if (_cache) return _cache
  try { _cache = JSON.parse(localStorage.getItem(USERS_KEY)) || {} }
  catch { _cache = {} }
  return _cache
}

function saveUsers(u) {
  _cache = u
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(u))
  } catch (e) {
    if (e?.name === 'QuotaExceededError' || e?.code === 22) {
      console.error('[userStore] localStorage quota exceeded — progress not saved this action')
    } else {
      console.error('[userStore] save failed', e)
    }
  }
}

// Invalidate cache when another tab mutates storage
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === USERS_KEY) _cache = null
  })
}
export  function getCurrentName() { return localStorage.getItem(SESSION_KEY) }

/* ── XP level thresholds (50 levels) ────────────────── */
export const XP_LEVELS = [
  { level:  1, xp:      0, title: '初学者',   emoji: '🌱', color: '#9CA3AF' },
  { level:  2, xp:    150, title: '学徒',     emoji: '📖', color: '#60A5FA' },
  { level:  3, xp:    400, title: '学者',     emoji: '🎓', color: '#34D399' },
  { level:  4, xp:    800, title: '达人',     emoji: '⭐', color: '#FBBF24' },
  { level:  5, xp:   1500, title: '高手',     emoji: '🔥', color: '#F97316' },
  { level:  6, xp:   2500, title: '宗师',     emoji: '💎', color: '#C084FC' },
  { level:  7, xp:   4000, title: '大师',     emoji: '👑', color: '#FBBF24' },
  { level:  8, xp:   6000, title: '文童',     emoji: '🖊️', color: '#67E8F9' },
  { level:  9, xp:   8500, title: '墨客',     emoji: '🖋️', color: '#2DD4BF' },
  { level: 10, xp:  11500, title: '书生',     emoji: '📚', color: '#86EFAC' },
  { level: 11, xp:  15000, title: '儒生',     emoji: '🏮', color: '#FCA5A5' },
  { level: 12, xp:  19000, title: '才子',     emoji: '✨', color: '#FDE68A' },
  { level: 13, xp:  23500, title: '文士',     emoji: '📜', color: '#D4A574' },
  { level: 14, xp:  28500, title: '秀才',     emoji: '🌸', color: '#F9A8D4' },
  { level: 15, xp:  34000, title: '举人',     emoji: '🎑', color: '#7DD3FC' },
  { level: 16, xp:  40000, title: '进士',     emoji: '🏅', color: '#A78BFA' },
  { level: 17, xp:  46500, title: '翰林',     emoji: '🌺', color: '#F472B6' },
  { level: 18, xp:  53500, title: '状元',     emoji: '🥇', color: '#FFD700' },
  { level: 19, xp:  61000, title: '文豪',     emoji: '📰', color: '#93C5FD' },
  { level: 20, xp:  69000, title: '诗仙',     emoji: '🌙', color: '#E2E8F0' },
  { level: 21, xp:  77500, title: '词圣',     emoji: '🌊', color: '#38BDF8' },
  { level: 22, xp:  86500, title: '语灵',     emoji: '💫', color: '#A5F3FC' },
  { level: 23, xp:  96000, title: '字魂',     emoji: '🌀', color: '#818CF8' },
  { level: 24, xp: 106000, title: '词神',     emoji: '🌟', color: '#FCD34D' },
  { level: 25, xp: 116500, title: '文曲星',   emoji: '🔮', color: '#FB923C' },
  { level: 26, xp: 127500, title: '语惊四座', emoji: '💥', color: '#F87171' },
  { level: 27, xp: 139000, title: '才高八斗', emoji: '🎯', color: '#4ADE80' },
  { level: 28, xp: 151000, title: '出口成章', emoji: '📝', color: '#FB7185' },
  { level: 29, xp: 163500, title: '博古通今', emoji: '🏛️', color: '#94A3B8' },
  { level: 30, xp: 176500, title: '学富五车', emoji: '🚀', color: '#FDE047' },
  { level: 31, xp: 190000, title: '满腹经纶', emoji: '📡', color: '#C4B5FD' },
  { level: 32, xp: 204000, title: '经天纬地', emoji: '🌍', color: '#6EE7B7' },
  { level: 33, xp: 218500, title: '文武双全', emoji: '⚔️', color: '#FCA5A5' },
  { level: 34, xp: 233500, title: '文坛霸主', emoji: '👊', color: '#FF6B6B' },
  { level: 35, xp: 249000, title: '语言之王', emoji: '👁️', color: '#00D4FF' },
  { level: 36, xp: 265000, title: '词锋无敌', emoji: '🗡️', color: '#FF4757' },
  { level: 37, xp: 281500, title: '文心剑胆', emoji: '🛡️', color: '#7C3AED' },
  { level: 38, xp: 298500, title: '百世文宗', emoji: '🏯', color: '#D97706' },
  { level: 39, xp: 316000, title: '千古文豪', emoji: '🌠', color: '#0EA5E9' },
  { level: 40, xp: 334000, title: '华语守护', emoji: '🛡️', color: '#10B981' },
  { level: 41, xp: 352500, title: '文明之光', emoji: '🌟', color: '#F59E0B' },
  { level: 42, xp: 371500, title: '语言宗圣', emoji: '✨', color: '#EC4899' },
  { level: 43, xp: 391000, title: '华文至尊', emoji: '💎', color: '#8B5CF6' },
  { level: 44, xp: 411000, title: '词语传说', emoji: '🏆', color: '#F97316' },
  { level: 45, xp: 431500, title: '永恒文神', emoji: '👑', color: '#EF4444' },
  { level: 46, xp: 452500, title: '文化龙魂', emoji: '🐉', color: '#22D3EE' },
  { level: 47, xp: 474000, title: '语破苍穹', emoji: '⚡', color: '#FCD34D' },
  { level: 48, xp: 496000, title: '文道通神', emoji: '🌈', color: '#A855F7' },
  { level: 49, xp: 518500, title: '万古不朽', emoji: '🌌', color: '#06B6D4' },
  { level: 50, xp: 541500, title: '词语宝典传人', emoji: '🌟', color: '#FFD700' },
]

export function getLevelInfo(xp = 0) {
  let ci = 0
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].xp) { ci = i; break }
  }
  const current      = XP_LEVELS[ci]
  const next         = XP_LEVELS[ci + 1] || null
  const xpIntoLevel  = next ? xp - current.xp : 0
  const xpForLevel   = next ? next.xp - current.xp : 1
  const pct          = next ? Math.min(100, Math.round((xpIntoLevel / xpForLevel) * 100)) : 100
  return { current, next, xpIntoLevel, xpForLevel, pct, totalXP: xp }
}

function ensureDefaults(u) {
  if (!u.totalLogins)  u.totalLogins  = 1
  if (!u.achievements) u.achievements = []
  if (!u.bossScores)   u.bossScores   = {}
  if (!u.matchHighPct) u.matchHighPct = {}
  if (u.coins == null) u.coins        = 0
  if (u.globalXP == null) u.globalXP  = 0
  if (!u.avatarName)   u.avatarName   = ''

  // Owned items — make sure all default char items are included
  if (!u.ownedItems) {
    u.ownedItems = [...DEFAULT_OWNED_CHAR]
  } else {
    for (const id of DEFAULT_OWNED_CHAR) {
      if (!u.ownedItems.includes(id)) u.ownedItems.push(id)
    }
  }

  // New character system
  if (!u.character) u.character = { ...DEFAULT_CHARACTER }

  // Daily missions (lazy — populated on first read each day)
  if (u.dailyMissions === undefined) u.dailyMissions = null

  // Word of the day claim record
  if (u.wordOfTheDay === undefined) u.wordOfTheDay = null

  // 词语斗争 — tier completion progress, keyed by unitNum
  // Shape: { [unitNum]: { apprentice:{cleared,score}, warrior:{cleared,score,bestCombo}, grandmaster:{cleared,score} } }
  if (!u.combatProgress) u.combatProgress = {}

  // Pet accessory slots
  if (!u.petHat)       u.petHat       = 'hat_none'
  if (!u.petAura)      u.petAura      = 'aura_none'
  if (!u.petCompanion) u.petCompanion = 'companion_none'
  if (!u.petWeapon)    u.petWeapon    = 'weapon_none'
  if (!u.petName)      u.petName      = ''

  // ── Streak freezes (2 per calendar month) ──
  const currentMonth = new Date().getMonth()
  if (u.streakFreezes == null || u.freezeMonth == null) {
    u.streakFreezes = 2
    u.freezeMonth   = currentMonth
  } else if (u.freezeMonth !== currentMonth) {
    u.streakFreezes = 2          // refresh at start of each new month
    u.freezeMonth   = currentMonth
  }

  // ── Per-word mastery { [unitNum]: { [vocabId]: { seen, correct, wrong, lastSeen } } } ──
  if (!u.wordMastery) u.wordMastery = {}

  if (!u.ownedPetItems) {
    u.ownedPetItems = [...DEFAULT_PET_OWNED]
  } else {
    for (const id of DEFAULT_PET_OWNED) {
      if (!u.ownedPetItems.includes(id)) u.ownedPetItems.push(id)
    }
  }
}

function emitAchievement(def) {
  window.dispatchEvent(new CustomEvent('vocab_achievement', { detail: def }))
}
function emitCoins(amount, total) {
  window.dispatchEvent(new CustomEvent('vocab_coins', { detail: { amount, total } }))
}
function emitMissionComplete(mission) {
  window.dispatchEvent(new CustomEvent('vocab_mission_complete', { detail: mission }))
}
function emitMissionsChanged() {
  window.dispatchEvent(new CustomEvent('vocab_missions_changed'))
}

function checkAchievements(u) {
  const earned = new Set(u.achievements || [])

  const unlock = (id) => {
    if (earned.has(id)) return false
    earned.add(id)
    const def = ACHIEVEMENTS.find(a => a.id === id)
    if (def) emitAchievement(def)
    return true   // newly unlocked
  }

  if (u.totalLogins >= 1)  unlock('first_login')
  if (u.streak >= 3  && unlock('streak3'))  { u.coins = (u.coins||0) + 25  }
  if (u.streak >= 7  && unlock('streak7'))  { u.coins = (u.coins||0) + 50  }
  if (u.streak >= 30 && unlock('streak30')) { u.coins = (u.coins||0) + 150 }

  const cleared = Object.values(u.bossScores||{}).filter(b=>b.cleared)
  if (cleared.length >= 1 && unlock('boss_clear'))                          { u.coins = (u.coins||0) + 40  }
  if (cleared.length >= 3 && unlock('boss_all'))                            { u.coins = (u.coins||0) + 100 }
  if (cleared.some(b=>b.bestMistakes===0) && unlock('boss_perfect'))        { u.coins = (u.coins||0) + 75  }
  if (Object.values(u.matchHighPct||{}).some(p=>p>=90) && unlock('match_ace')) { u.coins = (u.coins||0) + 50  }

  u.achievements = [...earned]
}

/* ── Public API ──────────────────────────────────────── */

export function loginUser(name) {
  const users = loadUsers()
  const today = todayStr()
  const isNew = !users[name]

  if (isNew) {
    users[name] = {
      lastLoginDate: today, streak: 1, longestStreak: 1, totalLogins: 1,
      achievements: [], bossScores: {}, matchHighPct: {},
      coins: 15,   // welcome bonus
      globalXP: 25, // welcome XP
      avatarName: '',
      ownedItems: [...DEFAULT_OWNED_CHAR],
      character: { ...DEFAULT_CHARACTER },
    }
  } else {
    const u = users[name]
    ensureDefaults(u)
    if (u.lastLoginDate !== today) {
      u.totalLogins += 1
      if (u.lastLoginDate === yesterdayStr()) {
        // Logged in yesterday — normal streak increase
        u.streak += 1
      } else if (u.lastLoginDate === twoDaysAgoStr() && u.streakFreezes > 0) {
        // Missed exactly 1 day — spend a freeze to protect the streak
        u.streakFreezes -= 1
        u.streak += 1
        u.usedFreezeToday = true   // flag for UI toast
      } else {
        // Missed 2+ days or no freezes left — reset
        u.streak = 1
        u.usedFreezeToday = false
      }
      u.longestStreak = Math.max(u.longestStreak||1, u.streak)
      u.lastLoginDate = today
      u.coins    = (u.coins    || 0) + 8
      u.globalXP = (u.globalXP || 0) + 25
    }
  }

  checkAchievements(users[name])
  saveUsers(users)
  localStorage.setItem(SESSION_KEY, name)
  return { name, isNew, ...users[name] }
}

/** Add coins to current user. Dispatches vocab_coins event. */
export function addCoins(amount) {
  const name = getCurrentName(); if (!name) return
  const users = loadUsers(); const u = users[name]; if (!u) return
  ensureDefaults(u)
  u.coins = (u.coins||0) + amount
  saveUsers(users)
  emitCoins(amount, u.coins)
}

/** Add XP to current user. Dispatches vocab_xp (always) and vocab_levelup (on level change). */
export function addXP(amount, source = '') {
  const name = getCurrentName(); if (!name) return
  const users = loadUsers(); const u = users[name]; if (!u) return
  ensureDefaults(u)
  const prevLevel = getLevelInfo(u.globalXP || 0).current.level
  u.globalXP = (u.globalXP || 0) + amount
  saveUsers(users)
  window.dispatchEvent(new CustomEvent('vocab_xp', { detail: { amount, total: u.globalXP, source } }))
  const newInfo = getLevelInfo(u.globalXP)
  if (newInfo.current.level > prevLevel) {
    window.dispatchEvent(new CustomEvent('vocab_levelup', { detail: { level: newInfo.current.level, info: newInfo } }))
  }
}

/** Name / rename the pet. Max 10 characters. Returns true on success. */
export function renamePet(newName) {
  const name = getCurrentName(); if (!name) return false
  const users = loadUsers(); const u = users[name]; if (!u) return false
  ensureDefaults(u)
  u.petName = String(newName).trim().slice(0, 10)
  saveUsers(users)
  return true
}

/** Rename the avatar. Max 12 characters. Returns true on success. */
export function renameAvatar(newName) {
  const name = getCurrentName(); if (!name) return false
  const users = loadUsers(); const u = users[name]; if (!u) return false
  ensureDefaults(u)
  u.avatarName = String(newName).trim().slice(0, 12)
  saveUsers(users)
  return true
}

/** Buy a shop item. Returns updated { coins, ownedItems } or null if failed. */
export function buyItem(itemId, price) {
  const name = getCurrentName(); if (!name) return null
  const users = loadUsers(); const u = users[name]; if (!u) return null
  ensureDefaults(u)
  if ((u.coins||0) < price)                      return null  // not enough
  if ((u.ownedItems||[]).includes(itemId))        return null  // already owned
  u.coins = (u.coins||0) - price
  u.ownedItems = [...(u.ownedItems||[]), itemId]
  saveUsers(users)
  emitCoins(-price, u.coins)
  return { coins: u.coins, ownedItems: u.ownedItems }
}

/** Equip an owned item to its slot on the character. */
export function equipItem(slot, itemId) {
  const name = getCurrentName(); if (!name) return null
  const users = loadUsers(); const u = users[name]; if (!u) return null
  ensureDefaults(u)
  if (!(u.ownedItems||[]).includes(itemId)) return null
  u.character = { ...(u.character||{}), [slot]: itemId }
  saveUsers(users)
  return { ...u.character }
}

/** Revert a slot to its gender-appropriate default. */
export function unequipItem(slot) {
  const name = getCurrentName(); if (!name) return null
  const users = loadUsers(); const u = users[name]; if (!u) return null
  ensureDefaults(u)
  const gender = u.character?.gender
  const defaults = {
    hair:      'hair_black',
    top:       'top_uniform',
    bottom:    gender === 'girl' ? 'bottom_uniform_girl' : 'bottom_uniform_boy',
    shoes:     'shoes_white',
    accessory: 'acc_none',
  }
  u.character = { ...(u.character||{}), [slot]: defaults[slot] ?? null }
  saveUsers(users)
  return { ...u.character }
}

/** Save chosen gender and equip the matching default bottom. */
export function saveCharacterGender(gender) {
  const name = getCurrentName(); if (!name) return null
  const users = loadUsers(); const u = users[name]; if (!u) return null
  ensureDefaults(u)
  const bottom = gender === 'girl' ? 'bottom_uniform_girl' : 'bottom_uniform_boy'
  u.character = { ...(u.character||{}), gender, bottom }
  saveUsers(users)
  return { ...u.character }
}

/* ── Word of the Day ─────────────────────────────────── */

/** Returns true if today's word-of-the-day has already been claimed. */
export function isWordOfDayClaimed() {
  const name = getCurrentName(); if (!name) return false
  const users = loadUsers(); const u = users[name]; if (!u) return false
  ensureDefaults(u)
  const today = todayStr()
  return u.wordOfTheDay?.date === today && u.wordOfTheDay?.claimed === true
}

/** Claim today's word-of-the-day reward. Returns true on success, false if
 *  already claimed today. Auto-dispatches coin event for the floating popup. */
export function claimWordOfTheDay() {
  const name = getCurrentName(); if (!name) return false
  const users = loadUsers(); const u = users[name]; if (!u) return false
  ensureDefaults(u)
  const today = todayStr()
  if (u.wordOfTheDay?.date === today && u.wordOfTheDay?.claimed) return false
  u.wordOfTheDay = { date: today, claimed: true }
  u.coins = (u.coins || 0) + WORD_OF_DAY_REWARD
  saveUsers(users)
  emitCoins(WORD_OF_DAY_REWARD, u.coins)
  window.dispatchEvent(new CustomEvent('vocab_wotd_claimed'))
  return true
}

/* ── Daily missions ──────────────────────────────────── */

/** Returns today's mission state. Regenerates if date rolled over. */
export function getDailyMissions() {
  const name = getCurrentName(); if (!name) return null
  const users = loadUsers(); const u = users[name]; if (!u) return null
  ensureDefaults(u)
  const today = todayStr()
  if (!u.dailyMissions || u.dailyMissions.date !== today) {
    u.dailyMissions = {
      date: today,
      missions: generateDailyMissions(today),
      bonusClaimed: false,
    }
    saveUsers(users)
  }
  return JSON.parse(JSON.stringify(u.dailyMissions))
}

/** Increment progress for any active mission listening to `eventType`.
 *  Auto-grants coin reward and emits events when a mission completes. */
export function trackMissionProgress(eventType, amount = 1) {
  const name = getCurrentName(); if (!name) return
  const users = loadUsers(); const u = users[name]; if (!u) return
  ensureDefaults(u)
  const today = todayStr()
  if (!u.dailyMissions || u.dailyMissions.date !== today) {
    u.dailyMissions = {
      date: today,
      missions: generateDailyMissions(today),
      bonusClaimed: false,
    }
  }

  let changed = false
  for (const m of u.dailyMissions.missions) {
    if (m.done) continue
    const events = MISSION_EVENTS[m.id]
    if (!events || !events.includes(eventType)) continue
    m.progress = Math.min(m.target, m.progress + amount)
    changed = true
    if (m.progress >= m.target) {
      m.done = true
      u.coins = (u.coins || 0) + m.reward
      saveUsers(users)
      emitCoins(m.reward, u.coins)
      emitMissionComplete({ ...m, kind: 'mission' })
    }
  }

  // All-3 bonus
  if (
    !u.dailyMissions.bonusClaimed &&
    u.dailyMissions.missions.length === 3 &&
    u.dailyMissions.missions.every(m => m.done)
  ) {
    u.dailyMissions.bonusClaimed = true
    u.coins = (u.coins || 0) + ALL_3_BONUS
    saveUsers(users)
    emitCoins(ALL_3_BONUS, u.coins)
    emitMissionComplete({
      id: '__all_three__',
      kind: 'all_three',
      text: '三任务全清！',
      reward: ALL_3_BONUS,
      icon: '🎊',
    })
  }

  if (changed) {
    saveUsers(users)
    emitMissionsChanged()
  }
}

export function saveBossScore(unitNum, mistakes) {
  const name = getCurrentName(); if (!name) return
  const users = loadUsers(); const u = users[name]; if (!u) return
  ensureDefaults(u)
  const key = String(unitNum)
  const prev = u.bossScores[key]
  if (!prev?.cleared || mistakes < prev.bestMistakes)
    u.bossScores[key] = { cleared: true, bestMistakes: mistakes }
  checkAchievements(u)
  saveUsers(users)
}

export function saveMatchScore(unitNum, pct) {
  const name = getCurrentName(); if (!name) return
  const users = loadUsers(); const u = users[name]; if (!u) return
  ensureDefaults(u)
  const key = String(unitNum)
  if (!u.matchHighPct[key] || pct > u.matchHighPct[key]) u.matchHighPct[key] = pct
  checkAchievements(u)
  saveUsers(users)
}

export function getSession() {
  const name = localStorage.getItem(SESSION_KEY); if (!name) return null
  const users = loadUsers(); if (!users[name]) return null
  return { name, ...users[name] }
}

export function logoutUser() { localStorage.removeItem(SESSION_KEY) }

/* ── 词语斗争 Tier Progress ───────────────────────────── */

/** Get the combat progress for a unit. Always returns a complete shape. */
export function getCombatProgress(unitNum) {
  const empty = {
    apprentice:  { cleared: false, bestScore: 0 },
    warrior:     { cleared: false, bestScore: 0, bestCombo: 0 },
    grandmaster: { cleared: false, bestScore: 0 },
  }
  const name = getCurrentName(); if (!name) return empty
  const users = loadUsers(); const u = users[name]; if (!u) return empty
  ensureDefaults(u)
  const key = String(unitNum)
  const stored = u.combatProgress[key] || {}
  return {
    apprentice:  { ...empty.apprentice,  ...(stored.apprentice  || {}) },
    warrior:     { ...empty.warrior,     ...(stored.warrior     || {}) },
    grandmaster: { ...empty.grandmaster, ...(stored.grandmaster || {}) },
  }
}

/** Save tier completion. tier ∈ 'apprentice'|'warrior'|'grandmaster'.
 *  payload may include { score, bestCombo }. */
export function saveCombatTier(unitNum, tier, payload = {}) {
  const name = getCurrentName(); if (!name) return
  const users = loadUsers(); const u = users[name]; if (!u) return
  ensureDefaults(u)
  const key = String(unitNum)
  if (!u.combatProgress[key]) u.combatProgress[key] = {}
  const prev = u.combatProgress[key][tier] || {}
  const next = { ...prev, cleared: true }
  if (typeof payload.score === 'number') {
    next.bestScore = Math.max(prev.bestScore || 0, payload.score)
  }
  if (typeof payload.bestCombo === 'number') {
    next.bestCombo = Math.max(prev.bestCombo || 0, payload.bestCombo)
  }
  u.combatProgress[key][tier] = next
  saveUsers(users)
}

/** Get the boss damage multiplier for a unit based on highest tier cleared. */
export function getCombatDamageMultiplier(unitNum) {
  const p = getCombatProgress(unitNum)
  if (p.grandmaster.cleared) return 2.0
  if (p.warrior.cleared)     return 1.5
  return 1.0
}

/* ── Story Adventure ──────────────────────────────────── */

/** Get story progress for a given world. Returns { storyXP, episodes: {id: {completed, stars}} } */
export function getStoryProgress(worldId) {
  const name  = getCurrentName(); if (!name) return { storyXP: 0, episodes: {} }
  const users = loadUsers(); const u = users[name]; if (!u) return { storyXP: 0, episodes: {} }
  ensureDefaults(u)
  const sp = u.storyProgress?.[worldId] || {}
  return { storyXP: u.storyXP || 0, episodes: sp }
}

/* ── Pet Accessory Shop ───────────────────────────────── */

/** Buy a pet accessory item. Returns updated { coins, ownedPetItems } or null if failed. */
export function buyPetItem(itemId, price) {
  const name = getCurrentName(); if (!name) return null
  const users = loadUsers(); const u = users[name]; if (!u) return null
  ensureDefaults(u)
  if ((u.coins || 0) < price)                         return null  // not enough coins
  if ((u.ownedPetItems || []).includes(itemId))       return null  // already owned
  u.coins = (u.coins || 0) - price
  u.ownedPetItems = [...(u.ownedPetItems || []), itemId]
  saveUsers(users)
  emitCoins(-price, u.coins)
  return { coins: u.coins, ownedPetItems: u.ownedPetItems }
}

/** Equip an owned pet item. category is 'hat'|'aura'|'companion'.
 *  Sets u.petHat / u.petAura / u.petCompanion accordingly. */
export function equipPetItem(category, itemId) {
  const name = getCurrentName(); if (!name) return null
  const users = loadUsers(); const u = users[name]; if (!u) return null
  ensureDefaults(u)
  if (!(u.ownedPetItems || []).includes(itemId)) return null
  const slotMap = { hat: 'petHat', aura: 'petAura', companion: 'petCompanion', weapon: 'petWeapon' }
  const slot = slotMap[category]
  if (!slot) return null
  u[slot] = itemId
  saveUsers(users)
  return { petHat: u.petHat, petAura: u.petAura, petCompanion: u.petCompanion, petWeapon: u.petWeapon }
}

/* ── Per-word mastery ────────────────────────────────── */

/** Record whether the student answered a vocab correctly in a game.
 *  unitNum: number, vocabId: number|string, isCorrect: boolean */
export function trackWordResult(unitNum, vocabId, isCorrect) {
  const name = getCurrentName(); if (!name) return
  const users = loadUsers(); const u = users[name]; if (!u) return
  ensureDefaults(u)
  const uKey = String(unitNum)
  const vKey = String(vocabId)
  if (!u.wordMastery[uKey]) u.wordMastery[uKey] = {}
  const prev = u.wordMastery[uKey][vKey] || { seen: 0, correct: 0, wrong: 0, lastSeen: '' }
  u.wordMastery[uKey][vKey] = {
    seen:     prev.seen    + 1,
    correct:  prev.correct + (isCorrect ? 1 : 0),
    wrong:    prev.wrong   + (isCorrect ? 0 : 1),
    lastSeen: todayStr(),
  }
  saveUsers(users)
}

/** Return vocabs the student has answered wrong at least once, sorted by
 *  wrong-rate descending (hardest first).  Pass the full vocabs array. */
export function getWeakWords(unitNum, vocabs) {
  const name = getCurrentName(); if (!name) return []
  const users = loadUsers(); const u = users[name]; if (!u) return []
  const mastery = u.wordMastery?.[String(unitNum)] || {}
  return vocabs
    .filter(v => {
      const m = mastery[String(v.id)]
      return m && m.seen > 0 && m.wrong > 0
    })
    .sort((a, b) => {
      const ma = mastery[String(a.id)]
      const mb = mastery[String(b.id)]
      return (mb.wrong / mb.seen) - (ma.wrong / ma.seen)   // highest wrong-rate first
    })
}

/** Save completed episode and award XP. */
export function saveEpisodeComplete(worldId, episodeId, stars, xp) {
  const name  = getCurrentName(); if (!name) return
  const users = loadUsers(); const u = users[name]; if (!u) return
  ensureDefaults(u)
  if (!u.storyProgress)          u.storyProgress = {}
  if (!u.storyProgress[worldId]) u.storyProgress[worldId] = {}
  const prev = u.storyProgress[worldId][episodeId]
  if (!prev || stars > (prev.stars || 0)) {
    u.storyProgress[worldId][episodeId] = { completed: true, stars }
  }
  u.storyXP = (u.storyXP || 0) + xp
  saveUsers(users)
}

/* ── Teacher dashboard sync ──────────────────────────── */

/** Fire-and-forget: POST current student snapshot to Redis so the
 *  teacher dashboard always has up-to-date data. Safe to call often. */
export function syncProgress() {
  const name = getCurrentName()
  if (!name) return
  const users = loadUsers()
  const u = users[name]
  if (!u) return
  ensureDefaults(u)
  const data = {
    xp:            u.globalXP        || 0,
    streak:        u.streak          || 1,
    longestStreak: u.longestStreak   || 1,
    totalLogins:   u.totalLogins     || 1,
    lastLoginDate: u.lastLoginDate   || '',
    achievements:  u.achievements    || [],
    bossScores:    u.bossScores      || {},
    matchHighPct:  u.matchHighPct    || {},
    wordMastery:   u.wordMastery     || {},
    combatProgress:u.combatProgress  || {},
    streakFreezes: u.streakFreezes   ?? 2,
    coins:         u.coins           || 0,
  }
  fetch('/api/sync-progress', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name, data }),
  }).catch(() => {})
}
