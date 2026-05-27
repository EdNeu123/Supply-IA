/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)', surface: 'var(--surface)', 'surface-2': 'var(--surface-2)',
        border: 'var(--border)', 'border-2': 'var(--border-2)',
        text: { 1: 'var(--text-1)', 2: 'var(--text-2)', 3: 'var(--text-3)' },
        accent: { DEFAULT: 'var(--accent)', bg: 'var(--accent-bg)' },
        success: { DEFAULT: 'var(--green)', bg: 'var(--green-bg)' },
        danger: { DEFAULT: 'var(--red)', bg: 'var(--red-bg)' },
        warning: { DEFAULT: 'var(--yellow)', bg: 'var(--yellow-bg)' },
      },
      borderRadius: { DEFAULT: '12px' },
      fontFamily: { sans: ['Inter', 'sans-serif'] },
    },
  },
  plugins: [],
}
