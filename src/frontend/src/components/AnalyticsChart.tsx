import React from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

interface AnalyticsChartProps {
  data: any[]
  type: 'weekly' | 'daily' | 'comparison' | 'period'
  periodDays?: number
}

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ data, type, periodDays = 30 }) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        No hay datos para este período
      </div>
    )
  }

  if (type === 'period') {
    // ≤7 days → bar chart (one bar per day, easy to read)
    // >7 days → line chart (continuous trend)
    const useBar = periodDays <= 7

    if (useBar) {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              stroke="#6b7280"
              tick={{ fontSize: 11 }}
              angle={-30}
              textAnchor="end"
              interval={0}
            />
            <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              formatter={(value: number, name: string) => [value, name]}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
            <Bar dataKey="events" fill="#6366F1" name="Actividades" radius={[4, 4, 0, 0]} />
            <Bar dataKey="tasks" fill="#10B981" name="Tareas" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="label"
            stroke="#6b7280"
            tick={{ fontSize: 10 }}
            angle={-30}
            textAnchor="end"
            interval={Math.floor(data.length / 8)}
          />
          <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
          <Line type="monotone" dataKey="events" stroke="#6366F1" strokeWidth={2} dot={false} name="Actividades" />
          <Line type="monotone" dataKey="tasks" stroke="#10B981" strokeWidth={2} dot={false} name="Tareas" />
          <Line type="monotone" dataKey="points" stroke="#F59E0B" strokeWidth={1.5} dot={false} name="Puntos" strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'weekly') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" stroke="#6b7280" tick={{ fontSize: 11 }} />
          <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Line type="monotone" dataKey="events" stroke="#3B82F6" dot={{ fill: '#3B82F6', r: 4 }} activeDot={{ r: 6 }} name="Eventos" />
          <Line type="monotone" dataKey="points" stroke="#EC4899" dot={{ fill: '#EC4899', r: 4 }} activeDot={{ r: 6 }} name="Puntos" />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'daily') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
          <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="count" fill="#3B82F6" name="Eventos" />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return null
}
