import { z } from 'zod'

export const signupSchema = z.object({
  email1: z.string().email('Invalid email format'),
  password1: z.string().min(8, 'Password must be at least 8 characters'),
  name1: z.string().min(2, 'Name must be at least 2 characters'),
  email2: z.string().email('Invalid email format'),
  password2: z.string().min(8, 'Password must be at least 8 characters'),
  name2: z.string().min(2, 'Name must be at least 2 characters'),
  language: z.string().optional().default('es'),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

export const getUserSchema = z.object({
  userId: z.string().cuid('Invalid user ID'),
})

export const getCoupleSchema = z.object({
  coupleId: z.string().cuid('Invalid couple ID'),
})
