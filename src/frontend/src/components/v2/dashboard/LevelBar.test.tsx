import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LevelBar } from './LevelBar'

const baseLevel = {
  xp: 200, level: 2, name: 'Amigos',
  perks: ['theme:tribe'],
  threshold: 100, nextThreshold: 300, xpToNext: 100,
}

describe('LevelBar', () => {
  it('renders level name + lv number', () => {
    render(<LevelBar level={baseLevel} />)
    expect(screen.getByTestId('level-bar')).toBeInTheDocument()
    expect(screen.getByText(/Amigos · Lv 2/)).toBeInTheDocument()
  })

  it('shows XP to next', () => {
    render(<LevelBar level={baseLevel} />)
    expect(screen.getByText(/100 XP para Lv 3/)).toBeInTheDocument()
  })

  it('shows max level state at lv 10', () => {
    render(<LevelBar level={{ ...baseLevel, level: 10, name: 'Vida', xpToNext: 0 }} />)
    expect(screen.getByText('Nivel máximo')).toBeInTheDocument()
  })

  it('renders progress bar with correct width', () => {
    render(<LevelBar level={baseLevel} />)
    const bar = screen.getByTestId('level-progress')
    // 200/300 between thresholds 100-300 = 50%
    expect(bar).toHaveStyle({ width: '50%' })
  })
})
