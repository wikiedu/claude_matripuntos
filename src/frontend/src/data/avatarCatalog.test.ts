import { describe, it, expect } from 'vitest'
import { AVATAR_EMOJIS, AVATAR_COLORS } from './avatarCatalog'

describe('avatarCatalog', () => {
  it('has exactly 30 emojis', () => {
    expect(AVATAR_EMOJIS).toHaveLength(30)
  })

  it('emojis are unique', () => {
    expect(new Set(AVATAR_EMOJIS).size).toBe(AVATAR_EMOJIS.length)
  })

  it('has exactly 12 colors', () => {
    expect(AVATAR_COLORS).toHaveLength(12)
  })

  it('every color has name and hex value', () => {
    for (const c of AVATAR_COLORS) {
      expect(c.name).toBeTruthy()
      expect(c.value).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('color hex values are unique', () => {
    const values = AVATAR_COLORS.map(c => c.value.toLowerCase())
    expect(new Set(values).size).toBe(values.length)
  })
})
