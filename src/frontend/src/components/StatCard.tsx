import type { LucideIcon } from 'lucide-react'

type ColorKey = 'blue' | 'green' | 'purple' | 'orange'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: number | string
  unit: string
  trend?: string
  color?: ColorKey
}

const iconColorStyles: Record<ColorKey, string> = {
  blue: '#60a5fa',
  green: '#4ade80',
  purple: '#c084fc',
  orange: '#fb923c',
}

export function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  trend,
  color = 'blue',
}: StatCardProps) {
  return (
    <div style={{
      background: 'var(--matri-card-bg)',
      border: '1px solid var(--matri-card-border)',
      borderRadius: 10,
      padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ color: 'var(--matri-text-3)', fontSize: 12, fontWeight: 500 }}>{label}</p>
        <Icon size={20} color={iconColorStyles[color]} />
      </div>
      <div>
        <p style={{ color: 'var(--matri-text)', fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>
          {trend}{value}
        </p>
        <p style={{ color: 'var(--matri-text-2)', fontSize: 11, marginTop: 4 }}>{unit}</p>
      </div>
    </div>
  )
}
