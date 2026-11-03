import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/* After a redeploy, a student still on the old page asks for chunk filenames
 * that no longer exist and every lazy-loaded mode breaks. React caches the
 * failed import, so retrying in-place can never recover — only a reload can.
 * Reload once per session so a bad network can't put us in a refresh loop. */
const RELOAD_FLAG = 'vocab_chunk_reloaded'

function recoverFromStaleChunk() {
  if (sessionStorage.getItem(RELOAD_FLAG)) return false
  sessionStorage.setItem(RELOAD_FLAG, '1')
  window.location.reload()
  return true
}

window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault()
  recoverFromStaleChunk()
})

window.addEventListener('error', (e) => {
  if (/dynamically imported module|Importing a module script failed/i.test(e.message || '')) {
    recoverFromStaleChunk()
  }
})

// A clean load means whatever we recovered from is behind us.
window.addEventListener('load', () => {
  setTimeout(() => sessionStorage.removeItem(RELOAD_FLAG), 5000)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
