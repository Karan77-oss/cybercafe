/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#0B0F19',
          900: '#0F172A',
          850: '#131D33',
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
        },
        indigo: {
          DEFAULT: '#4F46E5',
          600: '#4F46E5',
          500: '#6366F1',
          400: '#818CF8',
        },
        cyan: {
          DEFAULT: '#06B6D4',
          500: '#06B6D4',
          400: '#22D3EE',
          300: '#67E8F9',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
