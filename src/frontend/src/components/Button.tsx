import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className = '',
  disabled,
  style,
  ...props
}: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    fontWeight: 500,
    borderRadius: 8,
    transition: 'opacity 0.15s, background 0.15s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    border: 'none',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.55 : 1,
  }

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
      color: '#ffffff',
    },
    secondary: {
      background: 'var(--matri-card-bg)',
      color: 'var(--matri-text)',
      border: '1px solid var(--matri-card-border)',
    },
    danger: {
      background: '#dc2626',
      color: '#ffffff',
    },
    success: {
      background: '#16a34a',
      color: '#ffffff',
    },
  }

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '6px 12px', fontSize: 13 },
    md: { padding: '8px 16px', fontSize: 15 },
    lg: { padding: '12px 24px', fontSize: 17 },
  }

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      style={{ ...baseStyle, ...variantStyles[variant], ...sizeStyles[size], ...style }}
      className={className}
    >
      {isLoading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  )
}

function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  return (
    <svg
      className={`${sizeClass} animate-spin`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}
