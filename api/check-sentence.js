// AI marks a sentence the student wrote using a given vocab word.
// POST { hanzi, pinyin, definition, example, studentSentence }
// Returns { verdict: 'correct'|'partial'|'wrong', feedback: string, suggestion: string }

import Anthropic from '@anthropic-ai/sdk'

/* The reference example is visible to students in 词汇 mode and is shown after
 * every answer, so pasting it back is the obvious way to farm XP. Catch it
 * deterministically rather than hoping the model notices. */
function normalize(s) {
  return (s || '').replace(/[\s，。！？、；：""''（）《》…—,.!?;:()"']/g, '')
}

function isCopiedExample(sentence, example) {
  const a = normalize(sentence)
  const b = normalize(example)
  if (!a || !b || b.length < 8) return false
  if (a === b) return true
  // Near-verbatim: one wholly contains the other and they're about the same length.
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  return long.includes(short) && short.length / long.length >= 0.8
}

/* ── Offline fallback ──────────────────────────────────────────────────────
   Can't judge meaning without the model, so only check the structural
   basics: did they use the word, and is it a real sentence?
   ─────────────────────────────────────────────────────────────────────── */
function localGrade(hanzi, sentence) {
  const s = sentence.trim()
  const cjk = (s.match(/[一-鿿]/g) || []).length

  if (!s.includes(hanzi)) {
    return {
      verdict: 'wrong',
      feedback: `句子里没有用到「${hanzi}」。（离线批改）`,
      suggestion: `请把「${hanzi}」放进句子里，再写一次。`,
    }
  }
  if (cjk < hanzi.length + 4) {
    return {
      verdict: 'partial',
      feedback: '句子太短了，试着写得更完整。（离线批改）',
      suggestion: '加上时间、地点或原因，让句子更具体。',
    }
  }
  return {
    verdict: 'partial',
    feedback: '已收到你的句子，老师暂时无法详细批改。（离线批改）',
    suggestion: '请对照下面的参考例句检查用法。',
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' })

  const { hanzi, pinyin, definition, example, studentSentence } = req.body || {}
  const sentence = (studentSentence || '').trim().slice(0, 300)
  if (!hanzi || !sentence) return res.status(400).json({ error: 'bad_input' })

  if (isCopiedExample(sentence, example)) {
    return res.status(200).json({
      verdict: 'partial',
      feedback: `这是课本的参考例句，不是你自己写的句子哦。老师想看看你怎么用「${hanzi}」。`,
      suggestion: `试着换个场景，写一句关于你自己、家人或学校的句子。`,
    })
  }

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
  if (!apiKey) {
    return res.status(200).json(localGrade(hanzi, sentence))
  }

  try {
    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `你是一位亲切的新加坡中一华文老师，正在批改学生用指定词语写的句子。请严格按照JSON格式回答。

要用的词语：${hanzi}（${pinyin}）
词语意思：${definition}
参考例句：${example || '（无）'}

学生写的句子：${sentence}

评分标准：
- correct（正确）：正确使用了「${hanzi}」，句子通顺、有完整意思，用法符合词义
- partial（部分正确）：用了「${hanzi}」，但有语法小错、搭配不自然、句子太简单，或语境略有偏差
- wrong（错误）：没有用「${hanzi}」，或者用法明显错误、句子不通、意思不合逻辑

反馈要求：
- feedback：先肯定做得好的地方，再指出问题，语气鼓励，不超过40字
- suggestion：给出一句改进后的完整句子（如果学生写得很好，就给一个更进阶的用法示范），不超过40字

只返回JSON，不要其他内容：
{"verdict":"correct","feedback":"简短中文反馈","suggestion":"改进后的句子"}`,
        },
      ],
    })

    const text = message.content[0]?.text || ''

    // Field-by-field regex — robust against newlines or stray markdown.
    const verdictMatch    = text.match(/"verdict"\s*:\s*"(correct|partial|wrong)"/)
    const feedbackMatch   = text.match(/"feedback"\s*:\s*"([\s\S]*?)"(?:\s*[,}])/)
    const suggestionMatch = text.match(/"suggestion"\s*:\s*"([\s\S]*?)"(?:\s*[,}])/)

    if (!verdictMatch) throw new Error(`no verdict in response: ${text.slice(0, 120)}`)

    const clean = (m) => (m?.[1] ?? '').replace(/\\n/g, ' ').replace(/\\"/g, '"').trim().slice(0, 120)

    return res.status(200).json({
      verdict:    verdictMatch[1],
      feedback:   clean(feedbackMatch),
      suggestion: clean(suggestionMatch),
    })

  } catch (err) {
    console.error('[check-sentence] Claude error:', err.message)
    return res.status(200).json(localGrade(hanzi, sentence))
  }
}
