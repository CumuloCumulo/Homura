/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep Space 色板 - 紫色霓虹
        neon: {
          violet: '#8b5cf6',
          purple: '#a855f7',
          fuchsia: '#d946ef',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Geist Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-down': 'slide-down 0.25s ease-out',
        'breathe': 'breathe 4s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.15)',
          },
          '50%': {
            boxShadow: '0 0 30px rgba(139, 92, 246, 0.3)',
          },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'breathe': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
      },
      boxShadow: {
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        'neon': '0 0 20px rgba(139, 92, 246, 0.3)',
        'neon-strong': '0 0 30px rgba(139, 92, 246, 0.5)',
      },
    },
  },
  plugins: [],
}
