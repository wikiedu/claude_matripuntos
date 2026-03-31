import { useState } from 'react'
import { BarChart3, Plus, Settings, LogOut, TrendingUp, TrendingDown } from 'lucide-react'
import RequestActivity from './RequestActivity'
import RequestInbox from './RequestInbox'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface User {
  name: string
  balance: number
  partner: string
  partnerBalance: number
}

export default function Dashboard() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'request' | 'inbox'>('dashboard')
  const [user] = useState<User>({
    name: 'Juan García',
    balance: 35.5,
    partner: 'María López',
    partnerBalance: -12.0,
  })

  // Mock data for 30-day chart
  const chartData = [
    { date: '1 Mar', juan: 10, maria: 5 },
    { date: '5 Mar', juan: 15, maria: 12 },
    { date: '10 Mar', juan: 20, maria: 8 },
    { date: '15 Mar', juan: 25, maria: 15 },
    { date: '20 Mar', juan: 30, maria: 18 },
    { date: '25 Mar', juan: 35.5, maria: 35 },
    { date: '31 Mar', juan: 35.5, maria: -12 },
  ]

  if (currentView === 'request') {
    return <RequestActivity onBack={() => setCurrentView('dashboard')} />
  }

  if (currentView === 'inbox') {
    return <RequestInbox onBack={() => setCurrentView('dashboard')} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">
              M
            </div>
            <h1 className="text-xl font-bold text-gray-900">Matripuntos</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <LogOut className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Your Balance */}
          <div className="card">
            <p className="text-gray-600 text-sm font-medium mb-2">TÚ ({user.name})</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-success">{user.balance}</span>
              <span className="text-gray-600">MATRIPUNTOS</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Cambio (30 días): ↗️ +15.5 pts</p>
          </div>

          {/* Partner Balance */}
          <div className="card">
            <p className="text-gray-600 text-sm font-medium mb-2">ÉL/ELLA ({user.partner})</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold ${user.partnerBalance < 0 ? 'text-danger' : 'text-success'}`}>
                {user.partnerBalance}
              </span>
              <span className="text-gray-600">MATRIPUNTOS</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Cambio (30 días): ↘️ -5.0 pts</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Quick Actions */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Acciones Rápidas</h2>
            <button
              onClick={() => setCurrentView('request')}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3 hover:shadow-md"
            >
              <Plus className="w-5 h-5" />
              Solicitar Actividad
            </button>
            <button className="w-full btn-primary flex items-center justify-center gap-2 py-3">
              <Plus className="w-5 h-5" />
              Registrar Tarea Hoy
            </button>
            <button
              onClick={() => setCurrentView('inbox')}
              className="w-full btn-secondary flex items-center justify-center gap-2 py-3 hover:shadow-md"
            >
              <BarChart3 className="w-5 h-5" />
              Bandeja: 2 Pendientes
            </button>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Últimas Actividades</h2>
            <div className="space-y-3">
              <div className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">Cena viernes</p>
                    <p className="text-sm text-gray-600">{user.partner} • 31 Mar</p>
                  </div>
                  <span className="badge-success">+11.5</span>
                </div>
              </div>
              <div className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">Cocina</p>
                    <p className="text-sm text-gray-600">{user.partner} • 30 Mar</p>
                  </div>
                  <span className="badge-success">+2.0</span>
                </div>
              </div>
              <div className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">Limpieza profunda</p>
                    <p className="text-sm text-gray-600">{user.name} • 30 Mar</p>
                  </div>
                  <span className="badge-success">+3.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Graph */}
        <div className="card mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Últimos 30 Días</h2>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="juan"
                  stroke="#6366F1"
                  dot={{ fill: '#6366F1', r: 4 }}
                  activeDot={{ r: 6 }}
                  name={user.name}
                />
                <Line
                  type="monotone"
                  dataKey="maria"
                  stroke="#EC4899"
                  dot={{ fill: '#EC4899', r: 4 }}
                  activeDot={{ r: 6 }}
                  name={user.partner}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Stats below chart */}
          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-success" />
              <div>
                <p className="text-xs text-gray-600">{user.name}</p>
                <p className="font-bold text-success">+15.5 pts</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TrendingDown className="w-5 h-5 text-danger" />
              <div>
                <p className="text-xs text-gray-600">{user.partner}</p>
                <p className="font-bold text-danger">-5.0 pts</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
