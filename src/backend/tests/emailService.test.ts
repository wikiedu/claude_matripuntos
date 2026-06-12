// Tests herméticos para emailService.
// Prioridad ALTA: retry logic, clasificación transient/non-transient, HTML escaping (audit S2-1).

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'

// ── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = jest.fn<any>()
global.fetch = mockFetch

// ── Module reload helper ─────────────────────────────────────────────────────
// emailService reads RESEND_API_KEY at module load time from process.env,
// so we need to set the env before the first import.

beforeEach(() => {
  mockFetch.mockReset()
})

// ── Import after env setup ───────────────────────────────────────────────────

// Set a fake key so sendEmail doesn't short-circuit
const ORIGINAL_KEY = process.env.RESEND_API_KEY
beforeEach(() => { process.env.RESEND_API_KEY = 'test-key' })
afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.RESEND_API_KEY
  else process.env.RESEND_API_KEY = ORIGINAL_KEY
})

import {
  deleteAccountCodeEmail,
  inviteEmail,
  passwordResetEmail,
  sendEmail,
} from '../src/services/emailService.js'

// ── HTML escape templates ────────────────────────────────────────────────────

describe('deleteAccountCodeEmail — HTML escaping', () => {
  it('escapes < > & " in userName', () => {
    const result = deleteAccountCodeEmail('123456', '<script>alert(1)</script>')
    expect(result.html).not.toContain('<script>')
    expect(result.html).toContain('&lt;script&gt;')
  })

  it('escapes & in userName', () => {
    const result = deleteAccountCodeEmail('123456', 'Ana & Carlos')
    expect(result.html).toContain('Ana &amp; Carlos')
  })

  it('escapes " in userName', () => {
    const result = deleteAccountCodeEmail('123456', 'User "quoted"')
    expect(result.html).toContain('&quot;')
  })

  it('escapes single quote in userName', () => {
    const result = deleteAccountCodeEmail('123456', "O'Brien")
    expect(result.html).toContain('&#39;Brien')
  })

  it('uses raw code in text body (not HTML escaped)', () => {
    const result = deleteAccountCodeEmail('123456', 'Ana')
    expect(result.text).toContain('123456')
  })

  it('code appears escaped in HTML body', () => {
    const result = deleteAccountCodeEmail('<b>1</b>', 'Ana')
    expect(result.html).not.toContain('<b>1</b>')
    expect(result.html).toContain('&lt;b&gt;1&lt;/b&gt;')
  })
})

describe('inviteEmail — HTML escaping', () => {
  it('escapes < in inviterName', () => {
    const result = inviteEmail('<Evil>', 'https://example.com')
    expect(result.html).not.toContain('<Evil>')
    expect(result.html).toContain('&lt;Evil&gt;')
  })

  it('escapes HTML in link (defense in depth)', () => {
    const result = inviteEmail('Ana', 'https://x.com?a=1&b=2')
    expect(result.html).toContain('https://x.com?a=1&amp;b=2')
  })

  it('subject uses raw (unescaped) inviterName', () => {
    const result = inviteEmail('Ana', 'https://example.com')
    expect(result.subject).toContain('Ana')
  })
})

describe('passwordResetEmail — HTML escaping', () => {
  it('escapes userName in HTML body', () => {
    const result = passwordResetEmail('<b>Bad</b>', 'https://example.com')
    expect(result.html).not.toContain('<b>Bad</b>')
    expect(result.html).toContain('&lt;b&gt;Bad&lt;/b&gt;')
  })

  it('escapes link in href', () => {
    const result = passwordResetEmail('Ana', 'https://x.com?a=1&b=2')
    expect(result.html).toContain('&amp;')
  })
})

// ── sendEmail: no API key ────────────────────────────────────────────────────

describe('sendEmail — no RESEND_API_KEY', () => {
  it('returns ok:false without calling fetch when key is missing', async () => {
    delete process.env.RESEND_API_KEY

    const result = await sendEmail({ to: 'a@b.com', subject: 'test', html: '<p>hi</p>' })

    expect(result.ok).toBe(false)
    expect(result.error).toContain('RESEND_API_KEY')
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

// ── sendEmail: success ───────────────────────────────────────────────────────

describe('sendEmail — successful send', () => {
  it('returns ok:true with id on 200 response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'email-123' }),
    })

    const result = await sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' })

    expect(result.ok).toBe(true)
    expect(result.id).toBe('email-123')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

// ── sendEmail: non-transient errors (no retry) ───────────────────────────────

describe('sendEmail — non-transient 4xx (no retry)', () => {
  it('returns ok:false immediately on 400 without retrying', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Bad Request'),
    })

    const result = await sendEmail({ to: 'bad-email', subject: 'Hi', html: '<p>Hi</p>' })

    expect(result.ok).toBe(false)
    expect(mockFetch).toHaveBeenCalledTimes(1) // no retry
  })

  it('returns ok:false immediately on 401 without retrying', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    })

    const result = await sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' })

    expect(result.ok).toBe(false)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('returns ok:false immediately on 422 without retrying', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      text: () => Promise.resolve('Validation'),
    })

    const result = await sendEmail({ to: 'a@b.com', subject: 'Hi', html: '' })

    expect(result.ok).toBe(false)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

// ── sendEmail: transient errors (retries) ────────────────────────────────────

describe('sendEmail — transient 5xx/429 (retries up to 3x)', () => {
  it('retries on 500 and succeeds on second attempt', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server Error'),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'email-ok' }),
      })

    const result = await sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' })

    expect(result.ok).toBe(true)
    expect(result.id).toBe('email-ok')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('retries on 429 and succeeds on third attempt', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 429, text: () => Promise.resolve('Rate limit') })
      .mockResolvedValueOnce({ ok: false, status: 429, text: () => Promise.resolve('Rate limit') })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'ok' }) })

    const result = await sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' })

    expect(result.ok).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('exhausts all 3 attempts and returns ok:false', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve('Service Unavailable'),
    })

    const result = await sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' })

    expect(result.ok).toBe(false)
    expect(mockFetch).toHaveBeenCalledTimes(3) // MAX_ATTEMPTS
  })

  it('treats network/fetch exceptions as transient and retries', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'email-ok' }),
      })

    const result = await sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>' })

    expect(result.ok).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})
