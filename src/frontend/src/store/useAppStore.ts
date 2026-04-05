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

      // Attempt to load couple data. Users with no couple yet will get a 401/400 — that's expected.
      let couple = null
      try {
        const coupleResponse = await apiClient.auth.getCouple()
        couple = coupleResponse.couple ?? null
      } catch {
        // No couple linked yet — solo user, that's fine
      }

      set({
        user: response.user,
        couple,
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
      const userResponse = await apiClient.auth.getMe()

      // Attempt to load couple data. New users (no couple yet) will get a 401/400
      // from /auth/couple — that's expected. We handle it gracefully.
      let couple = null
      try {
        const coupleResponse = await apiClient.auth.getCouple()
        couple = coupleResponse.couple ?? null
      } catch {
        // No couple linked yet — that's fine for a freshly signed-up user
      }

      set({
        user: userResponse.user,
        couple,
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
