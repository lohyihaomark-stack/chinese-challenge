/**
 * Speak Chinese text using the Web Speech API (zh-CN).
 * Cancels any ongoing speech before starting.
 */
export function speak(text) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'zh-CN'
  utter.rate = 0.85
  utter.pitch = 1.0
  window.speechSynthesis.speak(utter)
}
