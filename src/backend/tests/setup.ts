import dotenv from 'dotenv'
import path from 'path'

// Carga `.env.test` si existe, y si no cae a `.env`. Sin esto, los tests de
// jest no veían DATABASE_URL y Prisma fallaba con PrismaClientInitializationError.
// Usamos process.cwd() en lugar de import.meta.url porque ts-jest puede
// compilar este archivo a CJS sin `import.meta` disponible.
const backendRoot = process.cwd()

dotenv.config({ path: path.join(backendRoot, '.env.test') })
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.join(backendRoot, '.env') })
}

if (!process.env.DATABASE_URL) {
  // Último recurso: el dev.db local. Permite correr tests sin env específico
  // en local mientras dejamos abierta la opción de apuntar a otra DB en CI.
  process.env.DATABASE_URL = `file:${path.join(backendRoot, 'prisma', 'dev.db')}`
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-do-not-use-in-production'
}
