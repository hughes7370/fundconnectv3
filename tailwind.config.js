/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0070F3',
          dark: '#0060D3',
          light: '#3694FF',
        },
        secondary: {
          DEFAULT: '#7C3AED',
          dark: '#6D28D9',
          light: '#A78BFA',
        }
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
} 