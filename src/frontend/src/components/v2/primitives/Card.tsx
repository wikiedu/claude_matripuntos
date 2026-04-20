import { ReactNode, CSSProperties } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  padding?: 'sm' | 'md' | 'lg'
  elevated?: boolean
}

export function Card({ children, className = '', style, padding = 'md', elevated = false }: CardProps) {
  const paddings = { sm: 'p-3', md: 'p-4', lg: 'p-5' }
  const bg = elevated ? 'bg-surface-elevated' : 'bg-surface-card'
  return (
    <div
      className={`${bg} border border-brd-subtle rounded-lg ${paddings[padding]} ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}
