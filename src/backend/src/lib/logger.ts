// Logger central del backend (pino). Reemplaza los `console.*` crudos por
// logging estructurado con niveles, así Render/agregadores reciben JSON
// parseable en vez de texto plano (audit #6).
//
// Niveles efectivos por entorno (override con LOG_LEVEL):
//   - test        → silent  (mantiene limpia la salida de los E2E/Jest)
//   - production  → info
//   - development → debug
//
// Salida: JSON line-delimited (sin transport/worker, para no romper bajo
// ts-node/esm ni en el arranque de Render). En local, si quieres salida
// legible: `npm run dev | npx pino-pretty`.
//
// Convención de uso por callsite:
//   logger.error({ err }, 'mensaje')        // pino serializa el stack vía `err`
//   logger.warn({ mod: 'telemetry' }, 'msg')
//   logger.info('mensaje suelto')
// Para contexto reutilizable: `const log = logger.child({ mod: 'authRoutes' })`.

import pino from 'pino'

const env = process.env.NODE_ENV ?? 'development'

const defaultLevel =
  env === 'test' ? 'silent' : env === 'production' ? 'info' : 'debug'

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? defaultLevel,
    // pid/hostname añaden ruido sin valor en un único proceso (Render); los
    // omitimos y dejamos que la correlación venga de campos explícitos (`mod`,
    // y en el futuro reqId/coupleId).
    base: undefined,
  },
  // Destino síncrono a stdout: en boot-fatal hacemos `logger.error(); process.exit(1)`
  // y un destino async (sonic-boom por defecto) truncaría el log antes de salir.
  // El volumen de esta app es bajo, así que el coste de sync es irrelevante y a
  // cambio ningún log se pierde en exits/crashes.
  pino.destination({ dest: 1, sync: true }),
)

export default logger
