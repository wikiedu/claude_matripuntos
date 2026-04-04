import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Signup() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [formError, setFormError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setIsLoading(true)
    if (!email || !password || !name) {
      setFormError('Please fill all fields'); setIsLoading(false); return
    }
    try {
      const res = await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, language: 'es' }),
      })
      if (!res.ok) throw new Error('Signup failed')
      const data = await res.json()
      localStorage.setItem('token', data.token)
      navigate('/dashboard')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Matripuntos</h1>
            <p className="text-gray-600">Create your account</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{formError}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" disabled={isLoading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" disabled={isLoading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password (min 8)</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" disabled={isLoading} />
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors">
              {isLoading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-gray-600 text-sm mb-4">Already have an account?</p>
            <button onClick={() => navigate('/login')} className="w-full border border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-medium py-2 px-4 rounded-lg transition-colors">
              Log In
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
