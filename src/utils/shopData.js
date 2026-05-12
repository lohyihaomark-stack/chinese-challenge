/* ── Dress-up character shop ─────────────────────────── */

export const SHOP_ITEMS = {
  hair: {
    label: '发型', icon: '💇',
    slot: 'hair',
    items: [
      { id: 'hair_black',  name: '黑色直发',   price: 0,   forGender: 'both', color: '#1C1C1E' },
      { id: 'hair_brown',  name: '棕色卷发',   price: 30,  forGender: 'both', color: '#6B4226' },
      { id: 'hair_yellow', name: '金色发型',   price: 60,  forGender: 'girl', color: '#FCD34D' },
      { id: 'hair_red',    name: '红色潮发',   price: 80,  forGender: 'both', color: '#DC2626' },
      { id: 'hair_blue',   name: '蓝色染发',   price: 120, forGender: 'both', color: '#2563EB' },
      { id: 'hair_pink',   name: '粉色公主发', price: 150, forGender: 'girl', color: '#F472B6' },
      { id: 'hair_purple', name: '紫色魔法发', price: 200, forGender: 'both', color: '#7C3AED' },
      { id: 'hair_white',  name: '白银发型',   price: 280, forGender: 'both', color: '#D1D5DB' },
    ],
  },
  top: {
    label: '上衣', icon: '👕',
    slot: 'top',
    items: [
      { id: 'top_uniform', name: '校服上衣',   price: 0,   forGender: 'both', color: '#BFDBFE' },
      { id: 'top_red',     name: '红色运动衣', price: 40,  forGender: 'both', color: '#EF4444' },
      { id: 'top_green',   name: '绿色上衣',   price: 60,  forGender: 'both', color: '#10B981' },
      { id: 'top_pink',    name: '粉色公主衫', price: 80,  forGender: 'girl', color: '#FDA4AF' },
      { id: 'top_black',   name: '酷黑上衣',   price: 100, forGender: 'both', color: '#374151' },
      { id: 'top_orange',  name: '橙色潮衫',   price: 130, forGender: 'both', color: '#FB923C' },
      { id: 'top_purple',  name: '紫色魔法袍', price: 220, forGender: 'both', color: '#7C3AED' },
      { id: 'top_gold',    name: '金色战甲',   price: 380, forGender: 'both', color: '#D97706' },
    ],
  },
  bottom: {
    label: '下装', icon: '👖',
    slot: 'bottom',
    items: [
      { id: 'bottom_uniform_boy',  name: '校服裤',   price: 0,   forGender: 'boy',  color: '#1E3A8A', isSkirt: false },
      { id: 'bottom_uniform_girl', name: '校服裙',   price: 0,   forGender: 'girl', color: '#1E3A8A', isSkirt: true  },
      { id: 'bottom_jeans',        name: '牛仔裤',   price: 50,  forGender: 'both', color: '#1D4ED8', isSkirt: false },
      { id: 'bottom_red',          name: '红色短裤',  price: 70,  forGender: 'both', color: '#DC2626', isSkirt: false },
      { id: 'bottom_black',        name: '黑色裤',   price: 80,  forGender: 'both', color: '#111827', isSkirt: false },
      { id: 'bottom_pink_skirt',   name: '粉色裙',   price: 100, forGender: 'girl', color: '#F9A8D4', isSkirt: true  },
      { id: 'bottom_green',        name: '绿色长裤',  price: 110, forGender: 'both', color: '#059669', isSkirt: false },
      { id: 'bottom_royal',        name: '皇家长裤',  price: 260, forGender: 'both', color: '#6D28D9', isSkirt: false },
    ],
  },
  shoes: {
    label: '鞋子', icon: '👟',
    slot: 'shoes',
    items: [
      { id: 'shoes_white', name: '白色球鞋',   price: 0,   forGender: 'both', color: '#F3F4F6' },
      { id: 'shoes_black', name: '黑色皮鞋',   price: 50,  forGender: 'both', color: '#1F2937' },
      { id: 'shoes_blue',  name: '蓝色球鞋',   price: 60,  forGender: 'both', color: '#3B82F6' },
      { id: 'shoes_red',   name: '红色运动鞋', price: 70,  forGender: 'both', color: '#EF4444' },
      { id: 'shoes_pink',  name: '粉色小鞋',   price: 80,  forGender: 'girl', color: '#F9A8D4' },
      { id: 'shoes_gold',  name: '金色战靴',   price: 160, forGender: 'both', color: '#D97706' },
    ],
  },
  accessory: {
    label: '配件', icon: '🎀',
    slot: 'accessory',
    items: [
      { id: 'acc_none',    name: '无配件',  price: 0,   forGender: 'both', type: 'none',    emoji: '✕'  },
      { id: 'acc_glasses', name: '眼　镜',  price: 60,  forGender: 'both', type: 'glasses', emoji: '👓' },
      { id: 'acc_bow',     name: '蝴蝶结',  price: 80,  forGender: 'girl', type: 'bow',     emoji: '🎀' },
      { id: 'acc_cap',     name: '棒球帽',  price: 90,  forGender: 'both', type: 'cap',     emoji: '🧢' },
      { id: 'acc_scarf',   name: '围　巾',  price: 110, forGender: 'both', type: 'scarf',   emoji: '🧣' },
      { id: 'acc_bag',     name: '书　包',  price: 130, forGender: 'both', type: 'bag',     emoji: '🎒' },
      { id: 'acc_crown',   name: '王　冠',  price: 400, forGender: 'both', type: 'crown',   emoji: '👑' },
    ],
  },
}

export const ALL_CHAR_ITEMS = Object.values(SHOP_ITEMS).flatMap(c => c.items)

export function findCharItem(slot, id) {
  if (!id) return null
  return ALL_CHAR_ITEMS.find(i => i.id === id) ?? null
}

/** All items a new user owns by default (both genders so we can auto-equip based on choice) */
export const DEFAULT_OWNED_CHAR = [
  'hair_black', 'top_uniform',
  'bottom_uniform_boy', 'bottom_uniform_girl',
  'shoes_white', 'acc_none',
]

export const DEFAULT_CHARACTER = {
  gender: null,          // null = not chosen yet
  hair: 'hair_black',
  top: 'top_uniform',
  bottom: null,          // set to uniform_{gender} on first open
  shoes: 'shoes_white',
  accessory: 'acc_none',
}

/* ── Legacy compat exports (keep so old imports don't break) ── */
export const DEFAULT_OWNED = DEFAULT_OWNED_CHAR
export const DEFAULT_PET   = {}
