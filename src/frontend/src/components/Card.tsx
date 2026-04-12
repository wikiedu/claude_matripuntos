import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--matri-card-bg)',
        border: '1px solid var(--matri-card-border)',
        borderRadius: 10,
        padding: '20px 24px',
        cursor: onClick ? 'pointer' : undefined,
        transition: onClick ? 'opacity 0.15s' : undefined,
      }}
      className={className}
    >
      {children}
    </div>
  )
}

interface CardTitleProps {
  children: React.ReactNode
  className?: string
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3
      style={{ color: 'var(--matri-text)', fontWeight: 600, fontSize: 18 }}
      className={className}
    >
      {children}
    </h3>
  )
}

interface CardDescriptionProps {
  children: React.ReactNode
  className?: string
}

export function CardDescription({ children, className = '' }: CardDescriptionProps) {
  return (
    <p
      style={{ color: 'var(--matri-text-2)', fontSize: 14 }}
      className={className}
    >
      {children}
    </p>
  )
}

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div style={{ marginTop: 16 }} className={className}>{children}</div>
}
