/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#000000',
          card: '#0a0a0a',
          border: '#262626'
        },
        light: {
          bg: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0'
        },
        teal: {
          accent: '#00b4d8'
        }
      }
    },
  },
  plugins: [],
}
