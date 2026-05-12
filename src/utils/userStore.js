import { DEFAULT_OWNED_CHAR, DEFAULT_CHARACTER } from './shopData'

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
function loadUsers()    { try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {} } catch { return {} } }
function saveUsers(u)   { localStorage.setItem(USERS_KEY, JSON.stringify(u)) }
export  function getCurrentName() { return localStorage.getItem(SESSION_KEY) }

function ensureDefaults(u) {
  if (!u.totalLogins)  u.totalLogins  = 1
  if (!u.achievements) u.achievements = []
  if (!u.bossScores)   u.bossScores   = {}
  if (!u.matchHighPct) u.matchHighPct = {}
  if (u.coins == null) u.coins        = 0

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
}

function emitAchievement(def) {
  window.dispatchEvent(new CustomEvent('vocab_achievement', { detail: def }))
}
function emitCoins(amount, total) {
  window.dispatchEvent(new CustomEvent('vocab_coins', { detail: { amount, total } }))
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
  if (u.streak >= 3  && unlock('streak3'))  { u.coins = (u.coins||0) + 50  }
  if (u.streak >= 7  && unlock('streak7'))  { u.coins = (u.coins||0) + 100 }
  if (u.streak >= 30 && unlock('streak30')) { u.coins = (u.coins||0) + 300 }

  const cleared = Object.values(u.bossScores||{}).filter(b=>b.cleared)
  if (cleared.length >= 1 && unlock('boss_clear'))                          { u.coins = (u.coins||0) + 80  }
  if (cleared.length >= 3 && unlock('boss_all'))                            { u.coins = (u.coins||0) + 200 }
  if (cleared.some(b=>b.bestMistakes===0) && unlock('boss_perfect'))        { u.coins = (u.coins||0) + 150 }
  if (Object.values(u.matchHighPct||{}).some(p=>p>=90) && unlock('match_ace')) { u.coins = (u.coins||0) + 100 }

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
      coins: 30,   // welcome bonus
      ownedItems: [...DEFAULT_OWNED_CHAR],
      character: { ...DEFAULT_CHARACTER },
    }
  } else {
    const u = users[name]
    ensureDefaults(u)
    if (u.lastLoginDate !== today) {
      u.totalLogins += 1
      u.streak = (u.lastLoginDate === yesterdayStr()) ? u.streak + 1 : 1
      u.longestStreak = Math.max(u.longestStreak||1, u.streak)
      u.lastLoginDate = today
      u.coins = (u.coins||0) + 20   // daily login bonus
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

/* ── Story Adventure ──────────────────────────────────── */

/** Get story progress for a given world. Returns { storyXP, episodes: {id: {completed, stars}} } */
export function getStoryProgress(worldId) {
  const name  = getCurrentName(); if (!name) return { storyXP: 0, episodes: {} }
  const users = loadUsers(); const u = users[name]; if (!u) return { storyXP: 0, episodes: {} }
  ensureDefaults(u)
  const sp = u.storyProgress?.[worldId] || {}
  return { storyXP: u.storyXP || 0, episodes: sp }
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
