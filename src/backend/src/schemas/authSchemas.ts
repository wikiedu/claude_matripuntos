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

// v1.6.2 fix S0-2: GDPR Art. 8 — declarar mayoría de edad en registro.
// `ageConfirmed: true` requerido. `.optional()` con default false porque
// puede haber clientes legacy que no envían el campo todavía — log de
// auditoría debe vigilar tasa de rechazos para detectar UI desactualizada.
export const signupUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  language: z.string().default('es'),
  ageConfirmed: z.literal(true, {
    errorMap: () => ({ message: 'Debes confirmar que tienes 18 años o más' }),
  }),
})

export const inviteSchema = z.object({
  toEmail: z.string().email(),
})

export const acceptInviteSchema = z.object({
  token: z.string().min(32),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  language: z.string().default('es'),
  ageConfirmed: z.literal(true, {
    errorMap: () => ({ message: 'Debes confirmar que tienes 18 años o más' }),
  }),
})

export const rejectInviteSchema = z.object({
  token: z.string().min(32),
})

export const proposePartnerSchema = z.object({
  partnerEmail: z.string().email(),
})

export const proposalActionSchema = z.object({
  invitationId: z.string().cuid(),
})

// Register-with-code: crea una cuenta y enlaza a la pareja dueña de joinCode.
// joinCode se valida también a nivel semántico (alfabeto/longitud) en el
// handler; aquí solo exigimos longitud 6 para dar errores tempranos.
export const registerWithCodeSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  joinCode: z.string().length(6),
  language: z.string().default('es'),
  ageConfirmed: z.literal(true, {
    errorMap: () => ({ message: 'Debes confirmar que tienes 18 años o más' }),
  }),
})
