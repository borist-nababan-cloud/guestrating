/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        zen: {
          matcha: '#889D35',
          moss: '#6E8027',
          sand: '#D2C0A7',
          linen: '#F8F5F1',
          cream: '#F4EFEB',
          charcoal: '#3C3C32',
          muted: '#717163',
          border: '#E5DACB',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
