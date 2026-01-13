/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      colors: {
        // Wine color palette - elegant burgundy tones
        wine: {
          50: '#fdf2f4',
          100: '#fce8eb',
          200: '#f9d0d9',
          300: '#f4a9ba',
          400: '#ec7994',
          500: '#dc4b6f',
          600: '#c42d54',
          700: '#a52145',
          800: '#8a1e3d',
          900: '#751c38',
          950: '#420a1c',
        },
        purple: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
        },
        cream: {
          50: '#fefdfb',
          100: '#fdf9f3',
          200: '#faf3e8',
        }
      },
      maxWidth: {
        'container': '80rem',
      },
      spacing: {
        'container-padding': '1.5rem',
        'section': '5rem',
        'section-lg': '7rem',
        'section-sm': '3rem',
      }
    },
  },
  plugins: [],
}; 