import { describe, it, expect } from '@jest/globals'
import {
  JOIN_CODE_ALPHABET,
  JOIN_CODE_LENGTH,
  generateJoinCode,
  isValidJoinCode,
  normalizeJoinCode,
} from '../src/utils/joinCode'

describe('joinCode utility', () => {
  describe('generateJoinCode', () => {
    it('returns a string with the configured length', () => {
      expect(generateJoinCode()).toHaveLength(JOIN_CODE_LENGTH)
    })

    it('only uses characters from the safe alphabet', () => {
      for (let i = 0; i < 200; i++) {
        const code = generateJoinCode()
        for (const c of code) {
          expect(JOIN_CODE_ALPHABET).toContain(c)
        }
      }
    })

    it('never emits the confusable characters 0/O/1/I/L', () => {
      const banned = ['0', 'O', '1', 'I', 'L']
      for (let i = 0; i < 500; i++) {
        const code = generateJoinCode()
        for (const forbidden of banned) {
          expect(code).not.toContain(forbidden)
        }
      }
    })

    it('produces diverse codes across many generations', () => {
      const bag = new Set<string>()
      for (let i = 0; i < 200; i++) bag.add(generateJoinCode())
      // Con 32^6 ≈ 10^9 combinaciones, 200 generaciones deberían dar 200
      // únicos con altísima probabilidad. Margen holgado para evitar flakiness
      // pero suficientemente estricto para detectar un generador roto.
      expect(bag.size).toBeGreaterThan(195)
    })
  })

  describe('isValidJoinCode', () => {
    it('accepts a canonical 6-char code', () => {
      expect(isValidJoinCode('ABCDEF')).toBe(true)
    })

    it('rejects wrong length', () => {
      expect(isValidJoinCode('ABCDE')).toBe(false)
      expect(isValidJoinCode('ABCDEFG')).toBe(false)
      expect(isValidJoinCode('')).toBe(false)
    })

    it('rejects lowercase (caller must normalize first)', () => {
      expect(isValidJoinCode('abcdef')).toBe(false)
    })

    it('rejects confusable characters', () => {
      expect(isValidJoinCode('ABCDE0')).toBe(false)
      expect(isValidJoinCode('ABCDEO')).toBe(false)
      expect(isValidJoinCode('ABCDE1')).toBe(false)
      expect(isValidJoinCode('ABCDEI')).toBe(false)
      expect(isValidJoinCode('ABCDEL')).toBe(false)
    })

    it('rejects non-alphanumeric', () => {
      expect(isValidJoinCode('ABCDE!')).toBe(false)
      expect(isValidJoinCode('ABCDE ')).toBe(false)
    })
  })

  describe('normalizeJoinCode', () => {
    it('uppercases and strips whitespace/dashes', () => {
      expect(normalizeJoinCode(' abcdef ')).toBe('ABCDEF')
      expect(normalizeJoinCode('abc-def')).toBe('ABCDEF')
      expect(normalizeJoinCode('a b c d e f')).toBe('ABCDEF')
    })

    it('returns the input verbatim when already valid', () => {
      expect(normalizeJoinCode('P2QR3S')).toBe('P2QR3S')
    })

    it('returns null when it cannot produce a valid code', () => {
      expect(normalizeJoinCode('abc')).toBeNull()
      expect(normalizeJoinCode('abcdefgh')).toBeNull()
      expect(normalizeJoinCode('ABCDE0')).toBeNull() // contains confusable
      expect(normalizeJoinCode('')).toBeNull()
    })
  })
})
