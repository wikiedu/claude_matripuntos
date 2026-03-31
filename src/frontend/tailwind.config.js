/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#6366F1",      // Indigo
        secondary: "#EC4899",    // Pink
        success: "#10B981",      // Green
        warning: "#F59E0B",      // Orange
        danger: "#EF4444",       // Red
        neutral: "#6B7280",      // Gray
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
