// Tests herméticos para activityTemplateService.
// Cubren: listForCouple, groupedForCouple, create (pointsApproved=false),
// update (NOT_FOUND, IDOR, pointsApproved reset), approvePoints, deactivate,
// recordUse.

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockPrisma: any = {
  activityTemplate: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}

jest.mock('../src/lib/prisma', () => ({ __esModule: true, default: mockPrisma }))

import { ActivityTemplateService } from '../src/services/activityTemplateService.js'

const svc = new ActivityTemplateService()

const GLOBAL_TPL = {
  id: 'tpl_global_1', coupleId: null, category: 'trabajo', name: 'Jornada laboral',
  pointsBaseSuggested: 8, isActive: true,
}
const COUPLE_TPL = {
  id: 'tpl_c1_1', coupleId: 'c1', category: 'ocio', name: 'Custom',
  pointsBaseSuggested: 5, isActive: true,
}

beforeEach(() => { jest.clearAllMocks() })

// ── listForCouple ─────────────────────────────────────────────────────────────

describe('listForCouple', () => {
  it('queries active global + couple-scoped templates', async () => {
    mockPrisma.activityTemplate.findMany.mockResolvedValue([GLOBAL_TPL, COUPLE_TPL])
    const result = await svc.listForCouple('c1')
    expect(mockPrisma.activityTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          OR: [{ coupleId: null }, { coupleId: 'c1' }],
        }),
      })
    )
    expect(result).toHaveLength(2)
  })
})

// ── groupedForCouple ──────────────────────────────────────────────────────────

describe('groupedForCouple', () => {
  it('groups by category', async () => {
    mockPrisma.activityTemplate.findMany.mockResolvedValue([
      { ...GLOBAL_TPL, category: 'trabajo' },
      { ...COUPLE_TPL, category: 'ocio' },
      { ...COUPLE_TPL, id: 'tpl3', category: 'trabajo' },
    ])
    const groups = await svc.groupedForCouple('c1')
    expect(groups['trabajo']).toHaveLength(2)
    expect(groups['ocio']).toHaveLength(1)
  })

  it('returns empty object when no templates exist', async () => {
    mockPrisma.activityTemplate.findMany.mockResolvedValue([])
    const groups = await svc.groupedForCouple('c1')
    expect(Object.keys(groups)).toHaveLength(0)
  })
})

// ── create ────────────────────────────────────────────────────────────────────

describe('create', () => {
  it('creates template with pointsApproved=false', async () => {
    mockPrisma.activityTemplate.create.mockResolvedValue({
      ...COUPLE_TPL, pointsApproved: false,
    })
    await svc.create('c1', {
      category: 'ocio', name: 'Mi actividad', pointsBaseSuggested: 5,
    })
    expect(mockPrisma.activityTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ coupleId: 'c1', pointsApproved: false }),
      })
    )
  })

  it('maps optional fields to null when not provided', async () => {
    mockPrisma.activityTemplate.create.mockResolvedValue(COUPLE_TPL)
    await svc.create('c1', { category: 'ocio', name: 'X', pointsBaseSuggested: 4 })
    const data = mockPrisma.activityTemplate.create.mock.calls[0][0].data
    expect(data.subcategory).toBeNull()
    expect(data.description).toBeNull()
    expect(data.emoji).toBeNull()
  })
})

// ── update ────────────────────────────────────────────────────────────────────

describe('update', () => {
  it('throws NOT_FOUND when template does not exist', async () => {
    mockPrisma.activityTemplate.findUnique.mockResolvedValue(null)
    await expect(svc.update('c1', 'tpl_unknown', { name: 'New' }))
      .rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('throws NOT_FOUND when template belongs to a different couple (IDOR guard)', async () => {
    mockPrisma.activityTemplate.findUnique.mockResolvedValue({ ...COUPLE_TPL, coupleId: 'c2' })
    await expect(svc.update('c1', COUPLE_TPL.id, { name: 'Hacked' }))
      .rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('resets pointsApproved when points change', async () => {
    mockPrisma.activityTemplate.findUnique.mockResolvedValue({ ...COUPLE_TPL, pointsBaseSuggested: 5 })
    mockPrisma.activityTemplate.update.mockResolvedValue({})
    await svc.update('c1', COUPLE_TPL.id, { pointsBaseSuggested: 10 })
    const data = mockPrisma.activityTemplate.update.mock.calls[0][0].data
    expect(data.pointsApproved).toBe(false)
    expect(data.pointsApprovedAt).toBeNull()
  })

  it('does NOT reset pointsApproved when points are unchanged', async () => {
    mockPrisma.activityTemplate.findUnique.mockResolvedValue({ ...COUPLE_TPL, pointsBaseSuggested: 5 })
    mockPrisma.activityTemplate.update.mockResolvedValue({})
    await svc.update('c1', COUPLE_TPL.id, { pointsBaseSuggested: 5, name: 'Renamed' })
    const data = mockPrisma.activityTemplate.update.mock.calls[0][0].data
    expect(data.pointsApproved).toBeUndefined()
  })

  it('does NOT reset pointsApproved when points are not in the input', async () => {
    mockPrisma.activityTemplate.findUnique.mockResolvedValue(COUPLE_TPL)
    mockPrisma.activityTemplate.update.mockResolvedValue({})
    await svc.update('c1', COUPLE_TPL.id, { name: 'Only name changed' })
    const data = mockPrisma.activityTemplate.update.mock.calls[0][0].data
    expect(data.pointsApproved).toBeUndefined()
  })
})

// ── approvePoints ─────────────────────────────────────────────────────────────

describe('approvePoints', () => {
  it('sets pointsApproved=true and pointsApprovedAt', async () => {
    mockPrisma.activityTemplate.update.mockResolvedValue({})
    await svc.approvePoints('tpl1')
    expect(mockPrisma.activityTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tpl1' },
        data: expect.objectContaining({ pointsApproved: true }),
      })
    )
  })
})

// ── deactivate ────────────────────────────────────────────────────────────────

describe('deactivate', () => {
  it('sets isActive=false', async () => {
    mockPrisma.activityTemplate.findUnique.mockResolvedValue(COUPLE_TPL)
    mockPrisma.activityTemplate.update.mockResolvedValue({})
    await svc.deactivate('c1', COUPLE_TPL.id)
    expect(mockPrisma.activityTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } })
    )
  })

  it('throws NOT_FOUND for wrong coupleId (IDOR guard)', async () => {
    mockPrisma.activityTemplate.findUnique.mockResolvedValue({ ...COUPLE_TPL, coupleId: 'c2' })
    await expect(svc.deactivate('c1', COUPLE_TPL.id)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

// ── recordUse ─────────────────────────────────────────────────────────────────

describe('recordUse', () => {
  it('increments instancesThisMonth and sets lastInstanceAt', async () => {
    mockPrisma.activityTemplate.update.mockResolvedValue({})
    await svc.recordUse('tpl1')
    expect(mockPrisma.activityTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tpl1' },
        data: expect.objectContaining({ instancesThisMonth: { increment: 1 } }),
      })
    )
  })
})
