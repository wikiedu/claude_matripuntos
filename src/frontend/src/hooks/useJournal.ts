// v2.0.2 — Hooks frontend para journal. Default ON.

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../services/apiClient'

const FLAG_ENABLED = (import.meta.env?.VITE_JOURNAL_ENABLED ?? 'true') !== 'false'

export interface JournalEntry {
  id: string
  type: 'reflection' | 'photo' | 'voice' | 'milestone' | 'letter'
  title: string | null
  body: string | null
  shared: boolean
  tags: string  // JSON
  authorId: string
  promptId: string | null
  recipientId: string | null
  readByPartnerAt: string | null
  createdAt: string
  reactions?: Array<{ id: string; emoji: string; userId: string }>
}

export interface JournalPrompt {
  id: string
  text: string
  category: 'reflection' | 'gratitude' | 'future' | 'conflict' | 'celebration'
  weight: number
}

export interface JournalRetrospective {
  id: string
  period: 'week' | 'month' | 'year'
  startDate: string
  endDate: string
  data: any
  generatedAt: string
  seenByUser1: boolean
  seenByUser2: boolean
}

async function safeRequest<T>(path: string, fallback: T, opts?: any): Promise<T> {
  try {
    const r: any = await apiClient.request(path, opts)
    return r as T
  } catch {
    return fallback
  }
}

export function useJournalEntries() {
  return useQuery({
    queryKey: ['journal', 'entries'],
    queryFn: () => safeRequest<{ entries: JournalEntry[] }>('/journal/entries', { entries: [] }),
    enabled: FLAG_ENABLED,
    staleTime: 5 * 60_000,
  })
}

export function useTodayPrompt() {
  return useQuery({
    queryKey: ['journal', 'prompts', 'today'],
    queryFn: () => safeRequest<{ prompt: JournalPrompt | null }>('/journal/prompts/today', { prompt: null }),
    enabled: FLAG_ENABLED,
    staleTime: 60 * 60_000,  // 1h
  })
}

export function useRetrospectives() {
  return useQuery({
    queryKey: ['journal', 'retrospectives'],
    queryFn: () => safeRequest<{ retrospectives: JournalRetrospective[] }>('/journal/retrospectives', { retrospectives: [] }),
    enabled: FLAG_ENABLED,
    staleTime: 60 * 60_000,
  })
}

export const isJournalEnabled = () => FLAG_ENABLED
