/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sports Broadcast palette
        broadcast: {
          dark: '#0a0a0f',
          900: '#12121a',
          800: '#1a1a24',
          700: '#24242e',
          600: '#2e2e3a',
        },
        // ESPN-style primary colors
        espn: {
          red: '#cc0000',
          darkRed: '#990000',
          yellow: '#ffcc00',
          orange: '#ff6600',
        },
        // Accent colors
        live: '#ff0000',
        score: {
          green: '#00cc66',
          red: '#ff3333',
          blue: '#0066ff',
          yellow: '#ffcc00',
        },
        // Metallic accents
        metal: {
          silver: '#c0c0c0',
          chrome: '#e8e8e8',
          steel: '#71797E',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Impact', 'sans-serif'],
        sans: ['"Oswald"', 'system-ui', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'monospace'],
        score: ['"Orbitron"', 'monospace'],
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-in-left': 'slide-in-left 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-in-up': 'slide-in-up 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-in-down': 'slide-in-down 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'flash': 'flash 0.5s ease-out',
        'pulse-live': 'pulse-live 1.5s ease-in-out infinite',
        'ticker': 'ticker 20s linear infinite',
        'swoosh': 'swoosh 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'score-pop': 'score-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'shine': 'shine 2s linear infinite',
        'breaking': 'breaking 1s ease-in-out infinite',
        'countdown': 'countdown 1s ease-out',
      },
      keyframes: {
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-down': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'flash': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        'pulse-live': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'ticker': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        'swoosh': {
          '0%': { transform: 'scaleX(0)', transformOrigin: 'left' },
          '50%': { transform: 'scaleX(1)', transformOrigin: 'left' },
          '50.1%': { transformOrigin: 'right' },
          '100%': { transform: 'scaleX(0)', transformOrigin: 'right' },
        },
        'score-pop': {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '70%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'shine': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'breaking': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.02)' },
        },
        'countdown': {
          '0%': { transform: 'scale(1.5)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'diagonal-stripes': 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px)',
        'metal-gradient': 'linear-gradient(180deg, #e8e8e8 0%, #c0c0c0 50%, #a0a0a0 100%)',
        'red-gradient': 'linear-gradient(180deg, #ff0000 0%, #cc0000 50%, #990000 100%)',
        'score-gradient': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
      },
      boxShadow: {
        'broadcast': '0 4px 20px rgba(0, 0, 0, 0.5)',
        'glow-red': '0 0 20px rgba(204, 0, 0, 0.5)',
        'glow-blue': '0 0 20px rgba(0, 102, 255, 0.5)',
        'glow-green': '0 0 20px rgba(0, 204, 102, 0.5)',
        'inner-dark': 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
        'score': '0 2px 10px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      },
    },
  },
  plugins: [],
}
