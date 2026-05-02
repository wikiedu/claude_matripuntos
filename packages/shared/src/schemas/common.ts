// v1.6.1 — Shared zod primitives reused across schemas.
import { z } from 'zod'

export const idSchema = z.string().min(1)
export const emailSchema = z.string().email()
export const passwordSchema = z.string().min(6).max(100)
export const isoDateSchema = z.string().datetime()

export const errorResponseSchema = z.object({
  error: z.string(),
  details: z.array(z.any()).optional(),
})
export type ErrorResponse = z.infer<typeof errorResponseSchema>
