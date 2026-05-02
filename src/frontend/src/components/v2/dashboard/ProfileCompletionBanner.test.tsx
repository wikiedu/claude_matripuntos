import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProfileCompletionBanner } from './ProfileCompletionBanner'

vi.mock('../../../services/apiClient', () => ({
  apiClient: {
    request: vi.fn(() => Promise.resolve({ percent: 50, missing: ['avatar', 'workMode'] })),
  },
}))

beforeEach(() => { localStorage.clear() })

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ProfileCompletionBanner', () => {
  it('hides when no firstLoginAt', () => {
    render(<ProfileCompletionBanner firstLoginAt={null} />, { wrapper })
    expect(screen.queryByTestId('profile-completion-banner')).toBeNull()
  })

  it('hides when firstLoginAt > 7 days ago', () => {
    const old = new Date(Date.now() - 8 * 86400000)
    render(<ProfileCompletionBanner firstLoginAt={old} />, { wrapper })
    expect(screen.queryByTestId('profile-completion-banner')).toBeNull()
  })

  it('hides when previously dismissed', () => {
    localStorage.setItem('matripuntos_profile_banner_dismissed_at', new Date().toISOString())
    render(<ProfileCompletionBanner firstLoginAt={new Date()} />, { wrapper })
    expect(screen.queryByTestId('profile-completion-banner')).toBeNull()
  })

  it('shows percent + missing CTA when within 7 days and percent < 80', async () => {
    render(<ProfileCompletionBanner firstLoginAt={new Date()} />, { wrapper })
    await screen.findByTestId('profile-completion-banner')
    expect(screen.getByText(/50%/)).toBeInTheDocument()
  })

  it('dismiss persists in localStorage', async () => {
    render(<ProfileCompletionBanner firstLoginAt={new Date()} />, { wrapper })
    await screen.findByTestId('btn-banner-dismiss')
    fireEvent.click(screen.getByTestId('btn-banner-dismiss'))
    expect(localStorage.getItem('matripuntos_profile_banner_dismissed_at')).toBeTruthy()
  })
})
