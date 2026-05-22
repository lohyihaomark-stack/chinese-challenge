import { useState, useEffect, useRef, useCallback } from 'react'
import { addCoins, addXP } from '../utils/userStore'
import { speak } from '../utils/speech'

/* ═══════════════════════════════════════════════════════════
   WORD-AWARE SEGMENTER
   ════════════════════════════════════════════════════════════
   Rules:
   • Vocab word → always its own tile (or +particle if directly follows: 科技的, 坚持着)
   • Dict words → always kept intact (unit vocab + common words)
   • Unknown text → 1-char fallback (avoids merging separate words like 她拿, 出黄)
   • Particles (的/了/着…) after a chunk → attach to previous chunk
   • Comma 「，」 → always its own tile
*/

const PARTICLES = new Set(['的','了','着','过','地','得','们','吗','呢','吧','嘛','啊','呀','哦','哇'])

const COMMON_WORDS = [
  // ── Pronouns / references
  '他们','她们','我们','你们','大家','自己','别人','对方',
  '这个','那个','这些','那些','这种','那种','这里','那里','哪里',
  // ── Measure / number combos
  '一个','两个','三个','一种','一些','很多','一次','一天','一年',
  '每个','每天','每次','一点','一切','不少','许多','几个','各种',
  '一番','一阵','三分钟','五分钟','一段','一条','一批','一套','一道',
  // ── Time
  '以前','以后','现在','当时','那时','今天','明天','昨天','去年','今年',
  '经常','总是','有时','偶尔','从来','一直','慢慢','渐渐','已经','立刻',
  '马上','平时','以往','从小','长大','新年','过年','过去','将来','同时',
  '一向','一贯','随时','及时','按时','早上','下午','晚上','中午','凌晨',
  '每天','今后','之前','之后','那天','当天','此刻','日后',
  // ── Conjunctions / connectors
  '因为','所以','但是','虽然','如果','只要','不管','无论','而且','不仅',
  '不但','为了','通过','由于','对于','关于','不过','然而','况且','于是',
  '因此','从而','尽管','即使','哪怕','只有','除非','否则','随着','即便',
  // ── Modal / adverbs
  '可以','应该','需要','能够','必须','可能','愿意','应当','不必','不用',
  '一定','肯定','确实','真的','其实','当然','根本','完全','几乎','总共',
  '尤其','特别','非常','十分','相当','比较','极为','格外',
  '不要','不能','不会','不是','不好','没有','没关系','没问题','没想到',
  '终于','终究','原来','原本','反而','甚至','居然','竟然','忽然','突然',
  // ── Common verbs
  '坚持','努力','帮助','告诉','相信','感觉','注意','参加','完成','保护',
  '选择','决定','继续','认为','觉得','喜欢','知道','开始','结束','希望',
  '感谢','利用','寻找','发现','创造','保持','追求','改变','影响','表现',
  '学习','工作','生活','成功','失败','获得','失去','感到','放弃','接受',
  '拒绝','允许','要求','期望','合作','分享','照顾','关心','担心','放心',
  '养成','培养','建立','形成','克服','解决','处理','面对','回答','提问',
  '成为','变成','变得','发展','迅速','使用','拥有','享受','保证','确保',
  '鼓励','称赞','推荐','选择','描述','分析','记录','观察','研究','探索',
  '发明','创造','制作','设计','建设','改善','提高','增加','减少',
  // ── Directional complements & resultative verbs
  '出来','进来','回来','起来','出去','进去','回去','上来','下来','过来',
  '拿出','走出','跑出','冲出','取出','说出','做出','找出','拿到','得到',
  '走进','跑进','冲进','带回','拿回','送回','放下','放入','放进','放到',
  '看到','听到','想到','感到','遇到','碰到','来到','回到','走到','跑到',
  // ── Colors
  '黄色','红色','白色','蓝色','绿色','棕色','黑色','紫色','橙色','金黄',
  // ── Common nouns
  '朋友','家人','父母','老师','同学','学生','学校','课堂','时间','问题',
  '事情','方法','地方','年级','生命','感情','精神','心情','态度','能力',
  '机会','环境','社会','文化','历史','传统','世界','国家','家庭','习惯',
  '意义','价值','作用','影响','结果','原因','目的','过程','经验','感受',
  '班上','课上','校园','年龄','小时','智能','手机','工具',
  // ── School / study
  '课文','复习','成绩','考试','满分','假期','作业','比赛','冠军','奖状',
  '题目','文章','作文','写作','词语','读书','书本','知识','方法','技巧',
  // ── Family members
  '妈妈','爸爸','奶奶','爷爷','姐姐','弟弟','哥哥','妹妹','父亲','母亲',
  '儿子','女儿','公婆','亲人','家人',
  // ── Food / everyday objects
  '玩具','书包','花瓶','胶水','红包','灯笼','调味','年糕','年菜','饺子',
  '薯条','牙膏','橡皮','番茄','鱼片','鸡肉','猪肉','白菜','虾仁',
  // ── Place / environment
  '地板','操场','天空','餐桌','街道','隧道','车站','轨道','宿舍','港口',
  '山上','山下','楼上','楼下','校园','室内','室外','广场','田野','海边',
  // ── Common adjectives / states
  '亲切','开朗','活泼','整洁','细腻','鲜美','清澈','稳固','简单','复杂',
  '热腾','浓郁','悠久','繁荣','平凡','特殊','均衡','顺畅','安全','危险',
  '认真','努力','勤劳','勇敢','聪明','善良','诚实','耐心','热情','冷静',
  '后悔','满足','欣慰','骄傲','紧张','兴奋','担心','惊讶','失望','愤怒',
  // ── Super-common function words / question words
  '什么','这么','那么','怎么','为什么','哪些','哪里','多少','如何',
  '任何','所有','各种','某些','某个','另一',
  '后面','前面','旁边','中间','周围','上面','下面','里面','外面',
  // ── Sports / events
  '运动','运动会','比赛中','决赛','学校运动','学校里',
  // ── Whole-body / full-group
  '全身','全班','全家','全国','全部','整个','整天','整整',
  // ── Emotions / inner states
  '充满','心里','心中','勇气','勇敢','希望','梦想','决心','信心','热爱',
  '思念','怀念','牵挂','担忧','恐惧','紧张','兴奋','激动','感动','后悔',
  // ── Common verbs (extra)
  '鼓励','克服','实现','放弃','坚守','奉献','牺牲','传承','奋斗','拼搏',
  '发表','演讲','上台','表演','参与','合作','沟通','交流','分析','研究',
  '维护','检验','扫描','检查','修复','拆除','安装','设计','建设','规划',
  // ── Nature / environment
  '家乡','故乡','异国','他乡','天空','大海','山上','山下','田野','森林',
  '美食','美景','风景','夜景','夜空','夜晚','早晨','清晨','傍晚','黄昏',
  '天气','气候','温度','湿度','阳光','雨水','风声','雷声','闪电',
  // ── Misc common 2-char
  '节日','传统','古代','现代','历史','地理','自然','社区','地区','全球',
  '记账','调解','鼓掌','掌声','颁布','颁发','维修','投入',
  '岁月','沧桑','变迁','奇迹','里程','贸易','航运','地标','遗产',
  // ── 4-char phrases (additional)
  '无时无刻','与此同时','来者不拒','助人为乐','不偏不倚','举足轻重',
  // ── 3-char common phrases
  '出了名','不一定','有时候','不知道','没想到','了解到','认识到',
  '调味料','好消息','好办法','好方法','做功课','上学去','回家去',
  '三分钟','五分钟','不小心',
  // ── 4-char phrases kept intact
  '毫不犹豫','不可或缺','安安静静','一声不响','不知不觉','笑着答应',
  '全力以赴','慢条斯理','一帆风顺','断断续续','循序渐进','一马平川',
]

