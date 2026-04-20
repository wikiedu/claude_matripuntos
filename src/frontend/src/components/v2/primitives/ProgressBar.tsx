interface Props {
  value: number          // 0-100
  tone?: 'amber' | 'purple' | 'white'
  height?: number
  className?: string
}

export function ProgressBar({ value, tone = 'purple', height = 8, className = '' }: Props) {
  const pct = Math.max(0, Math.min(100, value))
  const fills = {
    amber:  'bg-grad-cta',
    purple: 'bg-gradient-to-r from-brand-purple to-brand-purple-dark',
    white:  'bg-white',
  }
  const track = tone === 'white' ? 'bg-black/20' : 'bg-white/10'
  return (
    <div className={`relative overflow-hidden rounded-full ${track} ${className}`} style={{ height }}>
      <div
        className={`absolute inset-y-0 left-0 ${fills[tone]} rounded-full transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
