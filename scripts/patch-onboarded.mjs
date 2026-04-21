#!/usr/bin/env node
// One-shot patch: log into Ana/Bruno (or any list of users) and flip
// hasCompletedOnboarding=true so they skip the wizard. Use after seeding
// when the seed ran against a backend that didn't yet expose the flag.
//
// Usage: node scripts/patch-onboarded.mjs

const API = process.env.API_URL ?? 'https://matripuntos-api.onrender.com/api'

const USERS = [
  { email: 'test.ana.8veah9@matripuntos.test',   password: 'TestPassword2026!' },
  { email: 'test.bruno.8veah9@matripuntos.test', password: 'TestPassword2026!' },
]

async function patch(user) {
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.password }),
  })
  const login = await loginRes.json()
  if (!loginRes.ok) {
    console.log(`✗ ${user.email}: login failed (${loginRes.status})`, login)
    return
  }
  const token = login.token

  const putRes = await fetch(`${API}/profile/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ hasCompletedOnboarding: true }),
  })
  const text = await putRes.text()
  if (!putRes.ok) {
    console.log(`✗ ${user.email}: PUT failed (${putRes.status})`, text.slice(0, 200))
    return
  }
  console.log(`✓ ${user.email}: hasCompletedOnboarding=true`)
}

for (const u of USERS) {
  await patch(u)
}
