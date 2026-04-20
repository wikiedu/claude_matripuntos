/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // === Claude Design v2 tokens (v1.4 La Evolución) ===
        bg: { page: '#0f0a1e' },
        surface: {
          card:     'rgba(26,16,53,0.6)',
          elevated: 'rgba(26,16,53,0.95)',
          muted:    'rgba(168,85,247,0.08)',
        },
        brand: {
          amber:       '#f59e0b',
          'amber-dark':'#d97706',
          purple:      '#a855f7',
          'purple-dark':'#7c3aed',
          indigo:      '#4f46e5',
        },
        text: {
          primary:   '#e2e8f0',
          secondary: '#9ca3af',
          tertiary:  '#6b7280',
        },
        brd: {
          subtle: 'rgba(168,85,247,0.12)',
          purple: 'rgba(168,85,247,0.25)',
        },
        success: '#22c55e',
        warn:    '#fbbf24',
        danger:  '#ef4444',

        // === Legacy tokens (kept for v1 components; removed progressively in v1.4 Tasks 0.3–8.1) ===
        primary: '#6366F1',
        secondary: '#EC4899',
        warning: '#F59E0B',
        neutral: '#6B7280',
        // v1.1 design tokens (CSS variable bindings)
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
      backgroundImage: {
        'grad-hero':    'linear-gradient(135deg, #4f46e5, #7c3aed)',
        'grad-cta':     'linear-gradient(135deg, #f59e0b, #d97706)',
        'grad-page':    'linear-gradient(180deg, #0f0a1e 0%, #1a0f35 100%)',
        'grad-premium': 'linear-gradient(135deg, #1a1138, #2d1e5f)',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '14px',
        xl: '18px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontVariantNumeric: {
        'tabular': 'tabular-nums',
      },
    },
  },
  plugins: [],
}
