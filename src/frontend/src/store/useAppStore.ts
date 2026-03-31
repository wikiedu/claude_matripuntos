import { create } from 'zustand'
import type { User, Couple } from '@types/index'

interface AppState {
  user: User | null
  couple: Couple | null
  setUser: (user: User | null) => void
  setCouple: (couple: Couple | null) => void
  reset: () => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  couple: null,
  setUser: (user) => set({ user }),
  setCouple: (couple) => set({ couple }),
  reset: () => set({ user: null, couple: null }),
}))
