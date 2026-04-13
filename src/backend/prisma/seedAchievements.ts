// src/backend/prisma/seedAchievements.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const achievements = [
  // CONSTANCIA (orderIndex 1-8)
  { name: 'Primer paso', description: 'Completad vuestra primera tarea juntos.', icon: '👣', rarity: 'common', category: 'constancia', condition: JSON.stringify({ type: 'tasks_completed', threshold: 1 }), xpReward: 10, orderIndex: 1 },
  { name: 'Racha de 3', description: 'Mantened una racha diaria de 3 días.', icon: '🔥', rarity: 'common', category: 'constancia', condition: JSON.stringify({ type: 'daily_streak', threshold: 3 }), xpReward: 25, orderIndex: 2 },
  { name: 'Semana de fuego', description: 'Mantened una racha diaria de 7 días.', icon: '🌟', rarity: 'rare', category: 'constancia', condition: JSON.stringify({ type: 'daily_streak', threshold: 7 }), xpReward: 75, orderIndex: 3 },
  { name: 'Dos semanas juntos', description: 'Racha diaria de 14 días.', icon: '💪', rarity: 'rare', category: 'constancia', condition: JSON.stringify({ type: 'daily_streak', threshold: 14 }), xpReward: 100, orderIndex: 4 },
  { name: 'Mes de racha', description: 'Racha diaria de 30 días.', icon: '📅', rarity: 'epic', category: 'constancia', condition: JSON.stringify({ type: 'daily_streak', threshold: 30 }), xpReward: 200, orderIndex: 5 },
  { name: 'Dos meses de racha', description: 'Racha diaria de 60 días.', icon: '🏅', rarity: 'legendary', category: 'constancia', condition: JSON.stringify({ type: 'daily_streak', threshold: 60 }), xpReward: 500, orderIndex: 6 },
  { name: 'Centurión', description: 'Completad 100 tareas en total.', icon: '💯', rarity: 'rare', category: 'constancia', condition: JSON.stringify({ type: 'tasks_completed', threshold: 100 }), xpReward: 100, orderIndex: 7 },
  { name: 'Máquina', description: 'Completad 500 tareas en total.', icon: '⚙️', rarity: 'epic', category: 'constancia', condition: JSON.stringify({ type: 'tasks_completed', threshold: 500 }), xpReward: 300, orderIndex: 8 },

  // EQUILIBRIO (orderIndex 11-14)
  { name: 'Equilibrio perfecto', description: 'Alcanzad un equilibrio ≥80 en una semana.', icon: '⚖️', rarity: 'rare', category: 'equilibrio', condition: JSON.stringify({ type: 'equilibrium_week', threshold: 80 }), xpReward: 100, orderIndex: 11 },
  { name: 'Semanas de paz', description: '4 semanas consecutivas con equilibrio ≥40.', icon: '🕊️', rarity: 'epic', category: 'equilibrio', condition: JSON.stringify({ type: 'equilibrium_consecutive_weeks', threshold: 4 }), xpReward: 150, orderIndex: 12 },
  { name: 'Equilibrio sostenido', description: '8 semanas consecutivas con equilibrio ≥40.', icon: '🌈', rarity: 'legendary', category: 'equilibrio', condition: JSON.stringify({ type: 'equilibrium_consecutive_weeks', threshold: 8 }), xpReward: 400, orderIndex: 13 },
  { name: 'Racha semanal', description: 'Mantened una racha semanal de 3 semanas equilibradas.', icon: '📊', rarity: 'common', category: 'equilibrio', condition: JSON.stringify({ type: 'weekly_streak', threshold: 3 }), xpReward: 50, orderIndex: 14 },

  // CONSENSO (orderIndex 18-21)
  { name: 'Primera negociación', description: 'Cerrad vuestro primer evento por acuerdo mutuo.', icon: '🤝', rarity: 'common', category: 'consenso', condition: JSON.stringify({ type: 'negotiations_without_force', threshold: 1 }), xpReward: 20, orderIndex: 18 },
  { name: 'Campeón del consenso', description: 'Cerrad 10 negociaciones sin forzar el acuerdo.', icon: '🏆', rarity: 'epic', category: 'consenso', condition: JSON.stringify({ type: 'negotiations_without_force', threshold: 10 }), xpReward: 150, orderIndex: 19 },
  { name: 'Sin guerras', description: '0 eventos forzados en los últimos 30 días.', icon: '☮️', rarity: 'epic', category: 'consenso', condition: JSON.stringify({ type: 'no_forced_events_days', threshold: 30 }), xpReward: 200, orderIndex: 20 },
  { name: 'Diplomáticos', description: 'Cerrad 25 negociaciones sin forzar.', icon: '🎭', rarity: 'legendary', category: 'consenso', condition: JSON.stringify({ type: 'negotiations_without_force', threshold: 25 }), xpReward: 350, orderIndex: 21 },

  // RENDIMIENTO (orderIndex 24-26)
  { name: 'En forma', description: 'Completad 10 tareas en total.', icon: '💼', rarity: 'common', category: 'rendimiento', condition: JSON.stringify({ type: 'tasks_completed', threshold: 10 }), xpReward: 15, orderIndex: 24 },
  { name: 'Comprometidos', description: 'Completad 50 tareas en total.', icon: '🌱', rarity: 'common', category: 'rendimiento', condition: JSON.stringify({ type: 'tasks_completed', threshold: 50 }), xpReward: 50, orderIndex: 25 },
  { name: 'Élite', description: 'Completad 250 tareas en total.', icon: '🥇', rarity: 'rare', category: 'rendimiento', condition: JSON.stringify({ type: 'tasks_completed', threshold: 250 }), xpReward: 150, orderIndex: 26 },

  // PAREJA (orderIndex 28-30)
  { name: 'Recién llegados', description: 'Alcanzad el nivel Brote.', icon: '🌿', rarity: 'common', category: 'pareja', condition: JSON.stringify({ type: 'level_reached', threshold: 1 }), xpReward: 30, orderIndex: 28 },
  { name: 'Nido de amor', description: 'Alcanzad el nivel Hogar.', icon: '🏡', rarity: 'epic', category: 'pareja', condition: JSON.stringify({ type: 'level_reached', threshold: 2 }), xpReward: 150, orderIndex: 29 },
  { name: 'Raíces profundas', description: 'Alcanzad el nivel Raíces.', icon: '🌳', rarity: 'legendary', category: 'pareja', condition: JSON.stringify({ type: 'level_reached', threshold: 3 }), xpReward: 300, orderIndex: 30 },

  // SECRETOS (orderIndex 32-35)
  { name: 'Madrugadores', description: 'Completad una tarea antes de las 7am.', icon: '🌅', rarity: 'rare', category: 'secretos', condition: JSON.stringify({ type: 'tasks_completed', threshold: 1 }), xpReward: 100, orderIndex: 32 },
  { name: 'Noctámbulos', description: 'Completad una tarea después de las 11pm.', icon: '🌙', rarity: 'rare', category: 'secretos', condition: JSON.stringify({ type: 'tasks_completed', threshold: 1 }), xpReward: 100, orderIndex: 33 },
  { name: 'El gran acuerdo', description: 'Logro secreto desbloqueado por consenso extraordinario.', icon: '🔮', rarity: 'legendary', category: 'secretos', condition: JSON.stringify({ type: 'negotiations_without_force', threshold: 50 }), xpReward: 300, orderIndex: 34 },
  { name: 'Leyenda viviente', description: 'Logro secreto desbloqueado al alcanzar el nivel más alto.', icon: '✨', rarity: 'legendary', category: 'secretos', condition: JSON.stringify({ type: 'level_reached', threshold: 5 }), xpReward: 300, orderIndex: 35 },
]

async function main() {
  console.log('Seeding AchievementDefinitions...')
  for (const a of achievements) {
    await prisma.achievementDefinition.upsert({
      where: { id: `seed-${a.orderIndex}` },
      update: a,
      create: { id: `seed-${a.orderIndex}`, ...a }
    })
  }
  console.log(`Seeded ${achievements.length} AchievementDefinitions.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
