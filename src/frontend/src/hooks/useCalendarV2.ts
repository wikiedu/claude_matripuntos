// v2.0.1 — Hooks calendar v2. Feature flag check.

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../services/apiClient'

const FLAG_ENABLED = (import.meta.env?.VITE_CALENDAR_360_ENABLED ?? 'false') === 'true'

export interface CalendarEntry {
  id: string
  type: 'event' | 'task' | 'service' | 'birthday' | 'holiday' | 'external' | 'manual'
  title: string
  date: string
  endDate: string | null
  allDay: boolean
  category: string | null
  description: string | null
  color: string | null
  externalSource: string | null
  metadata: string | null
}

export interface ServiceProvider {
  id: string
  name: string
  type: 'limpieza' | 'jardineria' | 'cuidado_ninos' | 'mantenimiento' | 'otro'
  recurrence: string | null
  color: string | null
  notes: string | null
  active: boolean
}

export interface GoogleSyncStatus {
  connected: boolean
  syncEnabled: boolean
  lastSyncedAt: string | null
  syncWindow: number
  filters: string[]
}

async function safeRequest<T>(path: string, fallback: T): Promise<T> {
  try {
    const r: any = await apiClient.request(path)
    return r as T
  } catch {
    return fallback
  }
}

export function useCalendarEntries(opts: { from?: string; to?: string; types?: string[] }) {
  const params = new URLSearchParams()
  if (opts.from) params.set('from', opts.from)
  if (opts.to) params.set('to', opts.to)
  if (opts.types?.length) params.set('types', opts.types.join(','))
  const qs = params.toString()
  return useQuery({
    queryKey: ['calendar-v2', 'entries', opts],
    queryFn: () => safeRequest<{ entries: CalendarEntry[] }>(`/calendar/v2/entries${qs ? '?' + qs : ''}`, { entries: [] }),
    enabled: FLAG_ENABLED,
    staleTime: 5 * 60_000,
  })
}

export function useServiceProviders() {
  return useQuery({
    queryKey: ['calendar-v2', 'providers'],
    queryFn: () => safeRequest<{ providers: ServiceProvider[] }>('/calendar/v2/service-providers', { providers: [] }),
    enabled: FLAG_ENABLED,
    staleTime: 10 * 60_000,
  })
}

export function useGoogleCalendarStatus() {
  return useQuery({
    queryKey: ['calendar-v2', 'google-status'],
    queryFn: () => safeRequest<GoogleSyncStatus>('/calendar/google/status', {
      connected: false, syncEnabled: false, lastSyncedAt: null, syncWindow: 90, filters: [],
    }),
    enabled: FLAG_ENABLED,
    staleTime: 60 * 60_000,
  })
}

export const isCalendar360Enabled = () => FLAG_ENABLED
