// Core HTTP transport del API client: gestión de tokens (access + refresh),
// rotación refresh-on-401 y el `request()` genérico. Los endpoints por dominio
// viven en los módulos hermanos (auth.ts, tasks.ts, ...) y la fachada pública
// sigue siendo `services/apiClient.ts` (T6 — partición del god-service).

export const API_BASE_URL = (import.meta as any).env.VITE_API_URL ?? (
  (import.meta as any).env.MODE === 'production'
    ? 'https://matripuntos-api.onrender.com/api'
    : 'http://localhost:3000/api'
)

// Simple HTTP client with automatic token management
class HttpClient {
  private token: string | null = null
  private refreshToken: string | null = null
  // v2.7.5 audit 04 S1-6 — refresh-in-flight promise para que múltiples
  // requests concurrentes que reciben 401 compartan UNA sola rotación
  // (evita carrera donde 5 requests en paralelo intentan rotar a la vez,
  // cada uno revocando el refresh del anterior).
  private refreshInFlight: Promise<boolean> | null = null
  // Callback registered by App.tsx to purge Zustand store + React Query cache
  // when a 401 fires. Kept as a callback (not a direct import of useAppStore)
  // to avoid a circular dependency — the store imports apiClient.
  private onUnauthorized: (() => void) | null = null

  setToken(token: string) {
    this.token = token
    localStorage.setItem('auth_token', token)
  }

  // v2.7.5 — store refresh token separado del access. Si el access token
  // se filtra vía XSS, el refresh sigue protegido por su propio flujo
  // (rotación con detección de reuse en backend).
  setRefreshToken(refresh: string) {
    this.refreshToken = refresh
    localStorage.setItem('refresh_token', refresh)
  }

  getRefreshToken(): string | null {
    if (this.refreshToken) return this.refreshToken
    const stored = localStorage.getItem('refresh_token')
    if (stored) this.refreshToken = stored
    return this.refreshToken
  }

  setTokensFromAuthResponse(res: { token?: string; refreshToken?: string }) {
    if (res.token) this.setToken(res.token)
    if (res.refreshToken) this.setRefreshToken(res.refreshToken)
  }

  getToken(): string | null {
    if (this.token) return this.token

    const stored = localStorage.getItem('auth_token')
    if (stored) this.token = stored
    return this.token
  }

  clearToken() {
    this.token = null
    this.refreshToken = null
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
  }

  setOnUnauthorized(cb: (() => void) | null) {
    this.onUnauthorized = cb
  }

  private getHeaders(extra?: Record<string, string>): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    const token = this.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    if (extra) Object.assign(headers, extra)

    return headers
  }

  // v2.7.5 audit 04 S1-6 — intenta rotar el refresh token. Devuelve true
  // si la rotación tuvo éxito (access token actualizado en memoria +
  // localStorage). Compartido entre requests concurrentes via
  // `refreshInFlight` para evitar tormentas de rotación.
  private async tryRefresh(): Promise<boolean> {
    if (this.refreshInFlight) return this.refreshInFlight
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) return false

    this.refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })
        if (!res.ok) return false
        const data = await res.json().catch(() => null)
        if (!data?.accessToken || !data?.refreshToken) return false
        this.setToken(data.accessToken)
        this.setRefreshToken(data.refreshToken)
        return true
      } catch {
        return false
      } finally {
        // Liberamos el lock un tick después para que las próximas requests
        // vean el token nuevo en localStorage.
        setTimeout(() => { this.refreshInFlight = null }, 0)
      }
    })()
    return this.refreshInFlight
  }

  async request(endpoint: string, options: RequestInit = {}, _retried = false): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers as Record<string, string> || {}),
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        // v2.7.5 audit 04 S1-6 — antes de despachar al onUnauthorized
        // (que limpia store + redirige a /login), intentamos rotar con
        // refresh token. Solo si la rotación falla (no hay refresh,
        // refresh expirado, reuse detectado) caemos al flujo legacy.
        // _retried previene loops infinitos: cada request rota como mucho
        // 1 vez, y si el segundo intento también es 401, asumimos sesión
        // muerta de verdad.
        if (!_retried && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
          const ok = await this.tryRefresh()
          if (ok) {
            return this.request(endpoint, options, true)
          }
        }
        // v2.5.4 audit 07 — antes hacíamos `window.location.href = '/login'`
        // que es un FULL RELOAD: pierde cualquier estado en memoria (forms
        // en progreso, mood seleccionado sin guardar, etc). Ahora delegamos
        // toda la responsabilidad al `onUnauthorized` callback registrado
        // por App.tsx, que limpia store + cache y hace navigate via React
        // Router (history.pushState, sin reload). Si la callback no está
        // (caso edge: 401 muy temprano antes del bootstrap de App), no
        // pasa nada — `clearToken` es suficiente para frenar más requests.
        this.clearToken()
        this.onUnauthorized?.()
      }
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      // Si el backend devuelve un error genérico de Zod ("Validation error"),
      // intentamos enriquecerlo con el primer `message` de `details` para que
      // el usuario vea "Password must be at least 8 characters" en vez de un
      // escueto "Validation error" sin contexto.
      const detail = Array.isArray(error.details) && error.details[0]?.message
      const niceMessage = detail
        ? `${error.error}: ${detail}`
        : error.error || `API Error: ${response.statusText}`
      throw new Error(niceMessage)
    }

    return response.json()
  }
}

// Singleton compartido por todos los módulos de dominio: un único interceptor
// JWT/refresh para toda la app (requisito T6 — no duplicar la rotación).
export const http = new HttpClient()
