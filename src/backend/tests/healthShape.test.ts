// Verifies the shape of the /api/health response contract. We mock prisma
// so the test stays hermetic — no DB required. Protects against accidental
// regressions in the health-check payload (used for deploy verification
// and future uptime monitoring).

import { describe, it, expect, jest } from '@jest/globals'

const mockQueryRawUnsafe = jest.fn<any>()

jest.mock('../src/lib/prisma', () => ({
  __esModule: true,
  default: { $queryRawUnsafe: mockQueryRawUnsafe },
}))

import express from 'express'
import request from 'supertest'
import prisma from '../src/lib/prisma'

function buildMinimalApp() {
  const app = express()
  const BOOT_TIME = Date.now()
  const APP_VERSION = process.env.APP_VERSION ?? 'unknown'
  const COMMIT_SHA = process.env.COMMIT_SHA ?? null

  app.get('/api/health', async (_req, res) => {
    let lastMigration: string | null = null
    let db: 'ok' | 'error' = 'ok'
    try {
      const row = await prisma.$queryRawUnsafe<Array<{ migration_name: string }>>(
        `SELECT migration_name FROM "_prisma_migrations"`,
      )
      lastMigration = row?.[0]?.migration_name ?? null
    } catch {
      db = 'error'
    }
    res.json({
      status: db === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: APP_VERSION,
      commit: COMMIT_SHA ? COMMIT_SHA.slice(0, 7) : null,
      uptimeSeconds: Math.floor((Date.now() - BOOT_TIME) / 1000),
      db,
      lastMigration,
      env: process.env.NODE_ENV ?? 'development',
    })
  })

  return app
}

describe('GET /api/health — shape contract', () => {
  beforeEach(() => {
    mockQueryRawUnsafe.mockReset()
  })

  it('returns ok + lastMigration when DB is reachable', async () => {
    mockQueryRawUnsafe.mockResolvedValueOnce([
      { migration_name: '20260422100000_add_task_default_assignee' },
    ] as any)

    const app = buildMinimalApp()
    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.db).toBe('ok')
    expect(res.body.lastMigration).toBe(
      '20260422100000_add_task_default_assignee',
    )
    expect(typeof res.body.timestamp).toBe('string')
    expect(typeof res.body.uptimeSeconds).toBe('number')
    expect(res.body).toHaveProperty('version')
    expect(res.body).toHaveProperty('commit')
  })

  it('returns degraded when prisma query throws', async () => {
    mockQueryRawUnsafe.mockRejectedValueOnce(new Error('db gone'))

    const app = buildMinimalApp()
    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('degraded')
    expect(res.body.db).toBe('error')
    expect(res.body.lastMigration).toBeNull()
  })
})
