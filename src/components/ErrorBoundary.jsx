import { Component } from 'react'

/**
 * Catches runtime errors in any child component tree.
 * Wrap around game components so a crash doesn't white-screen the whole app.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="glass-card p-8 text-center max-w-sm w-full animate-fadeIn">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-black mb-2" style={{ color: '#f72585', textShadow: '0 0 12px rgba(247,37,133,0.5)' }}>
              出错了
            </h2>
            <p className="text-sm mb-1 font-mono" style={{ color: 'rgba(200,230,255,0.5)' }}>
              这个游戏遇到了问题
            </p>
            <p className="text-xs mb-6 font-mono truncate max-w-full" style={{ color: 'rgba(200,230,255,0.25)' }}>
              {this.state.error?.message || '未知错误'}
            </p>
            <button onClick={this.reset} className="neon-btn px-8 py-2 text-base font-black">
              重　试
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
