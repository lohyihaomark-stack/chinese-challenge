/* ══════════════════════════════════════════════════════════
   PET ACCESSORIES SHOP DATA
   ══════════════════════════════════════════════════════════ */

export const PET_SHOP_ITEMS = {
  hat: {
    label: '头饰',
    icon: '🎩',
    items: [
      { id: 'hat_none',    name: '无',     price: 0,   emoji: '✖️',  category: 'hat', desc: '不戴任何头饰' },
      { id: 'hat_bow',     name: '蝴蝶结', price: 50,  emoji: '🎀',  category: 'hat', desc: '可爱的粉色蝴蝶结' },
      { id: 'hat_flower',  name: '花环',   price: 80,  emoji: '🌸',  category: 'hat', desc: '清新花朵编成的环' },
      { id: 'hat_magic',   name: '魔法帽', price: 100, emoji: '🎩',  category: 'hat', desc: '神秘魔法师的礼帽' },
      { id: 'hat_gem',     name: '宝石夹', price: 150, emoji: '💎',  category: 'hat', desc: '闪耀宝石发夹' },
      { id: 'hat_star',    name: '星冠',   price: 200, emoji: '⭐',  category: 'hat', desc: '璀璨星光编织的王冠' },
      { id: 'hat_halo',    name: '光环',   price: 250, emoji: '😇',  category: 'hat', desc: '神圣光明的圆形光环' },
      { id: 'hat_samurai', name: '武士盔', price: 300, emoji: '⛩️',  category: 'hat', desc: '古代武士的战盔' },
      { id: 'hat_crown',   name: '皇冠',   price: 350, emoji: '👑',  category: 'hat', desc: '尊贵无比的黄金皇冠' },
      { id: 'hat_dragon',  name: '龙角',   price: 420, emoji: '🔱',  category: 'hat', desc: '传说真龙的神秘双角' },
      { id: 'hat_divine',  name: '神冕',   price: 550, emoji: '🌟',  category: 'hat', desc: '神明降临的荣耀之冕' },
    ],
  },
  aura: {
    label: '光晕',
    icon: '✨',
    items: [
      { id: 'aura_none',    name: '无',   price: 0,   emoji: '✖️',  category: 'aura', desc: '没有光晕效果' },
      { id: 'aura_star',    name: '星光', price: 60,  emoji: '🌟',  category: 'aura', desc: '细碎星光环绕身周' },
      { id: 'aura_petal',   name: '花瓣', price: 90,  emoji: '🌸',  category: 'aura', desc: '粉色花瓣漂浮四周' },
      { id: 'aura_flame',   name: '炎光', price: 150, emoji: '🔥',  category: 'aura', desc: '熊熊烈焰缠绕全身' },
      { id: 'aura_ice',     name: '冰晶', price: 180, emoji: '❄️',  category: 'aura', desc: '冰蓝晶体漂浮四周' },
      { id: 'aura_thunder', name: '雷电', price: 220, emoji: '⚡',  category: 'aura', desc: '紫色雷光闪烁不停' },
      { id: 'aura_shadow',  name: '暗影', price: 270, emoji: '🌑',  category: 'aura', desc: '神秘暗影弥漫全身' },
      { id: 'aura_holy',    name: '神圣', price: 320, emoji: '💫',  category: 'aura', desc: '圣洁白光笼罩身形' },
      { id: 'aura_rainbow', name: '彩虹', price: 400, emoji: '🌈',  category: 'aura', desc: '七彩虹光流动缠绕' },
      { id: 'aura_sakura',  name: '樱花', price: 480, emoji: '🌺',  category: 'aura', desc: '粉樱飞舞如梦如幻' },
      { id: 'aura_cosmos',  name: '宇宙', price: 550, emoji: '🌌',  category: 'aura', desc: '宇宙星云在身周流转' },
      { id: 'aura_dragon',  name: '龙焰', price: 700, emoji: '🐉',  category: 'aura', desc: '真龙之焰席卷四方' },
    ],
  },
  companion: {
    label: '伙伴',
    icon: '🐾',
    items: [
      { id: 'companion_none',      name: '无',    price: 0,   emoji: '✖️', category: 'companion', desc: '没有伙伴' },
      { id: 'companion_star',      name: '星星',  price: 80,  emoji: '⭐', category: 'companion', desc: '闪烁的小星星陪伴' },
      { id: 'companion_moon',      name: '月亮',  price: 120, emoji: '🌙', category: 'companion', desc: '弯弯的小月亮伴随' },
      { id: 'companion_butterfly', name: '蝴蝶',  price: 160, emoji: '🦋', category: 'companion', desc: '彩翅蝴蝶翩翩起舞' },
      { id: 'companion_bird',      name: '小鸟',  price: 200, emoji: '🐦', category: 'companion', desc: '活泼小鸟欢快飞翔' },
      { id: 'companion_fox',       name: '小狐',  price: 280, emoji: '🦊', category: 'companion', desc: '灵动小狐紧随其后' },
      { id: 'companion_ghost',     name: '幽灵',  price: 300, emoji: '👻', category: 'companion', desc: '调皮幽灵时隐时现' },
      { id: 'companion_phoenix',   name: '凤凰',  price: 400, emoji: '🦅', category: 'companion', desc: '不死凤凰伴飞左右' },
      { id: 'companion_dragon',    name: '小龙',  price: 450, emoji: '🐲', category: 'companion', desc: '威武的小龙跟随左右' },
      { id: 'companion_unicorn',   name: '独角兽', price: 600, emoji: '🦄', category: 'companion', desc: '梦幻独角兽随行守护' },
    ],
  },
  weapon: {
    label: '武器',
    icon: '⚔️',
    items: [
      { id: 'weapon_none',      name: '无',     price: 0,   emoji: '✖️', category: 'weapon', desc: '不持任何武器' },
      { id: 'weapon_dagger',    name: '匕首',   price: 120, emoji: '🗡️', category: 'weapon', desc: '轻巧的暗影匕首' },
      { id: 'weapon_staff',     name: '法杖',   price: 180, emoji: '🪄', category: 'weapon', desc: '神秘的魔法手杖' },
      { id: 'weapon_bow',       name: '弓箭',   price: 220, emoji: '🏹', category: 'weapon', desc: '精准射击的银色弓' },
      { id: 'weapon_shield',    name: '圣盾',   price: 280, emoji: '🛡️', category: 'weapon', desc: '坚不可摧的神圣盾牌' },
      { id: 'weapon_sword',     name: '神剑',   price: 350, emoji: '⚔️', category: 'weapon', desc: '传说中的神圣之剑' },
      { id: 'weapon_axe',       name: '战斧',   price: 420, emoji: '🪓', category: 'weapon', desc: '威力强大的远古战斧' },
      { id: 'weapon_trident',   name: '三叉戟', price: 500, emoji: '🔱', category: 'weapon', desc: '海神的三叉神器' },
      { id: 'weapon_crystal',   name: '水晶球', price: 580, emoji: '🔮', category: 'weapon', desc: '预知未来的魔法水晶' },
      { id: 'weapon_lightning', name: '闪电刃', price: 700, emoji: '⚡', category: 'weapon', desc: '雷神之力凝聚的刀刃' },
    ],
  },
}

export const DEFAULT_PET_OWNED = ['hat_none', 'aura_none', 'companion_none', 'weapon_none']

/** Find a pet shop item by id across all categories */
export function findPetItem(itemId) {
  for (const cat of Object.values(PET_SHOP_ITEMS)) {
    const found = cat.items.find(i => i.id === itemId)
    if (found) return found
  }
  return null
}

/** Get the category key for a given itemId */
export function getPetItemCategory(itemId) {
  if (!itemId) return null
  if (itemId.startsWith('hat_'))       return 'hat'
  if (itemId.startsWith('aura_'))      return 'aura'
  if (itemId.startsWith('companion_')) return 'companion'
  if (itemId.startsWith('weapon_'))    return 'weapon'
  return null
}
