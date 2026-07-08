/**
 * Speak Chinese text via Google Translate TTS (proxied through /api/tts).
 * Falls back to the browser's built-in SpeechSynthesis if the API fails.
 *
 * Audio blobs are cached in memory (max 150 entries) so repeated clicks
 * on the same word are instant and don't re-hit Google.
 */

const cache   = new Map()   // text → object URL
const MAX_CACHE = 150

let currentAudio = null

function browserFallback(text) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang  = 'zh-CN'
  utter.rate  = 0.85
  window.speechSynthesis.speak(utter)
}

export async function speak(text) {
  if (!text) return

  // Stop anything currently playing
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }
  window.speechSynthesis?.cancel()

  try {
    let objectUrl = cache.get(text)

    if (!objectUrl) {
      const res = await fetch(`/api/tts?text=${encodeURIComponent(text)}`)
      if (!res.ok) throw new Error(`tts ${res.status}`)
      const blob = await res.blob()
      objectUrl  = URL.createObjectURL(blob)

      // Evict oldest entry when cache is full
      if (cache.size >= MAX_CACHE) {
        const oldest = cache.keys().next().value
        URL.revokeObjectURL(cache.get(oldest))
        cache.delete(oldest)
      }
      cache.set(text, objectUrl)
    }

    const audio  = new Audio(objectUrl)
    currentAudio = audio
    audio.play().catch(() => browserFallback(text))

  } catch {
    browserFallback(text)
  }
}
