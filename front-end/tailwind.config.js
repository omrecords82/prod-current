/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'colorflow': 'colorflow 20s cubic-bezier(0.42, 0, 0.58, 1) infinite',
        'flow': 'colorflow 20s cubic-bezier(0.42, 0, 0.58, 1) infinite',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        colorflow: {
          '0%': { backgroundPosition: '0% 50%' },
          '14.3%': { backgroundPosition: '25% 50%' },
          '28.6%': { backgroundPosition: '50% 50%' },
          '42.9%': { backgroundPosition: '75% 50%' },
          '57.2%': { backgroundPosition: '100% 50%' },
          '71.5%': { backgroundPosition: '75% 50%' },
          '85.8%': { backgroundPosition: '50% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      backgroundSize: {
        '400': '400% 400%',
      },
      colors: {
        orthodox: {
          purple: '#6B21A8',
          gold: '#FFD700',
          red: '#DC2626',
          green: '#059669',
          blue: '#2563EB',
          white: '#F9FAFB',
          black: '#1F2937',
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      fontFamily: {
        'om-display': ['"Cormorant Garamond"', 'Georgia', '"Times New Roman"', 'serif'],
        'om-body': ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        'noto-serif-georgian': ['"Noto Serif Georgian"', '"Noto Serif"', '"Times New Roman"', 'serif'],
        'mono': ['ui-monospace', 'SFMono-Regular', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
