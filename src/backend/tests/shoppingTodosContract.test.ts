// Contract tests para /api/shopping y /api/todos — validación de esquemas
// de request/response. Sin DB ni servidor HTTP.

import { describe, it, expect } from '@jest/globals'
import { z } from 'zod'

// ─── Shopping schemas ─────────────────────────────────────────────────────────

const shoppingItemCreateSchema = z.object({
  text: z.string().min(1).max(200),
})

const shoppingItemUpdateSchema = z.object({
  isChecked: z.boolean().optional(),
  text: z.string().min(1).max(200).optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'At least one field required' })

describe('POST /api/shopping/items — shoppingItemCreateSchema', () => {
  it('accepts valid item text', () => {
    expect(() => shoppingItemCreateSchema.parse({ text: 'Leche' })).not.toThrow()
  })

  it('rejects empty text', () => {
    expect(() => shoppingItemCreateSchema.parse({ text: '' })).toThrow()
  })

  it('rejects text over 200 chars', () => {
    expect(() => shoppingItemCreateSchema.parse({ text: 'a'.repeat(201) })).toThrow()
  })

  it('rejects missing text field', () => {
    expect(() => shoppingItemCreateSchema.parse({})).toThrow()
  })
})

describe('PUT /api/shopping/items/:id — shoppingItemUpdateSchema', () => {
  it('accepts isChecked update', () => {
    expect(() => shoppingItemUpdateSchema.parse({ isChecked: true })).not.toThrow()
  })

  it('accepts text update', () => {
    expect(() => shoppingItemUpdateSchema.parse({ text: 'Mantequilla' })).not.toThrow()
  })

  it('accepts both fields', () => {
    expect(() => shoppingItemUpdateSchema.parse({ isChecked: false, text: 'Pan' })).not.toThrow()
  })

  it('rejects empty object (nothing to update)', () => {
    expect(() => shoppingItemUpdateSchema.parse({})).toThrow()
  })
})

// ── Shopping response shape ────────────────────────────────────────────────────

const shoppingListResponseSchema = z.object({
  id: z.string(),
  coupleId: z.string(),
  isActive: z.boolean(),
  items: z.array(
    z.object({
      id: z.string(),
      listId: z.string(),
      text: z.string(),
      isChecked: z.boolean(),
      checkedBy: z.string().nullable().optional(),
      checkedAt: z.union([z.string(), z.date()]).nullable().optional(),
    })
  ),
})

describe('GET /api/shopping response shape', () => {
  it('validates a well-formed shopping list response', () => {
    expect(() =>
      shoppingListResponseSchema.parse({
        id: 'sl1',
        coupleId: 'c1',
        isActive: true,
        items: [
          { id: 'item1', listId: 'sl1', text: 'Leche', isChecked: false, checkedBy: null },
        ],
      })
    ).not.toThrow()
  })

  it('validates list with no items', () => {
    expect(() =>
      shoppingListResponseSchema.parse({
        id: 'sl1', coupleId: 'c1', isActive: true, items: [],
      })
    ).not.toThrow()
  })
})

// ─── Todos schemas ────────────────────────────────────────────────────────────

const todoCreateSchema = z.object({
  text: z.string().min(1).max(500),
  dueDate: z.string().datetime().optional(),
  isShared: z.boolean().optional().default(false),
})

const todoUpdateSchema = z.object({
  text: z.string().min(1).max(500).optional(),
  isCompleted: z.boolean().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  isShared: z.boolean().optional(),
})

describe('POST /api/todos — todoCreateSchema', () => {
  it('accepts minimal valid todo', () => {
    expect(() => todoCreateSchema.parse({ text: 'Llamar al médico' })).not.toThrow()
  })

  it('accepts optional dueDate in ISO format', () => {
    expect(() =>
      todoCreateSchema.parse({ text: 'Recoger receta', dueDate: '2026-12-01T09:00:00Z' })
    ).not.toThrow()
  })

  it('rejects invalid dueDate format', () => {
    expect(() =>
      todoCreateSchema.parse({ text: 'Tarea', dueDate: '01-12-2026' })
    ).toThrow()
  })

  it('rejects empty text', () => {
    expect(() => todoCreateSchema.parse({ text: '' })).toThrow()
  })

  it('rejects text over 500 chars', () => {
    expect(() => todoCreateSchema.parse({ text: 'x'.repeat(501) })).toThrow()
  })
})

describe('PUT /api/todos/:id — todoUpdateSchema', () => {
  it('accepts isCompleted toggle', () => {
    expect(() => todoUpdateSchema.parse({ isCompleted: true })).not.toThrow()
  })

  it('accepts null dueDate (clearing the date)', () => {
    expect(() => todoUpdateSchema.parse({ dueDate: null })).not.toThrow()
  })

  it('accepts empty object (no-op update is valid schema)', () => {
    expect(() => todoUpdateSchema.parse({})).not.toThrow()
  })
})

// ── Todo response shape ────────────────────────────────────────────────────────

const todoResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  coupleId: z.string(),
  text: z.string(),
  isCompleted: z.boolean(),
  isShared: z.boolean(),
  dueDate: z.union([z.string(), z.date()]).nullable(),
})

describe('GET /api/todos response shape', () => {
  it('validates a well-formed todo', () => {
    expect(() =>
      todoResponseSchema.parse({
        id: 't1', userId: 'u1', coupleId: 'c1',
        text: 'Llamar al médico', isCompleted: false, isShared: false, dueDate: null,
      })
    ).not.toThrow()
  })
})
