import { useNavigate } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-xl text-gray-600 mb-8">Página no encontrada</p>
        <button
          onClick={() => navigate('/')}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <Home className="w-5 h-5" />
          Volver al inicio
        </button>
      </div>
    </div>
  )
}
