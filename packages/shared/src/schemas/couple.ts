// v1.6.1 — Couple lifecycle wire contract (leave + past-couples).
import { z } from 'zod'

export const coupleLeaveSchema = z.object({
  password: z.string().min(1),
})
export type CoupleLeaveInput = z.infer<typeof coupleLeaveSchema>

export const pastCoupleSchema = z.object({
  id: z.string(),
  partnerName: z.string(),
  dissolvedAt: z.string(),
  createdAt: z.string(),
  finalBalance: z.number(),
  totalEvents: z.number().int(),
  totalTasks: z.number().int(),
})
export type PastCouple = z.infer<typeof pastCoupleSchema>

export const pastCouplesResponseSchema = z.object({
  pastCouples: z.array(pastCoupleSchema),
})
export type PastCouplesResponse = z.infer<typeof pastCouplesResponseSchema>
