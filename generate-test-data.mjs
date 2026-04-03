/**
 * Script para generar datos de prueba realistas en Matripuntos
 * Uso: /usr/local/bin/node generate-test-data.mjs
 */

const BASE = 'http://localhost:3000/api'

async function api(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  try {
    return await res.json()
  } catch {
    return {}
  }
}

function daysAgo(n, hour = 12) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  console.log('🚀 Generando datos de prueba para Matripuntos...\n')

  // ── 1. Crear pareja ──
  console.log('👥 Creando pareja (Edu & Ana)...')
  let u1Token, u2Token, u1Id, u2Id

  // Try to login first
  const tryLogin1 = await api('POST', '/auth/login', { email: 'edu@matri.test', password: 'test1234' })
  const tryLogin2 = await api('POST', '/auth/login', { email: 'ana@matri.test', password: 'test1234' })

  if (tryLogin1.token && tryLogin2.token) {
    u1Token = tryLogin1.token
    u2Token = tryLogin2.token
    u1Id = tryLogin1.user?.id
    u2Id = tryLogin2.user?.id
    console.log('ℹ️  Pareja ya existe, usando usuarios existentes')
  } else {
    // Create new couple
    const signup = await api('POST', '/auth/signup', {
      name1: 'Edu',
      email1: 'edu@matri.test',
      password1: 'test1234',
      name2: 'Ana',
      email2: 'ana@matri.test',
      password2: 'test1234',
      language: 'es',
    })

    if (signup.error) {
      console.error('❌ Error creando pareja:', signup)
      process.exit(1)
    }

    // Login both
    const login1 = await api('POST', '/auth/login', { email: 'edu@matri.test', password: 'test1234' })
    const login2 = await api('POST', '/auth/login', { email: 'ana@matri.test', password: 'test1234' })

    u1Token = login1.token
    u2Token = login2.token
    u1Id = login1.user?.id
    u2Id = login2.user?.id

    if (!u1Token || !u2Token) {
      console.error('❌ No se pudo iniciar sesión:', { login1, login2 })
      process.exit(1)
    }
    console.log('✅ Pareja creada correctamente')
  }

  const me = await api('GET', '/auth/me', null, u1Token)
  console.log(`\n   Edu (User 1): ${u1Id || me.user?.id}`)
  console.log(`   Ana (User 2): ${u2Id}`)
  console.log(`   Couple: ${me.couple?.id || me.user?.coupleId}\n`)

  // ── 2. Crear tareas del hogar ──
  console.log('🏠 Creando tareas...')
  const TASKS = [
    { name: 'Cocinar la cena', category: 'cocina', pointsBase: 12, description: 'Preparar la cena para los dos' },
    { name: 'Fregar los platos', category: 'cocina', pointsBase: 8 },
    { name: 'Hacer la compra semanal', category: 'compra', pointsBase: 18, description: 'Supermercado grande semanal' },
    { name: 'Pasar la aspiradora', category: 'limpieza', pointsBase: 10 },
    { name: 'Fregar el suelo', category: 'limpieza', pointsBase: 12 },
    { name: 'Poner la lavadora', category: 'limpieza', pointsBase: 6 },
    { name: 'Tender la ropa', category: 'limpieza', pointsBase: 6 },
    { name: 'Limpiar baño completo', category: 'baños', pointsBase: 15 },
    { name: 'Sacar la basura', category: 'logistica', pointsBase: 5 },
    { name: 'Vaciar el lavavajillas', category: 'cocina', pointsBase: 5 },
  ]

  const taskIds = []
  for (const t of TASKS) {
    const res = await api('POST', '/tasks', t, u1Token)
    if (res.task?.id) {
      taskIds.push(res.task.id)
      process.stdout.write('.')
    } else if (res.error?.includes('already') || res.error?.includes('unique')) {
      // Task might already exist — skip
      process.stdout.write('s')
    } else {
      process.stdout.write('?')
    }
  }
  console.log(`\n✅ ${taskIds.length} tareas creadas\n`)

  // ── 3. Registrar logs de tareas (historial últimas 8 semanas) ──
  if (taskIds.length > 0) {
    console.log('📝 Generando historial de tareas...')
    const EDU_TASK_DAYS   = [56, 54, 51, 49, 47, 45, 43, 41, 39, 37, 35, 33, 31, 29, 27, 25, 23, 21, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1]
    const ANA_TASK_DAYS   = [57, 55, 52, 50, 48, 46, 44, 42, 40, 38, 36, 34, 32, 30, 28, 26, 24, 22, 20, 18, 16, 14, 12, 10, 8, 6, 4, 2]

    let logCount = 0
    // Edu's task logs
    for (const day of EDU_TASK_DAYS) {
      const numTasks = Math.floor(Math.random() * 3) + 2 // 2-4 tasks per day
      const todayTasks = taskIds.sort(() => Math.random() - 0.5).slice(0, numTasks)
      for (const taskId of todayTasks) {
        const base = [6, 8, 10, 12, 15, 18][Math.floor(Math.random() * 6)]
        const modVal = [1.0, 1.0, 1.0, 1.3, 0.7][Math.floor(Math.random() * 5)]
        const final = Math.round(base * modVal)
        const r = await api('POST', `/tasks/${taskId}/log`, {
          taskId,
          date: daysAgo(day, [8, 9, 12, 17, 19, 20][Math.floor(Math.random() * 6)]),
          pointsBase: base,
          modifierValue: modVal,
          pointsFinal: final,
        }, u1Token)
        if (r.taskLog?.id || r.message) logCount++
      }
    }

    // Ana's task logs (if we have u2Token)
    if (u2Token) {
      for (const day of ANA_TASK_DAYS) {
        const numTasks = Math.floor(Math.random() * 3) + 1
        const todayTasks = taskIds.sort(() => Math.random() - 0.5).slice(0, numTasks)
        for (const taskId of todayTasks) {
          const base = [5, 8, 10, 12, 15][Math.floor(Math.random() * 5)]
          const modVal = [1.0, 1.0, 1.3][Math.floor(Math.random() * 3)]
          const final = Math.round(base * modVal)
          await api('POST', `/tasks/${taskId}/log`, {
            taskId,
            date: daysAgo(day, [7, 10, 13, 18, 20][Math.floor(Math.random() * 5)]),
            pointsBase: base,
            modifierValue: modVal,
            pointsFinal: final,
          }, u2Token)
          logCount++
        }
      }
    }
    console.log(`✅ ${logCount} registros de tareas generados\n`)
  }

  // ── 4. Crear eventos y negociar ──
  console.log('🎭 Creando actividades y aprobándolas...')

  const EVENTS_EDU = [
    { title: '🍽️ Cena con amigos', type: 'gastronomia', points: 14, daysBack: 55, hour: 21 },
    { title: '🎬 Cine tarde', type: 'ocio_cultura', points: 10, daysBack: 50, hour: 17 },
    { title: '🏋️ Gym mañana', type: 'deporte', points: 9, daysBack: 48, hour: 8 },
    { title: '🎉 Cumpleaños de Pablo', type: 'social', points: 22, daysBack: 45, hour: 20 },
    { title: '✈️ Fin de semana en Barcelona', type: 'escapadas', points: 38, daysBack: 40, hour: 9 },
    { title: '🍽️ Brunch con el trabajo', type: 'gastronomia', points: 13, daysBack: 35, hour: 11 },
    { title: '🚴 Ruta en bici por la montaña', type: 'deporte', points: 11, daysBack: 30, hour: 9 },
    { title: '🎮 Tarde de videojuegos', type: 'ocio_personal', points: 7, daysBack: 25, hour: 16 },
    { title: '🎭 Teatro con los amigos', type: 'ocio_cultura', points: 16, daysBack: 22, hour: 20 },
    { title: '🏊 Piscina mañanera', type: 'deporte', points: 9, daysBack: 15, hour: 7 },
    { title: '🌴 Día en la playa', type: 'escapadas', points: 18, daysBack: 12, hour: 10 },
    { title: '🥂 Boda de Carlos y Lucía', type: 'social', points: 45, daysBack: 8, hour: 13 },
    { title: '🏛️ Exposición de Picasso', type: 'ocio_cultura', points: 10, daysBack: 5, hour: 11 },
    { title: '🎾 Pádel con el trabajo', type: 'deporte', points: 10, daysBack: 3, hour: 19 },
  ]

  const EVENTS_ANA = [
    { title: '💆 Spa con amigas', type: 'deporte', points: 20, daysBack: 53, hour: 11 },
    { title: '🛍️ Shopping con María', type: 'ocio_personal', points: 8, daysBack: 47, hour: 12 },
    { title: '🎉 Despedida de Sofía', type: 'social', points: 25, daysBack: 42, hour: 21 },
    { title: '🍽️ Cena familiar', type: 'gastronomia', points: 12, daysBack: 38, hour: 21 },
    { title: '🎬 Cine con mamá', type: 'ocio_cultura', points: 10, daysBack: 32, hour: 17 },
    { title: '🏃 Running por el parque', type: 'deporte', points: 8, daysBack: 27, hour: 8 },
    { title: '🎉 Cena de empresa', type: 'social', points: 18, daysBack: 20, hour: 21 },
    { title: '🧘 Yoga intensivo', type: 'deporte', points: 9, daysBack: 14, hour: 10 },
    { title: '🛍️ Compras cumpleaños mamá', type: 'ocio_personal', points: 7, daysBack: 7, hour: 17 },
    { title: '🍽️ Brunch con amigas', type: 'gastronomia', points: 13, daysBack: 2, hour: 11 },
  ]

  let eventCount = 0

  for (const ev of EVENTS_EDU) {
    const dateStart = daysAgo(ev.daysBack, ev.hour)
    const dateEnd = new Date(new Date(dateStart).getTime() + 3 * 60 * 60 * 1000).toISOString()

    // Create event as Edu
    const evRes = await api('POST', '/events', {
      type: ev.type,
      title: ev.title,
      description: `Actividad personal de Edu`,
      dateStart,
      dateEnd,
      hasChildren: false,
      numChildren: 0,
      pointsBase: ev.points,
      compensationDiscount: 1.0,
    }, u1Token)

    if (!evRes.event?.id) continue
    const evId = evRes.event.id

    // Start negotiation (propose)
    const negRes = await api('POST', '/negotiations', {
      eventId: evId,
      pointsProposed: ev.points,
      message: `Propongo ${ev.title}`,
    }, u1Token)

    if (!negRes.negotiation?.id) continue
    const negId = negRes.negotiation.id

    // Accept from Ana (u2Token)
    if (u2Token) {
      await api('PUT', `/negotiations/${negId}/respond`, {
        responseType: 'accepted',
        message: '¡De acuerdo!',
      }, u2Token)
    }

    eventCount++
    process.stdout.write('.')
    await sleep(50) // small delay to avoid overwhelming the server
  }

  // Ana's events (proposed by Ana, accepted by Edu)
  if (u2Token) {
    for (const ev of EVENTS_ANA) {
      const dateStart = daysAgo(ev.daysBack, ev.hour)
      const dateEnd = new Date(new Date(dateStart).getTime() + 2.5 * 60 * 60 * 1000).toISOString()

      const evRes = await api('POST', '/events', {
        type: ev.type,
        title: ev.title,
        description: `Actividad personal de Ana`,
        dateStart,
        dateEnd,
        hasChildren: false,
        numChildren: 0,
        pointsBase: ev.points,
        compensationDiscount: 1.0,
      }, u2Token)

      if (!evRes.event?.id) continue
      const evId = evRes.event.id

      const negRes = await api('POST', '/negotiations', {
        eventId: evId,
        pointsProposed: ev.points,
        message: `Quiero hacer: ${ev.title}`,
      }, u2Token)

      if (!negRes.negotiation?.id) continue
      const negId = negRes.negotiation.id

      // Accept from Edu
      await api('PUT', `/negotiations/${negId}/respond`, {
        responseType: 'accepted',
        message: '¡Claro que sí!',
      }, u1Token)

      eventCount++
      process.stdout.write('.')
      await sleep(50)
    }
  }

  console.log(`\n✅ ${eventCount} actividades creadas y aprobadas\n`)

  // ── Resumen final ──
  console.log('═'.repeat(55))
  console.log('✨  DATOS DE PRUEBA GENERADOS CORRECTAMENTE')
  console.log('═'.repeat(55))
  console.log(`
📧 Usuario 1 — Edu:  edu@matri.test
📧 Usuario 2 — Ana:  ana@matri.test
🔑 Contraseña:       test1234

👉 Abre http://localhost:5173 e inicia sesión
`)
}

main().catch(err => {
  console.error('\n❌ Error:', err)
  process.exit(1)
})
