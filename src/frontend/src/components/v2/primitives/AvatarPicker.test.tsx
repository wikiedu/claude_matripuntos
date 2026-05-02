import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AvatarPicker } from './AvatarPicker'
import { AVATAR_EMOJIS, AVATAR_COLORS } from '../../../data/avatarCatalog'

describe('AvatarPicker', () => {
  it('renders preview with current emoji', () => {
    render(<AvatarPicker emoji="🦊" color="#7c3aed" onChange={() => {}} />)
    expect(screen.getByTestId('avatar-preview')).toHaveTextContent('🦊')
  })

  it('renders all 30 emoji options and 12 color swatches', () => {
    render(<AvatarPicker emoji="🦊" color="#7c3aed" onChange={() => {}} />)
    expect(screen.getAllByTestId(/^emoji-opt-/)).toHaveLength(AVATAR_EMOJIS.length)
    expect(screen.getAllByTestId(/^color-opt-/)).toHaveLength(AVATAR_COLORS.length)
  })

  it('clicking emoji calls onChange with new emoji + same color', () => {
    const onChange = vi.fn()
    render(<AvatarPicker emoji="🦊" color="#7c3aed" onChange={onChange} />)
    fireEvent.click(screen.getByTestId('emoji-opt-🐼'))
    expect(onChange).toHaveBeenCalledWith({ emoji: '🐼', color: '#7c3aed' })
  })

  it('clicking color calls onChange with same emoji + new color', () => {
    const onChange = vi.fn()
    render(<AvatarPicker emoji="🦊" color="#7c3aed" onChange={onChange} />)
    fireEvent.click(screen.getByTestId('color-opt-#10b981'))
    expect(onChange).toHaveBeenCalledWith({ emoji: '🦊', color: '#10b981' })
  })

  it('marks current emoji and current color as selected via data attribute', () => {
    render(<AvatarPicker emoji="🦊" color="#7c3aed" onChange={() => {}} />)
    expect(screen.getByTestId('emoji-opt-🦊')).toHaveAttribute('data-selected', 'true')
    expect(screen.getByTestId('color-opt-#7c3aed')).toHaveAttribute('data-selected', 'true')
  })
})
