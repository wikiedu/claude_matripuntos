import { useState, useCallback } from 'react'

interface AuthUser {
  id: string
  email: string
  name: string
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    try {
      // TODO: Implement login logic
      console.log('Login attempted:', email)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  return {
    user,
    isLoading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
  }
}
