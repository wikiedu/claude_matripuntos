// Helper central para campos JSON-en-string de Prisma (audit T7).
// En SQLite (y por compatibilidad también en Postgres) varios modelos guardan
// JSON serializado como string (tasksConfig, payload, progress, filters…).
// Antes había ~36 `JSON.parse` dispersos y sin guard: un valor corrupto en DB
// tiraba el handler con un 500. Este helper concentra el parse con fallback
// seguro y logging, y el stringify simétrico para las escrituras.
//
// Convención de uso:
//   parseJsonField(config.tasksConfig, {})            // objeto con fallback {}
//   parseJsonField(profile.workSchedule, null)        // campo nullable
//   parseJsonField<string[]>(sync.filters, [])        // array tipado
//   stringifyJsonField(value)                         // escritura simétrica

import logger from './logger.js'

/**
 * Parsea un campo JSON-string de la DB. Devuelve `fallback` si el valor es
 * null/undefined/'' o si el JSON es inválido (con warn, nunca throw).
 */
export function parseJsonField<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null || raw === '') return fallback
  try {
    return JSON.parse(raw) as T
  } catch (err) {
    logger.warn({ err, raw: raw.slice(0, 200) }, 'parseJsonField: JSON inválido en DB, usando fallback')
    return fallback
  }
}

/** Serializa un valor para guardarlo en un campo JSON-string de la DB. */
export function stringifyJsonField(value: unknown): string {
  return JSON.stringify(value)
}
