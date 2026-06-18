// Tests herméticos para lib/jsonField — parseJsonField y stringifyJsonField.
// Sin dependencias de DB: 100% unit, instant.

import { describe, it, expect } from '@jest/globals'

// Mock logger to suppress warn output in tests
jest.mock('../src/lib/logger', () => ({
  __esModule: true,
  default: { warn: jest.fn() },
  logger: { warn: jest.fn() },
}))

import { parseJsonField, stringifyJsonField } from '../src/lib/jsonField.js'

// ── parseJsonField ────────────────────────────────────────────────────────────

describe('parseJsonField', () => {
  it('returns fallback for null', () => {
    expect(parseJsonField(null, {})).toEqual({})
  })

  it('returns fallback for undefined', () => {
    expect(parseJsonField(undefined, [])).toEqual([])
  })

  it('returns fallback for empty string', () => {
    expect(parseJsonField('', { default: true })).toEqual({ default: true })
  })

  it('parses a valid JSON object', () => {
    expect(parseJsonField('{"a":1}', {})).toEqual({ a: 1 })
  })

  it('parses a valid JSON array', () => {
    expect(parseJsonField('[1,2,3]', [])).toEqual([1, 2, 3])
  })

  it('parses a JSON string primitive', () => {
    expect(parseJsonField('"hello"', null)).toBe('hello')
  })

  it('parses a JSON number primitive', () => {
    expect(parseJsonField('42', null)).toBe(42)
  })

  it('returns fallback for malformed JSON — never throws', () => {
    expect(parseJsonField('{bad json', {})).toEqual({})
  })

  it('returns fallback for truncated JSON — never throws', () => {
    expect(parseJsonField('{"a":', null)).toBeNull()
  })

  it('fallback type is preserved when null passed as fallback', () => {
    const result = parseJsonField<string[] | null>(null, null)
    expect(result).toBeNull()
  })

  it('returns complex nested object', () => {
    const input = JSON.stringify({ multipliers: { children: { '2': 1.8 } } })
    expect(parseJsonField(input, {})).toEqual({ multipliers: { children: { '2': 1.8 } } })
  })

  // Edge case: JSON.parse('null') is valid → returns null not fallback
  it('parses JSON null literal (valid JSON)', () => {
    expect(parseJsonField('null', 'fallback')).toBeNull()
  })
})

// ── stringifyJsonField ────────────────────────────────────────────────────────

describe('stringifyJsonField', () => {
  it('serializes an object', () => {
    expect(stringifyJsonField({ a: 1 })).toBe('{"a":1}')
  })

  it('serializes an array', () => {
    expect(stringifyJsonField([1, 2])).toBe('[1,2]')
  })

  it('serializes null', () => {
    expect(stringifyJsonField(null)).toBe('null')
  })

  it('round-trips with parseJsonField', () => {
    const value = { tasksConfig: { cocina: 2.5 } }
    const serialized = stringifyJsonField(value)
    expect(parseJsonField(serialized, {})).toEqual(value)
  })
})