function buildWordSet(vocabs) {
  const ws = new Set(COMMON_WORDS)
  for (const v of vocabs) {
    ws.add(v.hanzi)
    for (const c of (v.collocations || [])) ws.add(c)
  }
  return ws
}

/* Segment a plain text chunk (no vocab word inside) into tiles */
function segPart(text, wordSet) {
  if (!text) return []
  const chunks = []
  let i = 0

  while (i < text.length) {
    const ch = text[i]

    // ── Particle: attach to previous chunk ──────────────────
    if (PARTICLES.has(ch)) {
      if (chunks.length > 0) {
        chunks[chunks.length - 1] += ch
        i++
        continue
      }
      // Leading particle — fall through to 1-char fallback below
    }

    // ── Dictionary longest-match (5 → 2 chars) ──────────────
    let matched = false
    for (let len = Math.min(5, text.length - i); len >= 2; len--) {
      if (wordSet.has(text.slice(i, i + len))) {
        chunks.push(text.slice(i, i + len))
        i += len
        matched = true
        break
      }
    }
    if (matched) continue

    // ── 1-char fallback — unknown char becomes its own tile ──
    // (avoids merging separate words like 她+拿 → 她拿, 出+黄 → 出黄)
    chunks.push(ch)
    i++
  }

  return chunks.filter(c => c.length > 0)
}

/*
 * Segment a clause that contains the vocab word.
 * The vocab word is always its own tile.
 * If the char immediately after the vocab word is a particle (的/了/着/地/得)
 * it is absorbed into the vocab tile — e.g. 科技的, 坚持着, 认真地.
 * This keeps the remaining text clean for dict-matching.
 */
function segClause(clauseText, vocabWord, wordSet) {
  if (!clauseText) return []
  const vIdx = clauseText.indexOf(vocabWord)
  if (vIdx < 0) return segPart(clauseText, wordSet)

  const before = clauseText.slice(0, vIdx)
  let   after  = clauseText.slice(vIdx + vocabWord.length)
  let   vTile  = vocabWord

  // Absorb immediately following particle into vocab tile
  if (after.length > 0 && PARTICLES.has(after[0])) {
    vTile += after[0]
    after  = after.slice(1)
  }

  return [
    ...segPart(before, wordSet),
    vTile,
    ...segPart(after, wordSet),
  ].filter(t => t.length > 0)
}

