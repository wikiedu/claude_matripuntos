import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with base categories...')

  // Get all couples (we need to create categories for each)
  const couples = await prisma.couple.findMany()

  for (const couple of couples) {
    console.log(`Seeding categories for couple: ${couple.id}`)

    // ===== EVENTS CATEGORIES =====

    // 🍽️ Gastronomía
    const gastro = await prisma.category.upsert({
      where: { id: `cat_event_gastro_${couple.id}` },
      update: {},
      create: {
        id: `cat_event_gastro_${couple.id}`,
        coupleId: couple.id,
        name: 'Gastronomía',
        emoji: '🍽️',
        type: 'event',
        basePoints: 15,
        description: 'Eventos relacionados con comidas',
        isCustom: false,
        isActive: true,
      },
    })

    await prisma.subcategory.createMany({
      data: [
        { categoryId: gastro.id, name: 'Cena romántica', basePointsModifier: 0 },
        { categoryId: gastro.id, name: 'Cena con amigos', basePointsModifier: -3 },
        { categoryId: gastro.id, name: 'Cena familiar', basePointsModifier: -5 },
        { categoryId: gastro.id, name: 'Copas / after', basePointsModifier: -7 },
        { categoryId: gastro.id, name: 'Brunch / vermut', basePointsModifier: -7 },
        { categoryId: gastro.id, name: 'Celebración especial', basePointsModifier: 5 },
      ],
    })

    // ✈️ Escapadas & Viajes
    const travel = await prisma.category.upsert({
      where: { id: `cat_event_travel_${couple.id}` },
      update: {},
      create: {
        id: `cat_event_travel_${couple.id}`,
        coupleId: couple.id,
        name: 'Escapadas & Viajes',
        emoji: '✈️',
        type: 'event',
        basePoints: 25,
        description: 'Viajes y escapadas de la pareja',
        isCustom: false,
        isActive: true,
      },
    })

    await prisma.subcategory.createMany({
      data: [
        { categoryId: travel.id, name: 'Fin de semana escapada', basePointsModifier: -5 },
        { categoryId: travel.id, name: 'Viaje largo +4 días', basePointsModifier: 10 },
        { categoryId: travel.id, name: 'Viaje de trabajo', basePointsModifier: -10 },
        { categoryId: travel.id, name: 'Día fuera', basePointsModifier: -15 },
      ],
    })

    // 🎭 Ocio & Cultura
    const culture = await prisma.category.upsert({
      where: { id: `cat_event_culture_${couple.id}` },
      update: {},
      create: {
        id: `cat_event_culture_${couple.id}`,
        coupleId: couple.id,
        name: 'Ocio & Cultura',
        emoji: '🎭',
        type: 'event',
        basePoints: 12,
        description: 'Actividades culturales y de ocio',
        isCustom: false,
        isActive: true,
      },
    })

    await prisma.subcategory.createMany({
      data: [
        { categoryId: culture.id, name: 'Concierto / festival', basePointsModifier: 0 },
        { categoryId: culture.id, name: 'Teatro / ópera', basePointsModifier: -2 },
        { categoryId: culture.id, name: 'Cine', basePointsModifier: -4 },
        { categoryId: culture.id, name: 'Exposición / museo', basePointsModifier: -4 },
        { categoryId: culture.id, name: 'Evento deportivo', basePointsModifier: -2 },
      ],
    })

    // 🏋️ Deporte & Bienestar
    const sport = await prisma.category.upsert({
      where: { id: `cat_event_sport_${couple.id}` },
      update: {},
      create: {
        id: `cat_event_sport_${couple.id}`,
        coupleId: couple.id,
        name: 'Deporte & Bienestar',
        emoji: '🏋️',
        type: 'event',
        basePoints: 10,
        description: 'Actividades deportivas y de bienestar',
        isCustom: false,
        isActive: true,
      },
    })

    await prisma.subcategory.createMany({
      data: [
        { categoryId: sport.id, name: 'Gym / fitness', basePointsModifier: -4 },
        { categoryId: sport.id, name: 'Deporte en equipo', basePointsModifier: -2 },
        { categoryId: sport.id, name: 'Running / ciclismo', basePointsModifier: -3 },
        { categoryId: sport.id, name: 'Yoga / pilates', basePointsModifier: -2 },
        { categoryId: sport.id, name: 'Spa / masaje', basePointsModifier: 2 },
      ],
    })

    // 🎮 Ocio Personal
    const leisure = await prisma.category.upsert({
      where: { id: `cat_event_leisure_${couple.id}` },
      update: {},
      create: {
        id: `cat_event_leisure_${couple.id}`,
        coupleId: couple.id,
        name: 'Ocio Personal',
        emoji: '🎮',
        type: 'event',
        basePoints: 8,
        description: 'Tiempo personal y ocio individual',
        isCustom: false,
        isActive: true,
      },
    })

    await prisma.subcategory.createMany({
      data: [
        { categoryId: leisure.id, name: 'Hobby personal', basePointsModifier: -2 },
        { categoryId: leisure.id, name: 'Videojuegos / series', basePointsModifier: -4 },
        { categoryId: leisure.id, name: 'Quedada amigos', basePointsModifier: 0 },
        { categoryId: leisure.id, name: 'Tiempo solo', basePointsModifier: -3 },
      ],
    })

    // 👨‍👩‍👧 Familia & Social
    const family = await prisma.category.upsert({
      where: { id: `cat_event_family_${couple.id}` },
      update: {},
      create: {
        id: `cat_event_family_${couple.id}`,
        coupleId: couple.id,
        name: 'Familia & Social',
        emoji: '👨‍👩‍👧',
        type: 'event',
        basePoints: 12,
        description: 'Eventos familiares y sociales',
        isCustom: false,
        isActive: true,
      },
    })

    await prisma.subcategory.createMany({
      data: [
        { categoryId: family.id, name: 'Reunión mi familia', basePointsModifier: -2 },
        { categoryId: family.id, name: 'Reunión familia pareja', basePointsModifier: 0 },
        { categoryId: family.id, name: 'Cumpleaños / celebración', basePointsModifier: 3 },
        { categoryId: family.id, name: 'Boda / comunión', basePointsModifier: 8 },
        { categoryId: family.id, name: 'Despedida', basePointsModifier: 6 },
      ],
    })

    // 🏢 Trabajo & Obligaciones
    const work = await prisma.category.upsert({
      where: { id: `cat_event_work_${couple.id}` },
      update: {},
      create: {
        id: `cat_event_work_${couple.id}`,
        coupleId: couple.id,
        name: 'Trabajo & Obligaciones',
        emoji: '🏢',
        type: 'event',
        basePoints: 10,
        description: 'Eventos laborales y obligaciones',
        isCustom: false,
        isActive: true,
      },
    })

    await prisma.subcategory.createMany({
      data: [
        { categoryId: work.id, name: 'After work / cena empresa', basePointsModifier: -2 },
        { categoryId: work.id, name: 'Formación / curso', basePointsModifier: 2 },
        { categoryId: work.id, name: 'Viaje de trabajo', basePointsModifier: -5 },
        { categoryId: work.id, name: 'Gestión médica / burocrática', basePointsModifier: -5 },
      ],
    })

    // ===== CHORES CATEGORIES =====

    // 🍳 Cocina
    const kitchen = await prisma.category.upsert({
      where: { id: `cat_chore_kitchen_${couple.id}` },
      update: {},
      create: {
        id: `cat_chore_kitchen_${couple.id}`,
        coupleId: couple.id,
        name: 'Cocina',
        emoji: '🍳',
        type: 'chore',
        basePoints: 8,
        description: 'Tareas de cocina',
        isCustom: false,
        isActive: true,
      },
    })

    await prisma.subcategory.createMany({
      data: [
        { categoryId: kitchen.id, name: 'Cocinar comida', basePointsModifier: 0 },
        { categoryId: kitchen.id, name: 'Lavar platos', basePointsModifier: -2 },
        { categoryId: kitchen.id, name: 'Limpiar cocina', basePointsModifier: -1 },
        { categoryId: kitchen.id, name: 'Hacer compra', basePointsModifier: 1 },
      ],
    })

    // 🛁 Baños
    const bathroom = await prisma.category.upsert({
      where: { id: `cat_chore_bathroom_${couple.id}` },
      update: {},
      create: {
        id: `cat_chore_bathroom_${couple.id}`,
        coupleId: couple.id,
        name: 'Baños',
        emoji: '🛁',
        type: 'chore',
        basePoints: 6,
        description: 'Limpieza de baños',
        isCustom: false,
        isActive: true,
      },
    })

    await prisma.subcategory.createMany({
      data: [
        { categoryId: bathroom.id, name: 'Limpiar baño', basePointsModifier: 0 },
        { categoryId: bathroom.id, name: 'Limpiar WC', basePointsModifier: -1 },
        { categoryId: bathroom.id, name: 'Limpiar ducha', basePointsModifier: -1 },
      ],
    })

    // 🛏️ Dormitorios
    const bedroom = await prisma.category.upsert({
      where: { id: `cat_chore_bedroom_${couple.id}` },
      update: {},
      create: {
        id: `cat_chore_bedroom_${couple.id}`,
        coupleId: couple.id,
        name: 'Dormitorios',
        emoji: '🛏️',
        type: 'chore',
        basePoints: 5,
        description: 'Tareas de dormitorios',
        isCustom: false,
        isActive: true,
      },
    })

    await prisma.subcategory.createMany({
      data: [
        { categoryId: bedroom.id, name: 'Hacer cama', basePointsModifier: -2 },
        { categoryId: bedroom.id, name: 'Limpiar dormitorio', basePointsModifier: 0 },
      ],
    })

    // 🛋️ Salón
    const living = await prisma.category.upsert({
      where: { id: `cat_chore_living_${couple.id}` },
      update: {},
      create: {
        id: `cat_chore_living_${couple.id}`,
        coupleId: couple.id,
        name: 'Salón',
        emoji: '🛋️',
        type: 'chore',
        basePoints: 6,
        description: 'Limpieza de salón',
        isCustom: false,
        isActive: true,
      },
    })

    await prisma.subcategory.createMany({
      data: [
        { categoryId: living.id, name: 'Limpiar salón', basePointsModifier: 0 },
        { categoryId: living.id, name: 'Pasar aspiradora', basePointsModifier: 1 },
        { categoryId: living.id, name: 'Ordenar trastos', basePointsModifier: -1 },
      ],
    })

    // 👕 Ropa
    const laundry = await prisma.category.upsert({
      where: { id: `cat_chore_laundry_${couple.id}` },
      update: {},
      create: {
        id: `cat_chore_laundry_${couple.id}`,
        coupleId: couple.id,
        name: 'Ropa',
        emoji: '👕',
        type: 'chore',
        basePoints: 7,
        description: 'Lavado y planchado',
        isCustom: false,
        isActive: true,
      },
    })

    await prisma.subcategory.createMany({
      data: [
        { categoryId: laundry.id, name: 'Lavar ropa', basePointsModifier: 0 },
        { categoryId: laundry.id, name: 'Tender ropa', basePointsModifier: -1 },
        { categoryId: laundry.id, name: 'Planchar ropa', basePointsModifier: 1 },
        { categoryId: laundry.id, name: 'Doblar ropa', basePointsModifier: -1 },
      ],
    })

    // 🌳 Exterior
    const outdoor = await prisma.category.upsert({
      where: { id: `cat_chore_outdoor_${couple.id}` },
      update: {},
      create: {
        id: `cat_chore_outdoor_${couple.id}`,
        coupleId: couple.id,
        name: 'Exterior',
        emoji: '🌳',
        type: 'chore',
        basePoints: 8,
        description: 'Tareas de exterior y jardín',
        isCustom: false,
        isActive: true,
      },
    })

    await prisma.subcategory.createMany({
      data: [
        { categoryId: outdoor.id, name: 'Regar plantas', basePointsModifier: -1 },
        { categoryId: outdoor.id, name: 'Cortar césped', basePointsModifier: 2 },
        { categoryId: outdoor.id, name: 'Limpiar terraza', basePointsModifier: 1 },
      ],
    })

    // 🏠 Mantenimiento
    const maintenance = await prisma.category.upsert({
      where: { id: `cat_chore_maintenance_${couple.id}` },
      update: {},
      create: {
        id: `cat_chore_maintenance_${couple.id}`,
        coupleId: couple.id,
        name: 'Mantenimiento',
        emoji: '🔧',
        type: 'chore',
        basePoints: 10,
        description: 'Mantenimiento del hogar',
        isCustom: false,
        isActive: true,
      },
    })

    await prisma.subcategory.createMany({
      data: [
        { categoryId: maintenance.id, name: 'Reparaciones', basePointsModifier: 2 },
        { categoryId: maintenance.id, name: 'Cambiar bombillas', basePointsModifier: -2 },
        { categoryId: maintenance.id, name: 'Revisiones técnicas', basePointsModifier: 1 },
      ],
    })
  }

  // ===== ACHIEVEMENTS (FASE 4) =====
  console.log('🏆 Seeding achievements...')

  for (const couple of couples) {
    const achievements = [
      {
        id: `ach_first_event_${couple.id}`,
        coupleId: couple.id,
        type: 'couple',
        name: 'Primer Evento',
        description: 'Acuerda tu primer evento',
        icon: '🎉',
        rarity: 'common',
        condition: JSON.stringify({ type: 'events_accepted', threshold: 1 }),
      },
      {
        id: `ach_five_events_${couple.id}`,
        coupleId: couple.id,
        type: 'couple',
        name: 'Colaborador',
        description: 'Acuerda 5 eventos',
        icon: '👥',
        rarity: 'rare',
        condition: JSON.stringify({ type: 'events_accepted', threshold: 5 }),
      },
      {
        id: `ach_ten_events_${couple.id}`,
        coupleId: couple.id,
        type: 'couple',
        name: 'Maestro de Negociación',
        description: 'Acuerda 10 eventos',
        icon: '🤝',
        rarity: 'epic',
        condition: JSON.stringify({ type: 'events_accepted', threshold: 10 }),
      },
      {
        id: `ach_50_points_${couple.id}`,
        coupleId: couple.id,
        type: 'couple',
        name: 'Acumulador',
        description: 'Gana 50 puntos totales',
        icon: '⭐',
        rarity: 'common',
        condition: JSON.stringify({ type: 'points_earned', threshold: 50 }),
      },
      {
        id: `ach_100_points_${couple.id}`,
        coupleId: couple.id,
        type: 'couple',
        name: 'Campeón de Puntos',
        description: 'Gana 100 puntos totales',
        icon: '🏆',
        rarity: 'rare',
        condition: JSON.stringify({ type: 'points_earned', threshold: 100 }),
      },
      {
        id: `ach_500_points_${couple.id}`,
        coupleId: couple.id,
        type: 'couple',
        name: 'Leyenda',
        description: 'Gana 500 puntos totales',
        icon: '👑',
        rarity: 'legendary',
        condition: JSON.stringify({ type: 'points_earned', threshold: 500 }),
      },
      {
        id: `ach_negotiator_${couple.id}`,
        coupleId: couple.id,
        type: 'couple',
        name: 'Negociador Experto',
        description: 'Participa en 10 negociaciones',
        icon: '💬',
        rarity: 'rare',
        condition: JSON.stringify({ type: 'negotiation_rounds', threshold: 10 }),
      },
      {
        id: `ach_consistent_${couple.id}`,
        coupleId: couple.id,
        type: 'couple',
        name: 'Consistente',
        description: 'Activo 7 días consecutivos',
        icon: '🔥',
        rarity: 'epic',
        condition: JSON.stringify({ type: 'consecutive_days', threshold: 7 }),
      },
    ]

    for (const achievement of achievements) {
      await prisma.achievement.upsert({
        where: { id: achievement.id },
        update: {},
        create: achievement,
      })
    }
  }

  console.log('✅ Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
