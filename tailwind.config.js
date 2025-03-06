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
          DEFAULT: '#1E3A8A',
          dark: '#152C6C',
          light: '#2B4AA9',
        },
        secondary: {
          DEFAULT: '#2DD4BF',
          dark: '#14B8A6',
          light: '#5EEAD4',
        },
        accent: {
          green: '#10B981',
          gold: '#FBBF24',
        },
        gray: {
          light: '#E5E7EB',
          dark: '#4B5563',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['Source Code Pro', 'monospace'],
      },
      fontSize: {
        'heading-large': '36px',
        'heading-medium': '24px',
        'subheading': '18px',
        'body': '16px',
        'small': '14px',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
} 