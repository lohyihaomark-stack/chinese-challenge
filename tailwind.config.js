/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brick:        '#8B2500',
        'brick-mid':  '#C1440E',
        'brick-light':'#E8744A',
        cream:        '#FDF3E0',
        'cream-dark': '#F0D9A8',
        gold:         '#C9962A',
        'nanyang-teal':'#1A6B5A',
        'nanyang-green':'#2C8C6A',
      },
      fontFamily: {
        chinese: ['"Noto Serif SC"', '"Source Han Serif CN"', '"STSong"', '"SimSun"', 'serif'],
      },
      keyframes: {
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%':     { transform: 'translateX(-6px)' },
          '40%':     { transform: 'translateX(6px)' },
          '60%':     { transform: 'translateX(-4px)' },
          '80%':     { transform: 'translateX(4px)' },
        },
        pop: {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(1.12)' },
          '100%': { transform: 'scale(1)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(32px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        charEnter: {
          '0%':   { opacity: '0', transform: 'scale(0.7) translateY(20px)' },
          '60%':  { transform: 'scale(1.08) translateY(-4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        flashGreen: {
          '0%,100%': { boxShadow: '0 0 0px rgba(26,107,90,0)' },
          '50%':     { boxShadow: '0 0 24px 8px rgba(26,107,90,0.55)' },
        },
        flashRed: {
          '0%,100%': { boxShadow: '0 0 0px rgba(139,37,0,0)' },
          '50%':     { boxShadow: '0 0 24px 8px rgba(139,37,0,0.55)' },
        },
        pulse2: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.2' },
        },
      },
      animation: {
        shake:       'shake 0.4s ease',
        pop:         'pop 0.3s ease',
        fadeIn:      'fadeIn 0.4s ease',
        slideUp:     'slideUp 0.35s ease',
        charEnter:   'charEnter 0.45s cubic-bezier(0.34,1.56,0.64,1)',
        flashGreen:  'flashGreen 0.5s ease',
        flashRed:    'flashRed 0.5s ease',
        pulse2:      'pulse2 1s ease infinite',
      },
    },
  },
  plugins: [],
}
