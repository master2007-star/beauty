/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#FAF7F5',
        silk: '#FFFFFF',
        champagne: '#F3EAE6',
        espresso: '#1B1615',
        taupe: '#6D5F5B',
        rose: '#B56558',
        'rose-hover': '#9E5246',
        emerald: '#16654B',
        'emerald-tint': '#E8F5F0',
        line: '#EAE0DB',
      },
      fontFamily: {
        editorial: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 8px 28px -18px rgba(42, 27, 23, .24)',
        lift: '0 18px 42px -20px rgba(42, 27, 23, .28)',
        glass: '0 8px 30px -20px rgba(42, 27, 23, .35)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-in-right': { from: { opacity: '0', transform: 'translateX(24px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
      },
      animation: {
        shimmer: 'shimmer 1.8s ease-in-out infinite',
        'fade-up': 'fade-up 420ms cubic-bezier(.16,1,.3,1) both',
        'slide-in-right': 'slide-in-right 300ms cubic-bezier(.16,1,.3,1) both',
      },
    },
  },
  plugins: [],
};
