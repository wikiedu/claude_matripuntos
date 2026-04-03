import React from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface AnalyticsChartProps {
  data: any[]
  type: 'weekly' | 'daily' | 'comparison'
}

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ data, type }) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No hay datos disponibles
      </div>
    )
  }

  if (type === 'weekly') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" stroke="#6b7280" tick={{ fontSize: 11 }} />
          <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} label={{ value: 'Cantidad', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Line
            type="monotone"
            dataKey="events"
            stroke="#3B82F6"
            dot={{ fill: '#3B82F6', r: 4 }}
            activeDot={{ r: 6 }}
            name="Eventos"
          />
          <Line
            type="monotone"
            dataKey="points"
            stroke="#EC4899"
            dot={{ fill: '#EC4899', r: 4 }}
            activeDot={{ r: 6 }}
            name="Puntos"
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'daily') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} label={{ value: 'Fecha', position: 'insideBottom', offset: -2, fill: '#9ca3af', fontSize: 11 }} />
          <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} label={{ value: 'Puntos', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="count" fill="#3B82F6" name="Eventos" />
          <Bar dataKey="totalPoints" fill="#EC4899" name="Puntos" />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return null
}
