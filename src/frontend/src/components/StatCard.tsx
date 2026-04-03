import React from 'lucide-react'

interface StatCardProps {
  icon: React.ComponentType<{ size: number; className?: string }>
  label: string
  value: number | string
  unit: string
  trend?: string
  color?: 'blue' | 'green' | 'purple' | 'orange'
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  green: 'bg-green-50 text-green-600 border-green-200',
  purple: 'bg-purple-50 text-purple-600 border-purple-200',
  orange: 'bg-orange-50 text-orange-600 border-orange-200',
}

const iconColorClasses = {
  blue: 'text-blue-500',
  green: 'text-green-500',
  purple: 'text-purple-500',
  orange: 'text-orange-500',
}

export const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  label,
  value,
  unit,
  trend,
  color = 'blue',
}) => {
  return (
    <div className={`rounded-lg border p-6 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{label}</h3>
        <Icon size={20} className={iconColorClasses[color]} />
      </div>
      <div>
        <p className="text-3xl font-bold">
          {trend}
          {value}
        </p>
        <p className="text-xs text-gray-500 mt-1">{unit}</p>
      </div>
    </div>
  )
}
