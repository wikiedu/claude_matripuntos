import { PrismaClient } from '@prisma/client'
import { generateUniqueJoinCode } from '../src/utils/joinCode.js'

// Rellena Couple.joinCode para todas las parejas que todavía lo tienen en
// NULL. Idempotente: una segunda corrida no toca las parejas ya con código.
// Úsalo una vez en producción tras desplegar la migración de v1.4.
//
// Ejecución:
//   DATABASE_URL="postgresql://..." npx ts-node --esm prisma/backfill-join-codes.ts

const prisma = new PrismaClient()

async function main() {
  console.log('🔑 Backfilling Couple.joinCode…')

  const pending = await prisma.couple.findMany({
    where: { joinCode: null },
    select: { id: true },
  })

  if (pending.length === 0) {
    console.log('  Nothing to do — every couple already has a joinCode.')
    return
  }

  console.log(`  Found ${pending.length} couple(s) without joinCode. Updating…`)

  let updated = 0
  for (const { id } of pending) {
    const code = await generateUniqueJoinCode(prisma)
    await prisma.couple.update({
      where: { id },
      data: { joinCode: code },
    })
    updated++
    if (updated % 50 === 0) {
      console.log(`  Progress: ${updated}/${pending.length}`)
    }
  }

  console.log(`✅ Done. ${updated} couple(s) backfilled.`)
}

main()
  .catch((err) => {
    console.error('❌ Backfill failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
