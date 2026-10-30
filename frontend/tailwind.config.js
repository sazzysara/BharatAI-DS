export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui'],
        display: ['"Fraunces"', '"Syne"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ice: {
          50: '#fcfdfe',
          100: '#f4f6fa',
          200: '#e9edf5',
          300: '#d7dfec',
          400: '#b8c5da',
        },
        aubergine: {
          950: '#120719',
          900: '#1c0b26',
          800: '#2b123a',
          700: '#3e1b53',
          600: '#552672',
          100: '#f5eff8',
        },
        marigold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
      },
    },
  },
  plugins: [],
}
