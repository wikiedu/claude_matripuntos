#!/usr/bin/env node
// Seed script: creates a fully-populated test couple against the prod API.
// Run: node scripts/seed-prod-couple.mjs
//
// What it does:
//  1. Creates a couple via /api/auth/register (two users)
//  2. Logs in both, adds 2 children, creates ~10 recurring tasks
//  3. Generates ~75 days of task logs (alternating users) + partner verifies each
//  4. Generates ~15 events spread across the range + partner accepts each
//
// Output: prints the two sets of credentials + coupleId at the end.

const API = process.env.API_URL ?? 'https://matripuntos-api.onrender.com/api'
const DAYS_BACK = 75  // ~2.5 months
const TASKS_PER_DAY = 3

// ── Test couple identity (timestamp so re-runs don't clash on email-unique) ──
const stamp = Date.now().toString(36).slice(-6)
const USER_A = {
  email:    `test.ana.${stamp}@matripuntos.test`,
  password: 'TestPassword2026!',
  name:     'Ana (test)',
}
const USER_B = {
  email:    `test.bruno.${stamp}@matripuntos.test`,
  password: 'TestPassword2026!',
  name:     'Bruno (test)',
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
async function req(method, path, body, token) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try { data = text ? JSON.parse(text) : {} } catch { data = { raw: text } }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data).slice(0, 200)}`)
  }
  return data
}
const GET  = (p, t)    => req('GET',  p, null, t)
const POST = (p, b, t) => req('POST', p, b,    t)
const PUT  = (p, b, t) => req('PUT',  p, b,    t)

function daysAgoISO(n) {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d.toISOString()
}
function daysAgoDateOnly(n) {
  return daysAgoISO(n).slice(0, 10)
}
function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function chance(p) { return Math.random() < p }

// ── Seed plan ─────────────────────────────────────────────────────────────────
// Tareas tomadas del catálogo real (frontend Tasks.tsx → TASK_CATALOG) para
// que los puntos cuadren con lo que el usuario vería al añadir una tarea
// desde la app. Antes el seed inventaba puntos bajos (1.0, 1.5) que no se
// correspondían con nada y rompía la coherencia frente al catálogo.
const SEED_TASKS = [
  { name: 'Cocinar la cena',              category: 'cocina',     pointsBase: 12 },
  { name: 'Cocinar la comida',            category: 'cocina',     pointsBase: 10 },
  { name: 'Preparar el desayuno',         category: 'cocina',     pointsBase: 6  },
  { name: 'Fregar los platos',            category: 'cocina',     pointsBase: 8  },
  { name: 'Pasar la aspiradora',          category: 'limpieza',   pointsBase: 10 },
  { name: 'Poner la lavadora',            category: 'limpieza',   pointsBase: 6  },
  { name: 'Hacer la compra semanal',      category: 'compra',     pointsBase: 18 },
  { name: 'Llevar/recoger niños al cole', category: 'cuidado',    pointsBase: 8  },
  { name: 'Acostar a los niños',          category: 'cuidado',    pointsBase: 7  },
  { name: 'Sacar a pasear al perro',      category: 'mascotas',   pointsBase: 5  },
]

const SEED_CHILDREN = [
  { name: 'Lucía (test)', dateOfBirth: '2019-06-12' },
  { name: 'Mateo (test)', dateOfBirth: '2022-03-04' },
]

const SEED_EVENTS = [
  { type: 'cena amigos',        pointsBase: 10, dur: 4,  hour: 21 },
  { type: 'boda',               pointsBase: 8,  dur: 10, hour: 17 },
  { type: 'despedida soltero',  pointsBase: 6,  dur: 18, hour: 20 },
  { type: 'gimnasio',           pointsBase: 6,  dur: 1,  hour: 19 },
  { type: 'viaje de trabajo',   pointsBase: 18, dur: 36, hour: 8 },
  { type: 'cine',               pointsBase: 7,  dur: 3,  hour: 20 },
  { type: 'comida familia',     pointsBase: 8,  dur: 3,  hour: 14 },
  { type: 'yoga',               pointsBase: 6,  dur: 1,  hour: 10 },
  { type: 'cumple amigo',       pointsBase: 8,  dur: 5,  hour: 21 },
  { type: 'gestión médica',     pointsBase: 7,  dur: 2,  hour: 11 },
]

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('→ API:', API)
  console.log('→ Registering couple…')
  const reg = await POST('/auth/register', {
    email1: USER_A.email, password1: USER_A.password, name1: USER_A.name,
    email2: USER_B.email, password2: USER_B.password, name2: USER_B.name,
  })
  console.log('   couple created:', reg.coupleId)

  // Login both to get tokens
  const loginA = await POST('/auth/login', { email: USER_A.email, password: USER_A.password })
  const loginB = await POST('/auth/login', { email: USER_B.email, password: USER_B.password })
  const tokenA = loginA.token
  const tokenB = loginB.token
  const uidA = loginA.user.id
  const uidB = loginB.user.id
  console.log('   logged in A:', uidA.slice(0, 8), '· B:', uidB.slice(0, 8))

  // Onboarding flag so they skip the wizard
  try { await PUT('/profile/me', { hasCompletedOnboarding: true }, tokenA) } catch {}
  try { await PUT('/profile/me', { hasCompletedOnboarding: true }, tokenB) } catch {}

  // Add 2 children
  console.log('→ Adding children…')
  for (const c of SEED_CHILDREN) {
    await POST('/children', c, tokenA)
  }

  // Add tasks
  console.log('→ Creating tasks…')
  const createdTasks = []
  for (const t of SEED_TASKS) {
    const r = await POST('/tasks', t, tokenA)
    createdTasks.push(r.task)
  }
  console.log('   created', createdTasks.length, 'tasks')

  // Generate task logs across DAYS_BACK
  console.log(`→ Generating task logs (${DAYS_BACK} days × ~${TASKS_PER_DAY}/day)…`)
  let logCount = 0
  for (let d = DAYS_BACK; d >= 1; d--) {
    const dateISO = daysAgoDateOnly(d)
    const howMany = TASKS_PER_DAY + (chance(0.3) ? 1 : 0) - (chance(0.15) ? 1 : 0)
    const picks = [...createdTasks].sort(() => Math.random() - 0.5).slice(0, Math.max(1, howMany))
    for (const task of picks) {
      const completer = chance(0.52) ? 'A' : 'B'
      const token = completer === 'A' ? tokenA : tokenB
      const verifier = completer === 'A' ? tokenB : tokenA
      const pts = Number(task.pointsBase)
      try {
        const logRes = await POST(`/tasks/${task.id}/log`, {
          date: dateISO,
          pointsBase: pts,
          pointsFinal: pts,
        }, token)
        logCount++
        // Partner verifies (~90% of the time, rest stays pending / disputed)
        if (chance(0.9)) {
          try {
            await PUT(`/tasks/logs/${logRes.taskLog.id}`, { status: 'verified' }, verifier)
          } catch {}
        }
      } catch (err) {
        // Non-fatal — continue seeding
      }
    }
    if (d % 15 === 0) console.log(`   …day -${d} · ${logCount} logs`)
  }
  console.log(`   total task logs: ${logCount}`)

  // Events
  console.log('→ Creating events…')
  let evtCount = 0
  for (let i = 0; i < 15; i++) {
    const daysAgo = Math.floor(Math.random() * DAYS_BACK) + 2
    const proto = rnd(SEED_EVENTS)
    const start = new Date()
    start.setHours(proto.hour, 0, 0, 0)
    start.setDate(start.getDate() - daysAgo)
    const end = new Date(start.getTime() + proto.dur * 3600 * 1000)
    const creator = chance(0.5) ? 'A' : 'B'
    const token = creator === 'A' ? tokenA : tokenB
    const accepter = creator === 'A' ? tokenB : tokenA
    try {
      const evt = await POST('/events', {
        type: proto.type,
        dateStart: start.toISOString(),
        dateEnd:   end.toISOString(),
        numChildren: chance(0.6) ? 2 : chance(0.5) ? 1 : 0,
        pointsBase: proto.pointsBase,
      }, token)
      evtCount++
      // Partner accepts (70% of past events)
      if (chance(0.7)) {
        const eventId = evt.event?.id ?? evt.id
        if (eventId) {
          try { await POST(`/events/${eventId}/accept`, {}, accepter) } catch {}
        }
      }
    } catch (err) {
      // Non-fatal
    }
  }
  console.log(`   total events: ${evtCount}`)

  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ SEED COMPLETE')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('coupleId:', reg.coupleId)
  console.log('')
  console.log('👤 User A (Ana):')
  console.log('   email:    ', USER_A.email)
  console.log('   password: ', USER_A.password)
  console.log('')
  console.log('👤 User B (Bruno):')
  console.log('   email:    ', USER_B.email)
  console.log('   password: ', USER_B.password)
  console.log('')
  console.log('Login at the prod frontend with either account.')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
