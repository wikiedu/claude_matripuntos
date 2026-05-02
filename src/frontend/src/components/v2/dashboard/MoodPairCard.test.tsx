import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MoodPairCard } from './MoodPairCard'

const recent = new Date().toISOString()
const expired = new Date(Date.now() - 26 * 3600 * 1000).toISOString()

const me = { name: 'Edu', avatarEmoji: '🦊', avatarColor: '#7c3aed', currentMood: 'feliz', moodUpdatedAt: recent }
const partner = { name: 'Ana', avatarEmoji: '🐼', avatarColor: '#ec4899', currentMood: 'cansado', moodUpdatedAt: recent }
const partnerExpired = { ...partner, moodUpdatedAt: expired }

describe('MoodPairCard', () => {
  it('renders both moods when vigent', () => {
    render(<MoodPairCard me={me} partner={partner} onPickMine={() => {}} />)
    expect(screen.getByTestId('my-mood')).toHaveTextContent('Feliz')
    expect(screen.getByTestId('partner-mood')).toHaveTextContent('Cansada/o')
  })

  it('shows "—" when partner mood expired', () => {
    render(<MoodPairCard me={me} partner={partnerExpired} onPickMine={() => {}} />)
    expect(screen.getByTestId('partner-mood')).toHaveTextContent('—')
  })

  it('shows CTA on my side when I have no mood', () => {
    const meNoMood = { ...me, currentMood: null, moodUpdatedAt: null }
    render(<MoodPairCard me={meNoMood} partner={partner} onPickMine={() => {}} />)
    // v1.6.3: copy compactado, ahora "Tu estado →" en lugar de "Comparte cómo estás →"
    expect(screen.getByTestId('my-mood')).toHaveTextContent('Tu estado')
  })

  it('tap on my side calls onPickMine', () => {
    const onPickMine = vi.fn()
    render(<MoodPairCard me={me} partner={partner} onPickMine={onPickMine} />)
    fireEvent.click(screen.getByTestId('my-side'))
    expect(onPickMine).toHaveBeenCalled()
  })

  it('tap on partner side does NOT call onPickMine', () => {
    const onPickMine = vi.fn()
    render(<MoodPairCard me={me} partner={partner} onPickMine={onPickMine} />)
    fireEvent.click(screen.getByTestId('partner-side'))
    expect(onPickMine).not.toHaveBeenCalled()
  })

  it('shows "Sin pareja" when partner is null', () => {
    render(<MoodPairCard me={me} partner={null} onPickMine={() => {}} />)
    // v1.6.3: indicador compacto, copy reducido a "Sin pareja"
    expect(screen.getByTestId('partner-side')).toHaveTextContent('Sin pareja')
  })
})
