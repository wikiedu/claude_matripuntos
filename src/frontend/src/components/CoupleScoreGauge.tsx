interface CoupleScoreGaugeProps {
  label: string
  value: number
  color: 'emerald' | 'indigo' | 'violet' | 'amber'
}

const colorMap = {
  emerald: '#10b981',
  indigo: '#6366f1',
  violet: '#7c3aed',
  amber: '#f59e0b'
}

export function CoupleScoreGauge({ label, value, color }: CoupleScoreGaugeProps) {
  return (
    <div className="text-center">
      <div className="relative w-20 h-20 mx-auto mb-2">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={colorMap[color]}
            strokeWidth="8"
            strokeDasharray={`${(value / 100) * 282.7} 282.7`}
            strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-900">{value}</span>
        </div>
      </div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
    </div>
  )
}