const MAX_TILES = 6   // hard cap — aim for short, clean puzzles
const MIN_TILES = 4   // expand if result is too short to be meaningful

/*
 * Clause openers that signal a DEPENDENT clause — these need surrounding
 * context to form a complete, meaningful sentence.
 */
const FRAG_STARTERS = [
  '所以','因此','但是','虽然','如果','随着','由于','尽管','即使','哪怕',
  '只有','除非','而且','不仅','不但','况且','于是','从而','然后','然而',
  '不过','为此','在此',
]
function isFragment(clauseText) {
  return FRAG_STARTERS.some(s => clauseText.startsWith(s))
}

/*
 * Merge consecutive 1-char tiles (that are not the vocab word or comma)
 * into 2-char pairs, so tiles mostly read as natural 2-char words.
 * Runs iteratively until stable.
 */
function postMerge(tiles, vocabWord) {
  let t = [...tiles]
  let changed = true
  while (changed) {
    changed = false
    const next = []
    let i = 0
    while (i < t.length) {
      const curr = t[i]
      const skip = curr === '，' || curr === vocabWord || curr.startsWith(vocabWord)
      if (!skip && curr.length === 1 && i + 1 < t.length) {
        const nx = t[i + 1]
        const nxSkip = nx === '，' || nx === vocabWord || nx.startsWith(vocabWord)
        if (!nxSkip && nx.length === 1) {
          next.push(curr + nx)
          i += 2
          changed = true
          continue
        }
      }
      next.push(curr)
      i++
    }
    t = next
  }
  return t
}

/* ── Build tile list for a question ───────────────────────── */
function buildTiles(sentence, vocabWord, wordSet) {
  const clean = sentence.replace(/[。！？…]+$/, '').trim()

  // Tokenise: split on commas, keeping '，' as a separate token
  const tokens = []
  clean.split('，').forEach((part, idx, arr) => {
    if (part) tokens.push({ type: 'text', val: part })
    if (idx < arr.length - 1) tokens.push({ type: 'comma', val: '，' })
  })

  // Find which comma-clause contains the vocab word
  const vTokIdx = tokens.findIndex(t => t.type === 'text' && t.val.includes(vocabWord))

  // Fallback: vocab not found — segment full sentence, merge, trim
  if (vTokIdx < 0) {
    const all = []
    tokens.forEach(tok => tok.type === 'comma' ? all.push('，') : all.push(...segClause(tok.val, vocabWord, wordSet)))
    return postMerge(stripEdgeCommas(hardTrim(all, vocabWord, MAX_TILES)), vocabWord)
  }

  // Helper: build tiles for token range [s, e]
  const buildRange = (s, e) => {
    const t = []
    for (let i = s; i <= e; i++) {
      const tok = tokens[i]
      if (tok.type === 'comma') t.push('，')
      else t.push(...segClause(tok.val, vocabWord, wordSet))
    }
    return t
  }

  // Start with just the vocab's own clause
  let startIdx = vTokIdx
  let endIdx   = vTokIdx

  // If that clause is a fragment opener, pull in the preceding clause for context
  if (isFragment(tokens[vTokIdx].val) && vTokIdx >= 2) {
    startIdx = vTokIdx - 2
  }

  let tiles = postMerge(buildRange(startIdx, endIdx), vocabWord)

  // ── Expand outward if still too short (< MIN_TILES) ──────────
  while (tiles.length < MIN_TILES) {
    let expanded = false
    if (startIdx >= 2) {
      startIdx -= 2
      tiles = postMerge(buildRange(startIdx, endIdx), vocabWord)
      expanded = true
    }
    if (tiles.length < MIN_TILES && endIdx + 2 < tokens.length) {
      endIdx += 2
      tiles = postMerge(buildRange(startIdx, endIdx), vocabWord)
      expanded = true
    }
    if (!expanded) break
  }

  // ── Hard-trim as last resort if still over cap ────────────────
  if (tiles.length > MAX_TILES) tiles = hardTrim(tiles, vocabWord, MAX_TILES)

  return stripEdgeCommas(tiles)
}

/* Remove stray leading / trailing commas */
function stripEdgeCommas(tiles) {
  let t = [...tiles]
  while (t.length > 0 && t[0] === '，')          t = t.slice(1)
  while (t.length > 0 && t[t.length - 1] === '，') t = t.slice(0, -1)
  return t
}

/*
 * Last-resort trim: slice to max tiles centred on the vocab tile,
 * never merging words. Only called when even the best sub-sentence
 * exceeds MAX_TILES.
 */
function hardTrim(tiles, vocabWord, max) {
  const vIdx = tiles.findIndex(t => t === vocabWord || t.startsWith(vocabWord))
  if (vIdx < 0) return tiles.slice(0, max)
  let start = Math.max(0, vIdx - Math.floor((max - 1) / 2))
  let end   = start + max
  if (end > tiles.length) { end = tiles.length; start = Math.max(0, end - max) }
  return tiles.slice(start, end)
}

