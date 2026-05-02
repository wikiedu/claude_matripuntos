// v2.0.1 — AES-256-GCM wrapper para cifrar Google refresh tokens en BD.
// Key viene de env GOOGLE_TOKEN_ENCRYPTION_KEY (32 bytes hex = 64 chars).
//
// Formato output: base64url(iv) + ':' + base64url(authTag) + ':' + base64url(cipher)

import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12  // GCM recomienda 96-bit IV
const AUTH_TAG_LENGTH = 16

function getKey(): Buffer {
  const hex = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY must be 32 bytes hex (64 chars)')
  }
  return Buffer.from(hex, 'hex')
}

export function encrypt(plaintext: string, keyOverride?: Buffer): string {
  const key = keyOverride ?? getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    iv.toString('base64url'),
    tag.toString('base64url'),
    enc.toString('base64url'),
  ].join(':')
}

export function decrypt(payload: string, keyOverride?: Buffer): string {
  const key = keyOverride ?? getKey()
  const parts = payload.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted payload format')
  const [ivB, tagB, encB] = parts
  const iv = Buffer.from(ivB, 'base64url')
  const tag = Buffer.from(tagB, 'base64url')
  const enc = Buffer.from(encB, 'base64url')
  if (tag.length !== AUTH_TAG_LENGTH) throw new Error('Invalid auth tag length')
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(enc), decipher.final()])
  return dec.toString('utf8')
}

export function generateKey(): string {
  return crypto.randomBytes(32).toString('hex')
}
