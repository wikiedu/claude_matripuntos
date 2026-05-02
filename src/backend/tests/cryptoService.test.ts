// v2.0.1 — Hermetic tests para cryptoService AES-256-GCM.

import { describe, it, expect } from '@jest/globals'
import crypto from 'crypto'
import { encrypt, decrypt, generateKey } from '../src/services/cryptoService.js'

const KEY = Buffer.from(generateKey(), 'hex')

describe('cryptoService', () => {
  it('round-trip preserves plaintext', () => {
    const plain = 'refresh_token_xyz_123'
    const enc = encrypt(plain, KEY)
    const dec = decrypt(enc, KEY)
    expect(dec).toBe(plain)
  })

  it('encryption produces different output each call (random IV)', () => {
    const a = encrypt('same', KEY)
    const b = encrypt('same', KEY)
    expect(a).not.toBe(b)
  })

  it('decrypt with wrong key fails', () => {
    const enc = encrypt('secret', KEY)
    const wrongKey = Buffer.from(generateKey(), 'hex')
    expect(() => decrypt(enc, wrongKey)).toThrow()
  })

  it('decrypt with tampered ciphertext fails', () => {
    const enc = encrypt('secret', KEY)
    const parts = enc.split(':')
    parts[2] = parts[2].split('').reverse().join('')
    const tampered = parts.join(':')
    expect(() => decrypt(tampered, KEY)).toThrow()
  })

  it('decrypt with malformed payload throws', () => {
    expect(() => decrypt('not:valid', KEY)).toThrow('Invalid encrypted payload format')
  })

  it('handles empty string', () => {
    const enc = encrypt('', KEY)
    expect(decrypt(enc, KEY)).toBe('')
  })

  it('handles unicode', () => {
    const plain = '🔐 año café'
    expect(decrypt(encrypt(plain, KEY), KEY)).toBe(plain)
  })

  it('generateKey returns 64-char hex', () => {
    const k = generateKey()
    expect(k).toMatch(/^[a-f0-9]{64}$/)
  })
})
