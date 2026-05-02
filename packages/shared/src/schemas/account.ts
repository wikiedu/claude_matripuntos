// v1.6.1 — Account deletion wire contract.
import { z } from 'zod'

export const accountDeleteRequestSchema = z.object({
  password: z.string().min(1),
})
export type AccountDeleteRequestInput = z.infer<typeof accountDeleteRequestSchema>

export const accountDeleteRequestResponseSchema = z.object({
  ok: z.literal(true),
  codeViaConsole: z.boolean().optional(),
  code: z.string().length(6).optional(),  // solo en dev
})
export type AccountDeleteRequestResponse = z.infer<typeof accountDeleteRequestResponseSchema>

export const accountDeleteSchema = z.object({
  password: z.string().min(1),
  code: z.string().length(6),
})
export type AccountDeleteInput = z.infer<typeof accountDeleteSchema>
