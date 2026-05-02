// v1.6.1 — Helper E2E que crea un couple con dos users vía API directa
// (sin pasar por la UI de signup, que es flujo aparte). Devuelve credenciales
// y cookies para los dos browser contexts del test.

import type { APIRequestContext } from '@playwright/test'

export interface E2EUser {
  id: string
  email: string
  password: string
  token: string
  name: string
}

export async function createCouple(
  api: APIRequestContext,
  opts?: { user1Email?: string; user2Email?: string },
): Promise<{ user1: E2EUser; user2: E2EUser; coupleId: string }> {
  const ts = Date.now().toString(36).slice(-6)
  const e1 = opts?.user1Email ?? `e2e-u1-${ts}@x.test`
  const e2 = opts?.user2Email ?? `e2e-u2-${ts}@x.test`
  const password = 'pwd12345'

  const r1 = await api.post('/api/auth/register', {
    data: { email: e1, password, name: 'E2EUser1' },
  })
  const j1: any = await r1.json()

  // user2 entra por joinCode del couple del user1.
  const r2 = await api.post('/api/auth/register', {
    data: { email: e2, password, name: 'E2EUser2', joinCode: j1.couple?.secretKey },
  })
  const j2: any = await r2.json()

  return {
    user1: { id: j1.user.id, email: e1, password, token: j1.token, name: j1.user.name },
    user2: { id: j2.user.id, email: e2, password, token: j2.token, name: j2.user.name },
    coupleId: j1.user.coupleId,
  }
}
