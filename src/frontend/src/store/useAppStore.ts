import { create } from 'zustand'
import type { User, Couple } from '../types/index'
import { apiClient } from '../services/apiClient'
import { queryClient } from '../App'

interface AppState {
  user: User | null
  couple: Couple | null
  // v2.4 audit 07 S0: separamos bootstrap (`isLoading`) de polling background
  // (`isRefreshing`). ProtectedRoute solo escucha `isLoading` — así
  // `loadUserData(true)` en silent no provoca el flash "Cargando…" cada 60s
  // que reportaba el usuario.
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  isAuthenticated: boolean

  setUser: (user: User | null) => void
  setCouple: (couple: Couple | null) => void
  setError: (error: string | null) => void
  reset: () => void

  // Auth actions
  login: (email: string, password: string) => Promise<void>
  demoLogin: () => Promise<void>
  signup: (data: {
    email1: string
    password1: string
    name1: string
    email2: string
    password2: string
    name2: string
  }) => Promise<void>
  /**
   * Refresca user/couple desde el backend.
   * @param silent  true → background refresh: no toca isLoading (no pinta
   *                spinner full-screen). Use desde polling/visibility listeners.
   */
  loadUserData: (silent?: boolean) => Promise<void>
  logout: () => void
}

// Bug 2026-04-23: un refresh de página (sin navegar a /login explícitamente)
// nos devolvía al login aunque hubiese token guardado. Causa: el store arrancaba
// con isLoading=false; ProtectedRoute evaluaba isAuthenticated=false /
// isLoading=false en el primer render y hacía Navigate a /login antes de que
// el useEffect de App llegase a llamar a loadUserData. Arrancamos con
// isLoading=true si hay token en localStorage → ProtectedRoute muestra el
// spinner "Cargando..." y el flag se baja cuando loadUserData responde.
const hasStoredToken =
  typeof window !== 'undefined' && !!window.localStorage.getItem('auth_token')

export const useAppStore = create<AppState>((set) => ({
  user: null,
  couple: null,
  isLoading: hasStoredToken,
  isRefreshing: false,
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

  demoLogin: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.auth.demoLogin()
      apiClient.setToken(response.token)
      let couple = null
      try {
        const coupleResponse = await apiClient.auth.getCouple()
        couple = coupleResponse.couple ?? null
      } catch {
        /* demo user should always have a couple, but tolerate a transient error */
      }
      set({
        user: response.user,
        couple,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Demo login failed'
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

  loadUserData: async (silent = false) => {
    // En modo silent (polling background) no tocamos isLoading — solo
    // isRefreshing. Esto evita que ProtectedRoute pinte la pantalla
    // "Cargando…" cada 60s.
    if (silent) {
      set({ isRefreshing: true, error: null })
    } else {
      set({ isLoading: true, error: null })
    }
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
        isRefreshing: false,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load user data'
      // En silent: no marcamos isAuthenticated=false porque podría ser un
      // glitch transitorio de red; sí en bootstrap (donde queremos echar al
      // login si el token está roto).
      if (silent) {
        set({ error: message, isRefreshing: false })
      } else {
        set({ error: message, isLoading: false, isAuthenticated: false })
        throw error
      }
    }
  },

  logout: () => {
    apiClient.clearToken()
    queryClient.clear()
    set({ user: null, couple: null, isAuthenticated: false, error: null })
  },
}))
