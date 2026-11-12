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
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        sky: {
          DEFAULT: '#E8771B',
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#E8771B',
          700: '#D0630E',
          800: '#9A3412',
          900: '#7C2D12',
        },
        brand: {
          DEFAULT: '#E8771B',
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#E8771B',
          700: '#D0630E',
          800: '#9A3412',
          900: '#7C2D12',
        },
        emerald: {
          DEFAULT: '#10B981',
          600: '#059669',
          50: '#ECFDF5',
          100: '#D1FAE5',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'neo-sm': '0 2px 8px -1px rgba(0,0,0,0.04)',
        'neo-card': '0 8px 30px rgb(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};
