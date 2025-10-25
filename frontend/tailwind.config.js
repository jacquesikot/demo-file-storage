/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        background: '#F9FAFB',
        surface: '#FFFFFF',
        text: '#111827',
        'text-secondary': '#6B7280',
      },
    },
  },
  plugins: [],
}
