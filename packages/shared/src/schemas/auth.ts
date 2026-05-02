// v1.6.1 — Auth schemas. Source of truth para wire contract de auth.
import { z } from 'zod'
import { emailSchema, passwordSchema } from './common.js'

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
})
export type LoginInput = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1).max(80),
  joinCode: z.string().optional(),
})
export type RegisterInput = z.infer<typeof registerSchema>

export const joinCodeRegisterSchema = z.object({
  password: passwordSchema,
  name: z.string().min(1).max(80),
  token: z.string().min(1),
})
export type JoinCodeRegisterInput = z.infer<typeof joinCodeRegisterSchema>
