/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        dark: {
          950: '#07090e',
          900: '#0c1017',
          850: '#111722',
          800: '#161e2c',
          700: '#222e42',
          600: '#334460',
          500: '#485f84',
        },
        cf: {
          darker: '#080c14',
          dark: '#0f1624',
          card: '#151e30',
          border: '#212e45',
          accent: '#38bdf8',
          'accent-hover': '#7dd3fc',
          muted: '#8e9fb5',
          emerald: '#34d399',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Roboto Mono', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
