/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Legacy tokens (keep for backward compatibility with index.css @apply rules)
        primary: '#6366F1',
        secondary: '#EC4899',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        neutral: '#6B7280',
        // v1.1 design tokens
        'matri-amber': 'var(--matri-amber)',
        'matri-amber-dark': 'var(--matri-amber-dark)',
        'matri-purple': 'var(--matri-purple)',
        'matri-purple-dark': 'var(--matri-purple-dark)',
        'matri-bg': 'var(--matri-bg)',
        'matri-card': 'var(--matri-card-bg)',
        'matri-border': 'var(--matri-card-border)',
        'matri-text': 'var(--matri-text)',
        'matri-text-2': 'var(--matri-text-2)',
        'matri-text-3': 'var(--matri-text-3)',
        'matri-success': 'var(--matri-success)',
      },
    },
  },
  plugins: [],
}
