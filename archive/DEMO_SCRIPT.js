#!/usr/bin/env node

/**
 * Matripuntos - Complete API Demo Script
 *
 * This script demonstrates the complete flow:
 * 1. Create couple account (signup)
 * 2. Login for both users
 * 3. Create tasks
 * 4. Create activity request
 * 5. Propose negotiation
 * 6. Respond to negotiation
 * 7. Accept proposal
 */

const BASE_URL = 'http://localhost:3000/api'
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
}

function log(color, ...args) {
  console.log(`${color}${args.join(' ')}${colors.reset}`)
}

async function request(method, endpoint, body = null, token = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return data
  } catch (error) {
    throw new Error(`${method} ${endpoint}: ${error.message}`)
  }
}

async function runDemo() {
  log(colors.cyan, '\n🎬 MATRIPUNTOS - Complete Flow Demo\n')

  try {
    // 1. Signup
    log(colors.yellow, '📝 Step 1: Creating couple account...')
    const signupResponse = await request('POST', '/auth/signup', {
      email1: 'alice@test.com',
      password1: 'password123',
      name1: 'Alice',
      email2: 'bob@test.com',
      password2: 'password123',
      name2: 'Bob',
      language: 'es',
    })
    log(colors.green, `✓ Couple created: ${signupResponse.coupleId}`)
    const coupleId = signupResponse.coupleId
    const userId1 = signupResponse.users[0].id
    const userId2 = signupResponse.users[1].id

    // 2. Login User 1 (Alice)
    log(colors.yellow, '\n📝 Step 2: Alice logging in...')
    const login1 = await request('POST', '/auth/login', {
      email: 'alice@test.com',
      password: 'password123',
    })
    log(colors.green, `✓ Alice logged in: ${login1.user.name}`)
    const token1 = login1.token

    // 3. Login User 2 (Bob)
    log(colors.yellow, '\n📝 Step 3: Bob logging in...')
    const login2 = await request('POST', '/auth/login', {
      email: 'bob@test.com',
      password: 'password123',
    })
    log(colors.green, `✓ Bob logged in: ${login2.user.name}`)
    const token2 = login2.token

    // 4. Get couple data
    log(colors.yellow, '\n📝 Step 4: Fetching couple data...')
    const coupleData = await request('GET', '/auth/couple', null, token1)
    log(colors.green, `✓ Couple data loaded`)
    log(colors.cyan, `  Users: ${coupleData.couple.users.map(u => u.name).join(', ')}`)

    // 5. Create tasks (as Alice)
    log(colors.yellow, '\n📝 Step 5: Creating recurring tasks...')
    const task1 = await request('POST', '/tasks', {
      name: 'Cocina',
      category: 'cocina',
      pointsBase: 2.0,
      isDefault: true,
    }, token1)
    log(colors.green, `✓ Task created: Cocina (${task1.task.pointsBase} pts)`)

    const task2 = await request('POST', '/tasks', {
      name: 'Limpieza',
      category: 'limpieza',
      pointsBase: 1.5,
      isDefault: true,
    }, token1)
    log(colors.green, `✓ Task created: Limpieza (${task2.task.pointsBase} pts)`)

    // 6. Create activity/event (Alice requests dinner)
    log(colors.yellow, '\n📝 Step 6: Alice requesting dinner activity...')
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]

    const event = await request('POST', '/events', {
      type: 'cena',
      title: 'Cena con amigos',
      description: 'Friday night dinner with friends',
      dateStart: `${dateStr}T19:30:00Z`,
      dateEnd: `${dateStr}T23:30:00Z`,
      hasChildren: false,
      numChildren: 0,
      pointsBase: 13.5,
    }, token1)
    log(colors.green, `✓ Activity created: ${event.event.title}`)
    const eventId = event.event.id

    // 7. Propose activity (create negotiation)
    log(colors.yellow, '\n📝 Step 7: Alice proposing 13.5 points...')
    const negotiation = await request('POST', '/negotiations', {
      eventId,
      pointsProposed: 13.5,
      message: 'I want to go to dinner on Friday night',
    }, token1)
    log(colors.green, `✓ Proposal sent (Round ${negotiation.negotiation.roundNumber})`)
    const negotiationId = negotiation.negotiation.id

    // 8. Get negotiations for event
    log(colors.yellow, '\n📝 Step 8: Fetching negotiation history...')
    const negotiations = await request('GET', `/negotiations/event/${eventId}`, null, token2)
    log(colors.green, `✓ Found ${negotiations.negotiations.length} negotiation(s)`)

    // 9. Bob counters with higher points
    log(colors.yellow, '\n📝 Step 9: Bob counter-proposing 15 points...')
    const counter = await request('PUT', `/negotiations/${negotiationId}/respond`, {
      responseType: 'counter_proposed',
      pointsProposed: 15.0,
      message: 'That is quite a lot. What if it were 15 instead?',
    }, token2)
    log(colors.green, `✓ Counter-proposal sent`)

    // 10. Get updated negotiations
    log(colors.yellow, '\n📝 Step 10: Checking negotiation updates...')
    const updatedNegs = await request('GET', `/negotiations/event/${eventId}`, null, token1)
    log(colors.green, `✓ Negotiation rounds: ${updatedNegs.negotiations.length}`)
    updatedNegs.negotiations.forEach((neg, i) => {
      log(colors.cyan, `  Round ${neg.roundNumber}: ${neg.pointsProposed} pts (${neg.responseType || 'awaiting'})`)
    })

    // 11. Alice accepts Bob's counter-proposal
    log(colors.yellow, '\n📝 Step 11: Alice accepting counter-proposal (15 points)...')
    const latestNeg = updatedNegs.negotiations[updatedNegs.negotiations.length - 1]
    const acceptance = await request('PUT', `/negotiations/${latestNeg.id}/respond`, {
      responseType: 'accepted',
    }, token1)
    log(colors.green, `✓ Proposal accepted!`)

    // 12. Get final event state
    log(colors.yellow, '\n📝 Step 12: Fetching final event state...')
    const finalEvent = await request('GET', `/events/${eventId}`, null, token1)
    log(colors.green, `✓ Event status: ${finalEvent.event.status}`)
    log(colors.cyan, `  Final points agreed: ${finalEvent.event.pointsAgreed || finalEvent.event.pointsCalculated} pts`)

    // 13. Get all events
    log(colors.yellow, '\n📝 Step 13: Listing all events...')
    const allEvents = await request('GET', '/events', null, token1)
    log(colors.green, `✓ Total events: ${allEvents.events.length}`)

    log(colors.bright + colors.green, '\n✅ DEMO COMPLETE - All operations successful!\n')

  } catch (error) {
    log(colors.red, `\n❌ Error: ${error.message}\n`)
    process.exit(1)
  }
}

// Run demo
runDemo()