/* ── Question builder ──────────────────────────────────────── */
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildQuestions(vocabs) {
  const wordSet = buildWordSet(vocabs)
  const pool    = vocabs.filter(v => v.example && v.example.length > v.hanzi.length + 3)
  // Always shuffle so order is different every game
  const picked  = shuffle(pool).slice(0, 10)

  return picked.map(v => {
    const tiles  = buildTiles(v.example, v.hanzi, wordSet)
    let shuffled = shuffle(tiles)
    for (let t = 0; t < 8 && shuffled.join('') === tiles.join(''); t++) shuffled = shuffle(tiles)
    return { vocab: v, tiles, shuffled }
  })
}

/* ═══════════════════════════════════════════════════════════
   GAME CONSTANTS
   ═══════════════════════════════════════════════════════════ */
const MAX_LIVES = 3
const HINT_COST = 3

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function SentenceBuilderGame({ vocabs, unitNum }) {
  const [phase,       setPhase]       = useState('ready')
  const [questions,   setQuestions]   = useState([])
  const [qIdx,        setQIdx]        = useState(0)
  const [placed,      setPlaced]      = useState([])
  const [lives,       setLives]       = useState(MAX_LIVES)
  const [score,       setScore]       = useState(0)
  const [combo,       setCombo]       = useState(0)
  const [maxCombo,    setMaxCombo]    = useState(0)
  const [correct,     setCorrect]     = useState(0)
  const [coinsEarned, setCoinsEarned] = useState(0)
  const [feedback,    setFeedback]    = useState(null)
  const [showAns,     setShowAns]     = useState(false)
  const [hintUsed,    setHintUsed]    = useState(false)
  const [trail,       setTrail]       = useState([])
  const [history,     setHistory]     = useState([])

  const lockedRef  = useRef(false)
  const livesRef   = useRef(MAX_LIVES)
  const burstIdRef = useRef(0)
  const [burstParts, setBurstParts] = useState([])

  const currentQ = questions[qIdx]

  /* ── Start ─────────────────────────────────────────────── */
  const startGame = useCallback(() => {
    const qs = buildQuestions(vocabs)
    if (!qs.length) return
    setQuestions(qs);  setQIdx(0);  setPlaced([])
    setLives(MAX_LIVES); livesRef.current = MAX_LIVES
    setScore(0); setCombo(0); setMaxCombo(0)
    setCorrect(0); setCoinsEarned(0)
    setFeedback(null); setShowAns(false); setHintUsed(false)
    setTrail([]); setHistory([])
    lockedRef.current = false
    setPhase('playing')
  }, [vocabs])

  /* ── Wrong ─────────────────────────────────────────────── */
  const doWrong = useCallback(() => {
    if (lockedRef.current) return
    lockedRef.current = true
    setFeedback('bad'); setShowAns(true); setCombo(0)
    setTrail(t => [...t, 'bad'])
    setHistory(h => currentQ ? [...h, { vocab: currentQ.vocab, correct: false }] : h)
    livesRef.current -= 1
    setLives(livesRef.current)
    // Wait for user to tap "下一题" — no auto-advance
  }, [currentQ])

  /* ── Correct ───────────────────────────────────────────── */
  const doCorrect = useCallback(() => {
    if (lockedRef.current) return
    lockedRef.current = true
    const nc    = combo + 1
    const pts   = 100 + (nc >= 5 ? 30 : nc >= 3 ? 15 : 0)
    const coin  = hintUsed ? 2 : 4
    const bCoin = nc >= 3 ? 2 : 0
    setFeedback('ok'); setShowAns(true)
    // Particle burst
    const BURST_CHARS = ['✦','✧','⭐','💫','✨','★','🌟','◆']
    const BURST_COLORS = ['#00d4ff','#06d6a0','#ffd60a','#9b5de5','#f72585']
    const parts = Array.from({ length: 12 }, (_, i) => ({
      id: ++burstIdRef.current,
      char:  BURST_CHARS[i % BURST_CHARS.length],
      px:    `${(Math.random() * 140 - 70).toFixed(0)}px`,
      py:    `${-(Math.random() * 90 + 20).toFixed(0)}px`,
      delay: `${(i * 0.045).toFixed(3)}s`,
      color: BURST_COLORS[i % BURST_COLORS.length],
      size:  0.9 + Math.random() * 0.8,
    }))
    setBurstParts(parts)
    setTimeout(() => setBurstParts([]), 900)
    setScore(s => s + pts)
    setCombo(nc); setMaxCombo(m => Math.max(m, nc)); setCorrect(c => c + 1)
    setCoinsEarned(c => c + coin + bCoin)
    addCoins(coin + bCoin, `造句游戏: 单元${unitNum}`)
    addXP(15, '造句')
    setTrail(t => [...t, 'ok'])
    setHistory(h => currentQ ? [...h, { vocab: currentQ.vocab, correct: true }] : h)
    // Wait for user to tap "下一题" — no auto-advance
  }, [combo, hintUsed, currentQ, unitNum])

  const advance = () => {
    // If no lives left, go to results
    if (livesRef.current <= 0) { setPhase('result'); return }
    setQIdx(i => {
      const nx = i + 1
      if (nx >= questions.length) { setPhase('result'); return i }
      setPlaced([])
      setFeedback(null); setShowAns(false); setHintUsed(false)
      lockedRef.current = false
      return nx
    })
  }

  /* ── Tap tile ──────────────────────────────────────────── */
  const tapTile = useCallback((idx) => {
    if (feedback !== null || lockedRef.current || !currentQ) return
    setPlaced(p => {
      if (p.includes(idx)) return p
      const nx = [...p, idx]
      if (nx.length === currentQ.shuffled.length) {
        const built = nx.map(i => currentQ.shuffled[i]).join('')
        setTimeout(() => built === currentQ.tiles.join('') ? doCorrect() : doWrong(), 80)
      }
      return nx
    })
  }, [feedback, currentQ, doCorrect, doWrong])

  const removePlaced = (pos) => {
    if (feedback !== null) return
    setPlaced(p => p.filter((_, i) => i !== pos))
  }

  /* ── Hint ──────────────────────────────────────────────── */
  const useHint = () => {
    if (!currentQ || feedback !== null || hintUsed) return
    const np = placed.length
    if (np >= currentQ.tiles.length) return
    const need = currentQ.tiles[np]
    const si   = currentQ.shuffled.findIndex((t, i) => t === need && !placed.includes(i))
    if (si >= 0) { addCoins(-HINT_COST, '造句提示'); setHintUsed(true); tapTile(si) }
  }

  /* ════════════════════════════════════════════════════════
     READY SCREEN
  ════════════════════════════════════════════════════════ */
  if (phase === 'ready') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-5 gap-5 overflow-y-auto"
           style={{ background:'rgba(7,13,26,0.97)' }}>
        <div className="text-center animate-floatY">
          <div className="text-6xl mb-2">🖊️</div>
          <h2 className="text-3xl font-black"
              style={{ color:'#ffd60a', textShadow:'0 0 24px rgba(255,214,10,0.7)' }}>
            造句拼图
          </h2>
          <p className="text-sm font-mono mt-1" style={{ color:'rgba(0,212,255,0.45)' }}>
            拼词造句挑战
          </p>
        </div>

        <div className="glass-card w-full max-w-sm p-5 flex flex-col gap-3">
          <p className="text-center font-black text-sm tracking-wider" style={{ color:'#00d4ff' }}>
            ◈ 游戏说明 ◈
          </p>
          {[
            { icon:'🔤', text:'看到词语和释义，将打乱的词块按正确顺序排列成句' },
            { icon:'⚡', text:'连续答对有🔥加成奖励' },
            { icon:'❤️', text:'共有 3 条命，答错扣 1 条命' },
            { icon:'💡', text:`提示可自动放置下一个词块，但花费 ${HINT_COST}🪙` },
          ].map(({ icon, text }, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xl shrink-0 w-7">{icon}</span>
              <p className="text-sm leading-relaxed" style={{ color:'rgba(200,230,255,0.7)' }}>{text}</p>
            </div>
          ))}
        </div>

        <p className="text-xs font-mono" style={{ color:'rgba(0,212,255,0.35)' }}>
          共 {Math.min(10, vocabs.filter(v => v.example).length)} 道题
        </p>

        <button onClick={startGame} className="neon-cta w-full max-w-sm text-xl py-4">
          开始挑战 🚀
        </button>
      </div>
    )
  }

  /* ════════════════════════════════════════════════════════
     RESULT SCREEN
  ════════════════════════════════════════════════════════ */
  if (phase === 'result') {
    const total = questions.length
    const pct   = total > 0 ? correct / total : 0
    const stars = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : pct >= 0.3 ? 1 : 0
    const msgs  = ['继续加油！','做得好！','非常棒！','完美！太厉害了！']
    return (
      <div className="flex-1 flex flex-col items-center justify-start p-5 gap-4 overflow-y-auto"
           style={{ background:'rgba(7,13,26,0.97)' }}>
        <div className="text-center pt-2">
          <div className="flex justify-center gap-3 text-5xl mb-3">
            {[0,1,2].map(i => (
              <span key={i} style={{
                opacity: i < stars ? 1 : 0.12,
                filter:  i < stars ? 'drop-shadow(0 0 12px rgba(255,214,10,0.8))' : 'none',
                animation: i < stars ? `floatY ${1.5+i*0.3}s ease-in-out infinite` : 'none',
                animationDelay: `${i*0.2}s`,
              }}>⭐</span>
            ))}
          </div>
          <h2 className="text-2xl font-black"
              style={{ color: stars>=3?'#ffd60a':stars>=2?'#06d6a0':'#9b5de5',
                       textShadow:'0 0 20px currentColor' }}>
            {msgs[stars]}
          </h2>
        </div>

        <div className="glass-card w-full max-w-sm p-4 grid grid-cols-2 gap-3">
          {[
            { icon:'🏆', label:'最终得分', val:score.toLocaleString(), color:'#ffd60a' },
            { icon:'✅', label:'正确题数', val:`${correct}/${total}`,  color:'#06d6a0' },
            { icon:'🔥', label:'最高连击', val:`×${maxCombo}`,         color:'#f72585' },
            { icon:'🪙', label:'获得金币', val:`+${coinsEarned}`,       color:'#00d4ff' },
          ].map((s,i) => (
            <div key={i} className="text-center py-1">
              <div className="text-xl">{s.icon}</div>
              <p className="text-xs font-mono mt-0.5" style={{ color:'rgba(140,200,240,0.45)' }}>{s.label}</p>
              <p className="text-xl font-black"
                 style={{ color:s.color, textShadow:`0 0 10px ${s.color}60` }}>{s.val}</p>
            </div>
          ))}
        </div>

        <div className="w-full max-w-sm">
          <p className="text-xs font-mono mb-2 text-center" style={{ color:'rgba(0,212,255,0.35)' }}>
            答题记录
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {history.map((h,i) => (
              <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm font-black"
                   style={{
                     background: h.correct ? 'rgba(6,214,160,0.1)':'rgba(247,37,133,0.1)',
                     border:`1px solid ${h.correct ? 'rgba(6,214,160,0.4)':'rgba(247,37,133,0.4)'}`,
                     color: h.correct ? '#06d6a0':'#f72585',
                   }}>
                <span>{h.correct ? '✓':'✗'}</span>
                <span>{h.vocab.hanzi}</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={startGame} className="neon-cta w-full max-w-sm mt-2">
          再玩一次 🔄
        </button>
      </div>
    )
  }

  /* ════════════════════════════════════════════════════════
     PLAYING SCREEN
  ════════════════════════════════════════════════════════ */
  if (!currentQ) return null

  const ansColor   = feedback==='ok'  ? '#06d6a0'
                   : feedback==='bad' ? '#f72585'
                   : 'rgba(0,212,255,0.2)'
  const ansBg      = feedback==='ok'  ? 'rgba(6,214,160,0.08)'
                   : feedback==='bad' ? 'rgba(247,37,133,0.08)'
                   : 'rgba(0,212,255,0.03)'

  // For display: the vocab tile might include a particle (e.g. "科技的")
  // so check if shuffled tile STARTS WITH the vocab hanzi
  const isVocabTile = (t) => t === currentQ.vocab.hanzi || t.startsWith(currentQ.vocab.hanzi)

  return (
    <div className="flex-1 flex flex-col overflow-hidden"
         style={{ background:'rgba(7,13,26,0.97)' }}>

      {/* ── HUD ────────────────────────────────────────────── */}
      <div className="px-3 pt-2 pb-1.5 shrink-0"
           style={{ borderBottom:'1px solid rgba(0,212,255,0.1)' }}>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 shrink-0">
            {[0,1,2].map(i => (
              <span key={i} className="text-base" style={{ opacity:i<lives?1:0.15 }}>❤️</span>
            ))}
          </div>
          <div className="flex-1" />
          <span className="text-xs font-mono" style={{ color:'rgba(0,212,255,0.45)' }}>
            {qIdx+1}/{questions.length}
          </span>
          <span style={{ color:'rgba(0,212,255,0.2)' }}>│</span>
          <span className="text-sm font-black tabular-nums"
                style={{ color:'#ffd60a', textShadow:'0 0 8px rgba(255,214,10,0.5)' }}>
            {score.toLocaleString()}
          </span>
        </div>
        <div className="flex gap-1 mt-1.5 justify-center">
          {questions.map((_,i) => (
            <div key={i} className="w-2 h-2 rounded-full transition-all"
                 style={{
                   background: i<trail.length
                     ? (trail[i]==='ok'?'#06d6a0':'#f72585')
                     : i===qIdx ? '#00d4ff' : 'rgba(255,255,255,0.1)',
                   boxShadow: i===qIdx ? '0 0 6px #00d4ff':'none',
                 }} />
          ))}
        </div>
      </div>

      {/* ── Combo ──────────────────────────────────────────── */}
      {combo >= 3 && feedback !== 'bad' && (
        <div className="text-center py-1 text-sm font-black animate-pulse2 shrink-0"
             style={{ background:'rgba(247,37,133,0.08)', color:'#f72585',
                      textShadow:'0 0 10px rgba(247,37,133,0.7)',
                      borderBottom:'1px solid rgba(247,37,133,0.15)' }}>
          🔥 COMBO ×{combo}&nbsp;{combo>=5?'+30分!':'+15分!'}
        </div>
      )}

      {/* ── Vocab card ─────────────────────────────────────── */}
      <div className="px-4 py-3 shrink-0">
        <div className="flex items-center gap-3 glass-card px-4 py-3">
          <button onClick={() => speak(currentQ.vocab.hanzi)}
                  className="text-4xl font-black shrink-0 hover:scale-110 transition-transform active:scale-95"
                  style={{ color:'#ffd60a', textShadow:'0 0 20px rgba(255,214,10,0.7)' }}>
            {currentQ.vocab.hanzi}
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold"
                 style={{ color:'#00d4ff', textShadow:'0 0 8px rgba(0,212,255,0.5)' }}>
              {currentQ.vocab.pinyin}
            </div>
            <div className="text-sm leading-snug mt-0.5" style={{ color:'rgba(200,230,255,0.75)' }}>
              {currentQ.vocab.definition}
            </div>
          </div>
          <span className="text-lg shrink-0 opacity-40">🔊</span>
        </div>
      </div>

      {/* ── Answer area ────────────────────────────────────── */}
      <div className="px-4 shrink-0 relative">
        {/* Correct-answer particle burst */}
        {burstParts.map(p => (
          <span key={p.id}
                className="absolute pointer-events-none select-none"
                style={{
                  '--px': p.px, '--py': p.py,
                  bottom: '50%', left: '50%',
                  fontSize: `${p.size}rem`,
                  color: p.color,
                  animation: 'particleFly 0.75s ease-out forwards',
                  animationDelay: p.delay,
                  zIndex: 50,
                }}>
            {p.char}
          </span>
        ))}

        {/* Section label */}
        <p className="text-xs font-mono mb-1.5" style={{ color:'rgba(0,212,255,0.3)' }}>
          {feedback === 'bad' ? '❌ 你的答案：' : feedback === 'ok' ? '✅ 你的答案：' : '造句区 · 点击已放词块可取回'}
        </p>

        {/* Student's placed tiles — always visible */}
        <div className="min-h-[54px] rounded-xl p-2 flex flex-wrap gap-2 items-center transition-all"
             style={{ background:ansBg, border:`1px solid ${ansColor}`,
                      boxShadow:feedback ? `0 0 20px ${ansColor}40`:'none' }}>
          {placed.length === 0 && !feedback && (
            <p className="w-full text-center text-sm font-mono"
               style={{ color:'rgba(0,212,255,0.2)' }}>
              从下方点击词块开始拼句…
            </p>
          )}
          {placed.map((ti, pos) => {
            const t = currentQ.shuffled[ti]
            return (
              <button key={pos} onClick={() => !feedback && removePlaced(pos)}
                      className="rounded-xl font-black transition-all active:scale-90 select-none"
                      style={{
                        padding: t==='，'?'6px 10px':'8px 14px',
                        fontSize: t==='，'?'1rem':'1.05rem',
                        background: feedback==='ok'
                          ? (t==='，'?'rgba(155,93,229,0.15)':'rgba(6,214,160,0.15)')
                          : feedback==='bad'
                          ? (t==='，'?'rgba(155,93,229,0.12)':'rgba(247,37,133,0.12)')
                          : (t==='，'?'rgba(155,93,229,0.12)':'rgba(0,212,255,0.12)'),
                        border: `1px solid ${feedback==='ok'
                          ? (t==='，'?'rgba(155,93,229,0.6)':'rgba(6,214,160,0.6)')
                          : feedback==='bad'
                          ? (t==='，'?'rgba(155,93,229,0.5)':'rgba(247,37,133,0.5)')
                          : (t==='，'?'rgba(155,93,229,0.5)':'rgba(0,212,255,0.5)')}`,
                        color: feedback==='ok'
                          ? (t==='，'?'#9b5de5':'#06d6a0')
                          : feedback==='bad'
                          ? (t==='，'?'#9b5de5':'#f72585')
                          : (t==='，'?'#9b5de5':'#00d4ff'),
                        cursor: feedback ? 'default' : 'pointer',
                      }}>
                {t}
              </button>
            )
          })}
        </div>


        {feedback && (
          <div className="mt-2 flex items-center justify-between gap-3 animate-pop">
            <span className="text-sm font-black"
                  style={{
                    color: feedback==='ok'?'#06d6a0':'#f72585',
                    textShadow:`0 0 12px ${feedback==='ok'?'rgba(6,214,160,0.8)':'rgba(247,37,133,0.8)'}`,
                  }}>
              {feedback==='ok' ? `✅ 正确！+${hintUsed?2:4}🪙` : '❌ 答错了，看看正确答案'}
            </span>
            <button
              onClick={advance}
              className="shrink-0 px-4 py-1.5 rounded-xl font-black text-sm transition-all active:scale-95"
              style={{
                background: feedback==='ok' ? 'rgba(6,214,160,0.15)' : 'rgba(0,212,255,0.12)',
                border: `1.5px solid ${feedback==='ok' ? '#06d6a0' : '#00d4ff'}`,
                color:  feedback==='ok' ? '#06d6a0' : '#00d4ff',
                boxShadow: `0 0 10px ${feedback==='ok' ? 'rgba(6,214,160,0.3)' : 'rgba(0,212,255,0.3)'}`,
              }}>
              {livesRef.current <= 0 || qIdx + 1 >= questions.length ? '查看结果 →' : '下一题 →'}
            </button>
          </div>
        )}

        {/* ── Correct answer — fills blank space after feedback ── */}
        {feedback === 'bad' && showAns && (
          <div className="mt-3 animate-fadeIn">
            <p className="text-xs font-mono mb-1.5" style={{ color:'rgba(6,214,160,0.7)' }}>
              ✅ 正确答案：
            </p>
            <div className="min-h-[54px] rounded-xl p-2 flex flex-wrap gap-2 items-center"
                 style={{ background:'rgba(6,214,160,0.07)', border:'1px solid rgba(6,214,160,0.4)',
                          boxShadow:'0 0 16px rgba(6,214,160,0.15)' }}>
              {currentQ.tiles.map((t, i) => (
                <span key={i} className="px-3 py-1.5 rounded-lg font-black"
                      style={{
                        fontSize: t==='，'?'1rem':'1.05rem',
                        background: t==='，'?'rgba(155,93,229,0.15)':'rgba(6,214,160,0.15)',
                        border: `1px solid ${t==='，'?'rgba(155,93,229,0.6)':'rgba(6,214,160,0.6)'}`,
                        color: t==='，'?'#9b5de5':'#06d6a0',
                      }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Available tiles ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-2">
        <p className="text-xs font-mono mb-2" style={{ color:'rgba(0,212,255,0.3)' }}>
          词块区 · 点击放入造句区
        </p>
        <div className="flex flex-wrap gap-2.5">
          {currentQ.shuffled.map((t,i) => {
            const used    = placed.includes(i)
            const isVocab = isVocabTile(t)
            const isCom   = t === '，'
            return (
              <button key={i}
                      onClick={() => tapTile(i)}
                      disabled={used || feedback !== null}
                      className="rounded-xl font-black transition-all active:scale-90 select-none"
                      style={{
                        padding: isCom ? '8px 10px':'10px 16px',
                        fontSize: isVocab?'1.2rem':isCom?'1.1rem':'1.05rem',
                        background: used ? 'rgba(0,212,255,0.02)'
                          : isCom   ? 'rgba(155,93,229,0.12)'
                          : isVocab ? 'rgba(255,214,10,0.12)'
                          : 'rgba(12,24,56,0.95)',
                        border: used ? '2px solid rgba(0,212,255,0.06)'
                          : isCom   ? '2px solid rgba(155,93,229,0.5)'
                          : isVocab ? '2px solid rgba(255,214,10,0.5)'
                          : '2px solid rgba(0,212,255,0.3)',
                        color: used ? 'rgba(255,255,255,0.1)'
                          : isCom   ? '#9b5de5'
                          : isVocab ? '#ffd60a'
                          : '#e8f4ff',
                        textShadow: used?'none':isVocab?'0 0 10px rgba(255,214,10,0.6)':isCom?'0 0 8px rgba(155,93,229,0.5)':'none',
                        boxShadow: used?'none':isVocab?'0 0 12px rgba(255,214,10,0.2)':'0 4px 12px rgba(0,0,0,0.4)',
                        transform: used?'scale(0.92)':'scale(1)',
                        cursor: used?'not-allowed':'pointer',
                        textDecoration: used?'line-through':'none',
                        opacity: used?0.3:1,
                      }}>
                {t}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Bottom bar ─────────────────────────────────────── */}
      <div className="px-4 pb-3 pt-1 flex gap-2 shrink-0"
           style={{ borderTop:'1px solid rgba(0,212,255,0.08)' }}>
        <button onClick={useHint} disabled={hintUsed || feedback !== null}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-black transition-all active:scale-95"
                style={{
                  background: hintUsed?'rgba(155,93,229,0.04)':'rgba(155,93,229,0.1)',
                  border:`1px solid ${hintUsed?'rgba(155,93,229,0.15)':'rgba(155,93,229,0.45)'}`,
                  color: hintUsed?'rgba(155,93,229,0.3)':'#9b5de5',
                  cursor: hintUsed?'not-allowed':'pointer',
                }}>
          💡 提示
          <span style={{ color:'rgba(255,214,10,0.6)', fontSize:'0.75rem' }}>(-{HINT_COST}🪙)</span>
        </button>

        {placed.length > 0 && feedback === null && (
          <button onClick={() => setPlaced([])}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-black transition-all active:scale-95"
                  style={{ background:'rgba(247,37,133,0.08)', border:'1px solid rgba(247,37,133,0.35)', color:'#f72585' }}>
            🗑️ 清空
          </button>
        )}

        {placed.length > 0 && placed.length < currentQ.shuffled.length && feedback === null && (
          <button
            onClick={() => {
              const built = placed.map(i => currentQ.shuffled[i]).join('')
              built === currentQ.tiles.join('') ? doCorrect() : doWrong()
            }}
            className="flex-1 py-2 rounded-xl text-sm font-black transition-all active:scale-95"
            style={{ background:'rgba(0,212,255,0.1)', border:'1px solid rgba(0,212,255,0.4)',
                     color:'#00d4ff', textShadow:'0 0 8px rgba(0,212,255,0.5)' }}>
            ✅ 强制提交
          </button>
        )}
      </div>
    </div>
  )
}
