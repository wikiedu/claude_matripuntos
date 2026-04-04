import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ACHIEVEMENTS = [
  { name: 'Primeros pasos', description: 'Alcanza 50 puntos', icon: '🏃', type: 'solo', rarity: 'common' },
  { name: 'Centinela', description: 'Alcanza 250 puntos', icon: '👀', type: 'solo', rarity: 'rare' },
  { name: 'Maestro de equilibrio', description: 'Alcanza 500 puntos', icon: '⚖️', type: 'solo', rarity: 'epic' },
  { name: 'Pacifista', description: 'Acepta un evento sin negociación', icon: '☮️', type: 'solo', rarity: 'common' },
  { name: 'Consenso perfecto', description: '5 eventos aceptados consecutivamente sin disputas', icon: '🤝', type: 'solo', rarity: 'rare' },
  { name: 'Generoso', description: 'Dona 50+ puntos a tu pareja', icon: '💝', type: 'solo', rarity: 'rare' },
  { name: 'Semana tranquila', description: '7 días sin disputas en tareas o eventos', icon: '😌', type: 'couple', rarity: 'rare' },
  { name: 'Mes armonioso', description: '30 días sin tareas disputadas', icon: '🌙', type: 'couple', rarity: 'epic' },
  { name: 'Power duo', description: 'Ambos usuarios desbloquean 5+ logros', icon: '⚡', type: 'couple', rarity: 'legendary' },
  { name: 'Sincronía perfecta', description: 'Balance perfecto (0 pts de diferencia) por 3 días consecutivos', icon: '✨', type: 'couple', rarity: 'epic' },
  { name: 'Velocidad', description: '10 tareas completadas en 1 semana', icon: '🚀', type: 'solo', rarity: 'rare' },
  { name: 'Confianza', description: '20 tareas verificadas sin disputas', icon: '💪', type: 'solo', rarity: 'rare' }
]

async function seed() {
  const couples = await prisma.couple.findMany()
  
  for (const couple of couples) {
    const existing = await prisma.achievement.count({ where: { coupleId: couple.id } })
    if (existing === 0) {
      for (const ach of ACHIEVEMENTS) {
        await prisma.achievement.create({
          data: {
            coupleId: couple.id,
            name: ach.name,
            description: ach.description,
            icon: ach.icon,
            type: ach.type,
            rarity: ach.rarity
          }
        })
      }
      console.log(`✓ Seeded ${ACHIEVEMENTS.length} achievements for ${couple.id}`)
    }
  }
  console.log('✓ Seeding complete')
  await prisma.$disconnect()
}

seed().catch(e => { console.error(e); process.exit(1) })
