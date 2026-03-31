import { create } from 'zustand'
import type { User, Couple } from '../types/index'
import { apiClient } from '../services/apiClient'

interface AppState {
  user: User | null
  couple: Couple | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean

  setUser: (user: User | null) => void
  setCouple: (couple: Couple | null) => void
  setError: (error: string | null) => void
  reset: () => void

  // Auth actions
  login: (email: string, password: string) => Promise<void>
  signup: (data: {
    email1: string
    password1: string
    name1: string
    email2: string
    password2: string
    name2: string
  }) => Promise<void>
  loadUserData: () => Promise<void>
  logout: () => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  couple: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,

  setUser: (user) => set({ user }),
  setCouple: (couple) => set({ couple }),
  setError: (error) => set({ error }),
  reset: () => set({ user: null, couple: null, error: null, isAuthenticated: false }),

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.auth.login(email, password)
      apiClient.setToken(response.token)
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  signup: async (data) => {
    set({ isLoading: true, error: null })
    try {
      await apiClient.auth.signup(data)
      // After signup, user should login
      set({ isLoading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  loadUserData: async () => {
    set({ isLoading: true, error: null })
    try {
      const [userResponse, coupleResponse] = await Promise.all([
        apiClient.auth.getMe(),
        apiClient.auth.getCouple(),
      ])
      set({
        user: userResponse.user,
        couple: coupleResponse.couple,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load user data'
      set({ error: message, isLoading: false, isAuthenticated: false })
      throw error
    }
  },

  logout: () => {
    apiClient.clearToken()
    set({ user: null, couple: null, isAuthenticated: false, error: null })
  },
}))
