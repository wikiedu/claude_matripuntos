import crypto from 'crypto'
import type { PrismaClient } from '@prisma/client'

// 32 caracteres: excluye 0/O/1/I/L para que sea fácil dictar por voz y leer
// en pantalla sin confusiones. El alfabeto debe quedar alineado con los
// mensajes que el frontend muestra al usuario (pantalla Settings).
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const JOIN_CODE_LENGTH = 6

export function generateJoinCode(): string {
  const chars: string[] = []
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    // randomInt uniforme (Math.random no lo es). Si Node no tuviera randomInt,
    // tendríamos que rechazar por rango — pero viene desde Node 14.17.
    chars.push(JOIN_CODE_ALPHABET[crypto.randomInt(0, JOIN_CODE_ALPHABET.length)])
  }
  return chars.join('')
}

export function isValidJoinCode(code: string): boolean {
  if (code.length !== JOIN_CODE_LENGTH) return false
  for (const c of code) {
    if (!JOIN_CODE_ALPHABET.includes(c)) return false
  }
  return true
}

// Normaliza entrada del usuario (mayúsculas, sin espacios, sin 0/O/1/I/L
// obvios). Devuelve el string normalizado o null si no puede ser un joinCode
// válido. Separar esto de isValidJoinCode permite mostrar el código "real"
// en UI cuando el usuario pega algo con espacios/minúsculas.
export function normalizeJoinCode(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase().replace(/[\s-]/g, '')
  if (trimmed.length !== JOIN_CODE_LENGTH) return null
  if (!isValidJoinCode(trimmed)) return null
  return trimmed
}

export async function generateUniqueJoinCode(
  prisma: PrismaClient,
  maxAttempts = 5
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateJoinCode()
    const existing = await prisma.couple.findUnique({
      where: { joinCode: candidate },
      select: { id: true },
    })
    if (!existing) return candidate
  }
  // 32^6 = 1073M combinaciones; 5 colisiones seguidas es cosmológicamente
  // improbable salvo que la base esté corrupta. Si pasa, fallamos ruidoso.
  throw new Error(
    `Could not generate unique join code after ${maxAttempts} attempts`
  )
}
