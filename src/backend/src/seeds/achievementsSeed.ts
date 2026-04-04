import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ACHIEVEMENTS = [
  // Hitos
  {
    name: 'Primeros pasos',
    description: 'Alcanza 50 puntos',
    type: 'solo',
    icon: '👣',
    rarity: 'common',
    condition: JSON.stringify({ type: 'points_earned', threshold: 50 })
  },
  {
    name: 'Centinela',
    description: 'Alcanza 250 puntos',
    type: 'solo',
    icon: '🛡️',
    rarity: 'rare',
    condition: JSON.stringify({ type: 'points_earned', threshold: 250 })
  },
  {
    name: 'Maestro de equilibrio',
    description: 'Alcanza 500 puntos',
    type: 'solo',
    icon: '⚖️',
    rarity: 'epic',
    condition: JSON.stringify({ type: 'points_earned', threshold: 500 })
  },
  // Comportamientos
  {
    name: 'Pacifista',
    description: 'Acepta un evento sin negociación',
    type: 'solo',
    icon: '☮️',
    rarity: 'common',
    condition: JSON.stringify({ type: 'event_accepted_no_negotiation', threshold: 1 })
  },
  {
    name: 'Consenso perfecto',
    description: '5 eventos aceptados consecutivamente sin disputas',
    type: 'solo',
    icon: '🤝',
    rarity: 'rare',
    condition: JSON.stringify({ type: 'consecutive_accepted_events', threshold: 5 })
  },
  {
    name: 'Generoso',
    description: 'Dona 50+ puntos a tu pareja',
    type: 'solo',
    icon: '🎁',
    rarity: 'rare',
    condition: JSON.stringify({ type: 'points_donated', threshold: 50 })
  },
  // Racha
  {
    name: 'Semana tranquila',
    description: '7 días sin disputas en tareas o eventos',
    type: 'couple',
    icon: '🌊',
    rarity: 'rare',
    condition: JSON.stringify({ type: 'days_without_disputes', threshold: 7 })
  },
  {
    name: 'Mes armonioso',
    description: '30 días sin tareas disputadas',
    type: 'couple',
    icon: '🌸',
    rarity: 'epic',
    condition: JSON.stringify({ type: 'days_without_disputes', threshold: 30 })
  },
  // Combos
  {
    name: 'Power duo',
    description: 'Ambos usuarios desbloquean 5+ logros',
    type: 'couple',
    icon: '💪',
    rarity: 'legendary',
    condition: JSON.stringify({ type: 'both_users_achievements', threshold: 5 })
  },
  {
    name: 'Sincronía perfecta',
    description: 'Balance perfecto (0 pts de diferencia) por 3 días consecutivos',
    type: 'couple',
    icon: '🎵',
    rarity: 'epic',
    condition: JSON.stringify({ type: 'perfect_balance_days', threshold: 3 })
  },
  // Comportamientos adicionales
  {
    name: 'Velocidad',
    description: '10 tareas completadas en 1 semana',
    type: 'solo',
    icon: '⚡',
    rarity: 'rare',
    condition: JSON.stringify({ type: 'tasks_completed_weekly', threshold: 10 })
  },
  {
    name: 'Confianza',
    description: '20 tareas verificadas sin disputas',
    type: 'solo',
    icon: '✅',
    rarity: 'rare',
    condition: JSON.stringify({ type: 'tasks_verified_no_disputes', threshold: 20 })
  }
]

async function seedAchievements() {
  // Get all couples
  const couples = await prisma.couple.findMany()

  for (const couple of couples) {
    // Check if achievements already seeded for this couple
    const existingCount = await prisma.achievement.count({
      where: { coupleId: couple.id }
    })

    if (existingCount === 0) {
      console.log(`Seeding achievements for couple ${couple.id}...`)

      for (const ach of ACHIEVEMENTS) {
        await prisma.achievement.create({
          data: {
            coupleId: couple.id,
            name: ach.name,
            description: ach.description,
            type: ach.type,
            icon: ach.icon,
            rarity: ach.rarity,
            condition: ach.condition
          }
        })
      }

      console.log(`✓ Seeded 12 achievements for couple ${couple.id}`)
    } else {
      console.log(`Achievements already exist for couple ${couple.id}, skipping`)
    }
  }

  console.log('✓ Achievement seeding complete')
}

seedAchievements()
  .catch(e => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
