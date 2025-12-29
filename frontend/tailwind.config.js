/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#f59e0b', // Amber 500
        secondary: '#78350f', // Amber 900
        accent: '#fbbf24', // Amber 400
        success: '#22c55e',
        danger: '#ef4444',
        warning: '#d97706', // Amber 600
        background: '#faf6d0', // Extracted from icon.png
        surface: '#ffffff',
      }
    },
  },
  plugins: [],
}

