// AI grades a student's Chinese definition against the correct one.
// POST { hanzi, pinyin, definition, studentAnswer }
// Returns { verdict: 'correct'|'partial'|'wrong', feedback: string }

import Anthropic from '@anthropic-ai/sdk'

/* ── Local fallback grader ─────────────────────────────────────────────────
   Used when no API key is configured or the API call fails.
   Character-level + bigram matching — lenient so paraphrasing counts.
   ─────────────────────────────────────────────────────────────────────── */
function localGrade(definition, studentAnswer) {
  const ans = studentAnswer.trim()
  if (ans.length < 1) return { verdict: 'wrong', feedback: '答案太短，请写完整的意思。' }

  const refCJK = (definition.match(/[一-鿿]/g) || []).join('')
  const ansCJK = (ans.match(/[一-鿿]/g) || []).join('')

  if (refCJK.length === 0) return { verdict: 'partial', feedback: '已收到答案。（离线批改）' }
  if (ansCJK.length === 0) return { verdict: 'wrong',   feedback: '请用华文作答。（离线批改）' }

  const uniqueRef  = [...new Set(refCJK)]
  const ansCharSet = new Set(ansCJK)
  const charRatio  = uniqueRef.filter(c => ansCharSet.has(c)).length / uniqueRef.length

  let bigramHits = 0, totalBigrams = 0
  for (let i = 0; i < refCJK.length - 1; i++) {
    totalBigrams++
    if (ansCJK.includes(refCJK.slice(i, i + 2))) bigramHits++
  }
  const bigramRatio = totalBigrams > 0 ? bigramHits / totalBigrams : 0

  if (charRatio >= 0.45 || bigramRatio >= 0.28)
    return { verdict: 'correct', feedback: '意思正确！（离线批改）' }
  if (charRatio >= 0.20 || bigramRatio >= 0.12)
    return { verdict: 'partial', feedback: '部分正确，请参考正确释义。（离线批改）' }
  return { verdict: 'wrong', feedback: '意思有偏差，请参考正确释义。（离线批改）' }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' })

  const { hanzi, pinyin, definition, studentAnswer } = req.body || {}
  const ans = (studentAnswer || '').trim().slice(0, 300)
  if (!hanzi || !ans) return res.status(400).json({ error: 'bad_input' })

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
  if (!apiKey) {
    return res.status(200).json(localGrade(definition || '', ans))
  }

  try {
    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 120,
      messages: [
        {
          role: 'user',
          content: `你是一位华文老师，正在批改学生的词语释义题。请严格按照JSON格式回答。

词语：${hanzi}（${pinyin}）
参考释义：${definition}
学生答案：${ans}

评分标准：
- correct（正确）：意思基本相符，即使措辞不同或不完整也可接受，只要核心意思对
- partial（部分正确）：包含部分正确意思，但有明显遗漏或轻微偏差
- wrong（错误）：意思明显错误、无关，或只写了词语本身

只返回JSON，不要其他内容：{"verdict":"correct","feedback":"简短中文反馈不超过30字"}`,
        },
      ],
    })

    const text = message.content[0]?.text || ''

    // Extract verdict and feedback with individual regex — robust against
    // Claude adding newlines, extra whitespace, or markdown inside the JSON string.
    const verdictMatch  = text.match(/"verdict"\s*:\s*"(correct|partial|wrong)"/)
    const feedbackMatch = text.match(/"feedback"\s*:\s*"([\s\S]*?)"(?:\s*[,}])/)

    if (!verdictMatch) throw new Error(`no verdict in response: ${text.slice(0, 120)}`)

    const verdict  = verdictMatch[1]
    const feedback = (feedbackMatch?.[1] ?? '').replace(/\\n/g, ' ').trim().slice(0, 80)

    return res.status(200).json({ verdict, feedback })

  } catch (err) {
    console.error('[check-meaning] Claude error:', err.message)
    return res.status(200).json(localGrade(definition || '', ans))
  }
}
