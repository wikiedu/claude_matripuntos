import { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  children: ReactNode
}

const variants: Record<Variant, string> = {
  primary:   'bg-grad-cta text-white shadow-lg shadow-brand-amber/40 hover:opacity-95',
  secondary: 'bg-grad-hero text-white shadow-lg shadow-brand-indigo/30 hover:opacity-95',
  ghost:     'bg-surface-muted text-text-primary border border-brd-purple hover:bg-surface-card',
  danger:    'bg-danger/90 text-white hover:bg-danger',
  outline:   'bg-transparent text-text-primary border border-brd-purple hover:bg-surface-muted',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3.5 text-base',
}

export function Button({ variant = 'primary', size = 'md', fullWidth, className = '', children, ...rest }: Props) {
  const width = fullWidth ? 'w-full' : ''
  return (
    <button
      className={`rounded-md font-bold transition disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber/60 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-base ${variants[variant]} ${sizes[size]} ${width} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
