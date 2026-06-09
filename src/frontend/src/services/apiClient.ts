import type { GamificationStatus, AchievementMapNode, RuleProposal, ShoppingData, ShoppingItem, ShoppingList, Todo, TodosData, TaskSchedule, Task } from '../types/index'

const API_BASE_URL = (import.meta as any).env.VITE_API_URL ?? (
  (import.meta as any).env.MODE === 'production'
    ? 'https://matripuntos-api.onrender.com/api'
    : 'http://localhost:3000/api'
)

// Simple API client with automatic token management
class ApiClient {
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

  // Auth endpoints
  auth = {
    signup: (data: {
      email1: string
      password1: string
      name1: string
      email2: string
      password2: string
      name2: string
    }) =>
      this.request('/auth/signup', {
        method: 'POST',
        headers: { 'X-Want-Refresh': '1' }, // #9 — signup también opta a rotación
        body: JSON.stringify(data),
      }),

    // v2.7.5 audit 04 S1-6 — `X-Want-Refresh: 1` opt-in: el backend
     // responde con `refreshToken` además del access JWT. Si en el futuro
     // se reduce el TTL del access a 15m, ya tenemos rotación lista.
    login: (email: string, password: string) =>
      this.request('/auth/login', {
        method: 'POST',
        headers: { 'X-Want-Refresh': '1' },
        body: JSON.stringify({ email, password }),
      }),

    // v2.7.5 — revoca todos los refresh tokens activos del user.
    logout: () =>
      this.request('/auth/logout', { method: 'POST' }),

    demoAvailable: () => this.request('/auth/demo-available'),
    demoLogin: () => this.request('/auth/demo-login', { method: 'POST' }),

    getMe: () => this.request('/auth/me'),

    getCouple: () => this.request('/auth/couple'),

    invite: (toEmail: string) =>
      this.request('/auth/invite', { method: 'POST', body: JSON.stringify({ toEmail }) }),

    acceptInvite: (token: string, email: string, password: string, name: string) =>
      this.request('/auth/accept-invite', { method: 'POST', headers: { 'X-Want-Refresh': '1' }, body: JSON.stringify({ token, email, password, name }) }),

    rejectInvite: (token: string) =>
      this.request('/auth/reject-invite', { method: 'POST', body: JSON.stringify({ token }) }),

    proposePartner: (partnerEmail: string) =>
      this.request('/auth/propose-partner', { method: 'POST', body: JSON.stringify({ partnerEmail }) }),

    acceptProposal: (invitationId: string) =>
      this.request('/auth/accept-proposal', { method: 'POST', body: JSON.stringify({ invitationId }) }),

    rejectProposal: (invitationId: string) =>
      this.request('/auth/reject-proposal', { method: 'POST', body: JSON.stringify({ invitationId }) }),

    getPendingProposals: () =>
      this.request('/auth/proposals', { method: 'GET' }),

    // Preview pública de una pareja por joinCode. No requiere auth.
    previewCouple: (code: string) =>
      this.request(`/auth/couple-preview/${encodeURIComponent(code)}`),

    registerWithCode: (data: {
      email: string
      password: string
      name: string
      joinCode: string
      language?: string
      ageConfirmed?: true
    }) =>
      this.request('/auth/register-with-code', {
        method: 'POST',
        headers: { 'X-Want-Refresh': '1' },
        body: JSON.stringify(data),
      }),
  }

  // Event endpoints
  events = {
    create: (data: {
      type: string
      title?: string
      description?: string
      dateStart: string
      dateEnd: string
      hasChildren?: boolean
      numChildren?: number
      pointsBase: number
      compensation?: string
      compensationDiscount?: number
    }) =>
      this.request('/events', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getAll: (status?: string) => {
      const query = status ? `?status=${status}` : ''
      return this.request(`/events${query}`)
    },

    getById: (id: string) => this.request(`/events/${id}`),

    update: (id: string, data: Record<string, any>) =>
      this.request(`/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      this.request(`/events/${id}`, { method: 'DELETE' }),
  }

  // Task endpoints
  tasks = {
    create: (data: {
      name: string
      description?: string
      category: string
      pointsBase?: number
      isDefault?: boolean
      defaultAssigneeId?: string | null
    }) =>
      this.request('/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getAll: () => this.request('/tasks'),

    logCompletion: (taskId: string, data: {
      date: string
      pointsBase: number
      modifier?: 'none' | 'extra' | 'partial' | 'profunda' | 'complicada' | 'visita'
      notes?: string
    }) =>
      this.request(`/tasks/${taskId}/log`, {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          // Backend expects YYYY-MM-DD (z.string().min(1))
          date: data.date.includes('T') ? data.date.split('T')[0] : data.date,
        }),
      }),

    getLogs: (taskId: string, startDate?: string, endDate?: string) => {
      const query = startDate && endDate
        ? `?startDate=${startDate}&endDate=${endDate}`
        : ''
      return this.request(`/tasks/${taskId}/logs${query}`)
    },

    getAllLogs: (status?: string) => {
      const query = status ? `?status=${status}` : ''
      return this.request(`/tasks/all-logs${query}`)
    },

    verifyLog: (taskId: string, logId: string) =>
      this.request(`/tasks/${taskId}/logs/${logId}/verify`, {
        method: 'PUT',
      }),

    disputeLog: (taskId: string, logId: string, data: {
      status?: string
      verifiedBy?: string
      disputeReason?: string
      pointsDisputed?: number
    }) =>
      this.request(`/tasks/${taskId}/logs/${logId}/dispute`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    schedule: (id: string, data: TaskSchedule): Promise<Task> =>
      this.request(`/tasks/${id}/schedule`, { method: 'POST', body: JSON.stringify(data) }),

    getWeeklyLogs: (from: string, to: string): Promise<any[]> =>
      this.request(`/tasks/logs?view=week&from=${from}&to=${to}`),

    delete: (id: string) => this.request(`/tasks/${id}`, { method: 'DELETE' }),

    // Módulo Recurrentes (Paso 2 Módulo Tareas 2.0)
    getRecurring: () => this.request('/tasks/recurring'),
    pause: (id: string) => this.request(`/tasks/${id}/pause`, { method: 'POST' }),
    resume: (id: string) => this.request(`/tasks/${id}/resume`, { method: 'POST' }),
  }

  // Negotiation endpoints
  negotiations = {
    create: (data: {
      eventId: string
      pointsProposed: number
      message?: string
    }) =>
      this.request('/negotiations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    respond: (negotiationId: string, data: {
      responseType: 'accepted' | 'rejected' | 'counter_proposed'
      pointsProposed?: number
      message?: string
    }) =>
      this.request(`/negotiations/${negotiationId}/respond`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    getByEvent: (eventId: string) =>
      this.request(`/negotiations/event/${eventId}`),

    force: (negotiationId: string) =>
      this.request(`/negotiations/${negotiationId}/force`, {
        method: 'POST',
      }),
  }

  // Points endpoints
  points = {
    getHistory: (filters?: {
      startDate?: string
      endDate?: string
      type?: string
      userId?: string
      limit?: number
      offset?: number
    }) => {
      const params = new URLSearchParams()
      if (filters?.startDate) params.append('startDate', filters.startDate)
      if (filters?.endDate) params.append('endDate', filters.endDate)
      if (filters?.type) params.append('type', filters.type)
      if (filters?.userId) params.append('userId', filters.userId)
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.offset) params.append('offset', filters.offset.toString())

      const query = params.toString() ? `?${params.toString()}` : ''
      return this.request(`/points/history${query}`)
    },

    getChartData: (days = 30) => this.request(`/points/chart-data?days=${days}`),

    getBalance: () => this.request('/points/balance'),

    getStats: () => this.request('/points/stats'),

    getTransaction: (id: string) => this.request(`/points/transactions/${id}`),

    requestReset: () =>
      this.request('/points/reset-request', { method: 'POST' }),

    confirmReset: () =>
      this.request('/points/reset-confirm', { method: 'POST' }),
  }

  // Configuration endpoints
  configuration = {
    get: () => this.request('/configuration'),

    update: (data: {
      tasksConfig?: { [key: string]: number }
      multipliersConfig?: any
      activityTypes?: any
    }) =>
      this.request('/configuration', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    reset: () =>
      this.request('/configuration/reset', {
        method: 'POST',
      }),
  }

  // Notification endpoints
  notifications = {
    getAll: (filters?: {
      limit?: number
      offset?: number
      unreadOnly?: boolean
    }) => {
      const params = new URLSearchParams()
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.offset) params.append('offset', filters.offset.toString())
      if (filters?.unreadOnly) params.append('unreadOnly', 'true')

      const query = params.toString() ? `?${params.toString()}` : ''
      return this.request(`/notifications${query}`)
    },

    getUnreadCount: () => this.request('/notifications/unread-count'),

    markAsRead: (id: string) =>
      this.request(`/notifications/${id}/read`, {
        method: 'PUT',
      }),

    markAllAsRead: () =>
      this.request('/notifications/read-all', {
        method: 'PUT',
      }),

    delete: (id: string) =>
      this.request(`/notifications/${id}`, {
        method: 'DELETE',
      }),

    deleteAll: () =>
      this.request('/notifications', {
        method: 'DELETE',
      }),
  }

  // Profile endpoints (V2)
  profile = {
    completeUserProfile: (data: any) =>
      this.request('/profile/user', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getUserProfile: (userId: string) =>
      this.request(`/profile/user/${userId}`),

    createCoupleProfile: (data: any) =>
      this.request('/profile/couple', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getCoupleProfile: () =>
      this.request('/profile/couple'),

    updateMe: (data: {
      avatarEmoji?: string
      avatarColor?: string
      theme?: string
      currentMood?: string
      hasCompletedOnboarding?: boolean
      weeklyWorkHours?: number
      workMode?: 'presencial' | 'remoto' | 'hibrido'
    }) =>
      this.request('/profile/me', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  }

  // Family endpoints (V2)
  family = {
    addChild: (data: any) =>
      this.request('/children', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getChildren: () =>
      this.request('/children'),

    updateChild: (childId: string, data: any) =>
      this.request(`/children/${childId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteChild: (childId: string) =>
      this.request(`/children/${childId}`, {
        method: 'DELETE',
      }),

    addPet: (data: any) =>
      this.request('/pets', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getPets: () =>
      this.request('/pets'),

    updatePet: (petId: string, data: any) =>
      this.request(`/pets/${petId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deletePet: (petId: string) =>
      this.request(`/pets/${petId}`, {
        method: 'DELETE',
      }),
  }

  // Invitation endpoints (V2)
  invitations = {
    invitePartner: (data: { inviteeEmail: string }) =>
      this.request('/auth/invite-partner', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    linkPartner: (data: { partnerEmail: string }) =>
      this.request('/auth/link-partner', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    validateToken: (token: string) =>
      this.request(`/auth/invitation/${token}`),

    acceptInvitation: (token: string) =>
      this.request('/auth/accept-invitation', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),

    registerWithInvitation: (data: any) =>
      this.request('/auth/register-with-invitation', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    pendingLinkRequests: () =>
      this.request('/auth/pending-link-requests'),

    acceptLinkPartner: (invitationId: string) =>
      this.request('/auth/accept-link-partner', {
        method: 'POST',
        body: JSON.stringify({ invitationId }),
      }),

    rejectLinkPartner: (invitationId: string) =>
      this.request('/auth/reject-link-partner', {
        method: 'POST',
        body: JSON.stringify({ invitationId }),
      }),
  }

  // Category endpoints (V2)
  categories = {
    getAll: () =>
      this.request('/categories'),

    getDefault: () =>
      this.request('/categories/default'),

    getCategory: (categoryId: string) =>
      this.request(`/categories/${categoryId}`),

    create: (data: any) =>
      this.request('/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (categoryId: string, data: any) =>
      this.request(`/categories/${categoryId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (categoryId: string) =>
      this.request(`/categories/${categoryId}`, {
        method: 'DELETE',
      }),

    addSubcategory: (categoryId: string, data: any) =>
      this.request(`/categories/${categoryId}/subcategories`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    propose: (data: {
      name: string
      emoji?: string
      type?: string
      basePoints?: number
      proposerComment?: string
    }): Promise<RuleProposal> =>
      this.request('/categories/propose', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    proposeChange: (categoryId: string, data: {
      name?: string
      emoji?: string
      basePoints?: number
      isActive?: boolean
      proposerComment?: string
    }): Promise<RuleProposal> =>
      this.request(`/categories/${categoryId}/propose-change`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  }

  // Points V2 endpoints
  pointsV2 = {
    calculateBreakdown: (eventId: string) =>
      this.request('/points/calculate', {
        method: 'POST',
        body: JSON.stringify({ eventId }),
      }),

    recalculate: (eventId: string) =>
      this.request(`/points/recalculate/${eventId}`, {
        method: 'POST',
      }),

    getCategoryPoints: (categoryId: string) =>
      this.request(`/points/category/${categoryId}`),
  }

  // Negotiation endpoints (V2 - PHASE 3)
  negotiation = {
    proposeEvent: (eventId: string, message?: string) =>
      this.request(`/events/${eventId}/propose`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),

    respondToProposal: (eventId: string, action: 'accept' | 'reject' | 'counter_propose' | 'pending_conversation', pointsProposed?: number, message?: string) =>
      this.request(`/events/${eventId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action, pointsProposed, message }),
      }),

    getNegotiationStatus: (eventId: string) =>
      this.request(`/events/${eventId}/negotiation`),

    getNegotiationHistory: (eventId: string) =>
      this.request(`/events/${eventId}/negotiation/history`),

    getPendingNegotiations: () =>
      this.request('/events/user/pending'),
  }

  // Gamification endpoints (V2 - FASE 4)
  gamification = {
    getStatus: (): Promise<GamificationStatus> =>
      this.request('/gamification/status'),

    getAllAchievements: () =>
      this.request('/achievements'),

    getUserAchievements: () =>
      this.request('/achievements/user/my-achievements'),

    checkAchievements: () =>
      this.request('/achievements/check', {
        method: 'POST',
      }),

    getCoupleStats: () =>
      this.request('/achievements/couple/stats'),

    getCoupleScore: () =>
      this.request('/achievements/couple/score'),

    getLeaderboard: (limit: number = 10) =>
      this.request(`/achievements/leaderboard?limit=${limit}`),

    getWeeklySummary: () =>
      this.request('/achievements/weekly-summary'),
  }

  // Achievements map endpoints (v1.2)
  achievements = {
    getMap: (): Promise<AchievementMapNode[]> =>
      this.request('/achievements/map'),
  }

  // Rules endpoints (v1.2)
  rules = {
    getAll: (): Promise<{ rules: any[]; proposals: RuleProposal[] }> =>
      this.request('/rules'),

    propose: (data: {
      type: 'rule' | 'category' | 'category_edit'
      payload: string
      proposerComment?: string
    }): Promise<RuleProposal> =>
      this.request('/rules/propose', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    respond: (id: string, data: {
      status: 'accepted' | 'rejected'
      responderComment?: string
    }): Promise<RuleProposal> =>
      this.request(`/rules/${id}/respond`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  }

  // Calendar endpoints (FASE 5)
  calendar = {
    getMonth: (year: number, month: number) =>
      this.request(`/calendar/month/${year}/${month}`),

    getWeek: (year: number, week: number) =>
      this.request(`/calendar/week/${year}/${week}`),

    getDay: (date: string) =>
      this.request(`/calendar/day/${date}`),

    getUpcoming: () =>
      this.request('/calendar/upcoming'),

    getSpecialDates: () =>
      this.request('/calendar/special-dates'),

    createEntry: (data: any) =>
      this.request('/calendar/entry', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateEntry: (entryId: string, data: any) =>
      this.request(`/calendar/entry/${entryId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteEntry: (entryId: string) =>
      this.request(`/calendar/entry/${entryId}`, {
        method: 'DELETE',
      }),

    getByType: (type: string, startDate?: string, endDate?: string) =>
      this.request(`/calendar/by-type/${type}${startDate ? `?startDate=${startDate}&endDate=${endDate}` : ''}`),
  }

  // Analytics endpoints (FASE 6)
  analytics = {
    getCouple: (startDate: string, endDate: string) =>
      this.request(`/analytics/couple?startDate=${startDate}&endDate=${endDate}`),

    getUsers: (startDate: string, endDate: string) =>
      this.request(`/analytics/users?startDate=${startDate}&endDate=${endDate}`),

    getDailyActivity: (startDate: string, endDate: string) =>
      this.request(`/analytics/daily-activity?startDate=${startDate}&endDate=${endDate}`),

    getNegotiations: (startDate: string, endDate: string) =>
      this.request(`/analytics/negotiations?startDate=${startDate}&endDate=${endDate}`),

    getPointsByCategory: (startDate: string, endDate: string) =>
      this.request(`/analytics/points-by-category?startDate=${startDate}&endDate=${endDate}`),

    getWeeklyTrends: (weeks?: number) =>
      this.request(`/analytics/weekly-trends${weeks ? `?weeks=${weeks}` : ''}`),

    getDailyBreakdown: (startDate: string, endDate: string) =>
      this.request(`/analytics/daily-breakdown?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`),

    getMonthly: (year: number, month: number) =>
      this.request(`/analytics/monthly/${year}/${month}`),

    getYearly: (year: number) =>
      this.request(`/analytics/yearly/${year}`),
  }

  // Shopping list endpoints (v1.3)
  shopping = {
    getAll: (): Promise<ShoppingData> =>
      this.request('/shopping'),

    addItem: (text: string): Promise<ShoppingItem> =>
      this.request('/shopping/items', { method: 'POST', body: JSON.stringify({ text }) }),

    updateItem: (id: string, data: { isChecked?: boolean; text?: string }): Promise<ShoppingItem> =>
      this.request(`/shopping/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    deleteItem: (id: string): Promise<void> =>
      this.request(`/shopping/items/${id}`, { method: 'DELETE' }),

    archive: (): Promise<ShoppingList> =>
      this.request('/shopping/archive', { method: 'POST' }),
  }

  // To-dos endpoints (v1.3)
  todos = {
    getAll: (): Promise<TodosData> =>
      this.request('/todos'),

    create: (data: { text: string; dueDate?: string; isShared?: boolean }): Promise<Todo> =>
      this.request('/todos', { method: 'POST', body: JSON.stringify(data) }),

    update: (id: string, data: { text?: string; isCompleted?: boolean; dueDate?: string | null; isShared?: boolean }): Promise<Todo> =>
      this.request(`/todos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    delete: (id: string): Promise<void> =>
      this.request(`/todos/${id}`, { method: 'DELETE' }),
  }
}

export const apiClient = new ApiClient()

// v1.6 — Mood history del user autenticado
export interface MoodHistoryEntry {
  date: string  // YYYY-MM-DD en TZ pedida
  moodKey: string | null
  emoji?: string
  label?: string
}
export interface MoodHistoryResponse {
  tz: string
  days: number
  history: MoodHistoryEntry[]
}

export const getMoodHistory = (
  days = 7,
  tz: string = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid',
): Promise<MoodHistoryResponse> =>
  apiClient.request(`/profile/mood-history?days=${days}&tz=${encodeURIComponent(tz)}`)

/**
 * Fetch the 5 most recent activities for the user's couple.
 * @returns {Promise<any>} The recent activity data
 * @throws {Error} If the request fails
 */
export const fetchRecentActivity = () =>
  apiClient.request('/recent-activity')

/**
 * Fetch all pending task logs for the user's couple.
 * @returns {Promise<TaskPendingLog[]>} API response with logs array and taskId included
 * @throws {Error} If the request fails
 */
export const fetchPendingTaskLogs = async (): Promise<import('../types/activity').TaskPendingLog[]> => {
  const result = await apiClient.tasks.getAllLogs('pending')
  return (result.logs ?? []) as import('../types/activity').TaskPendingLog[]
}

/**
 * Verify a task log by ID.
 * @param {string} taskLogId - The ID of the task log to verify
 * @param {string} taskId - The ID of the task (parent entity)
 * @returns {Promise<any>} The verified task log data
 * @throws {Error} If the request fails
 */
export const verifyTaskLog = (taskLogId: string, taskId?: string) => {
  // If taskId is provided, use it directly
  if (taskId) {
    return apiClient.request(`/tasks/${taskId}/logs/${taskLogId}/verify`, {
      method: 'PUT',
    })
  }
  // Otherwise, we'll need to fetch it - this is handled in the component
  throw new Error('taskId is required for verifyTaskLog')
}

/**
 * Reject/dispute a task log by ID.
 * @param {string} taskLogId - The ID of the task log to reject
 * @param {string} taskId - The ID of the task (parent entity)
 * @returns {Promise<any>} The disputed task log data
 * @throws {Error} If the request fails
 */
export const rejectTaskLog = (taskLogId: string, taskId?: string) => {
  // If taskId is provided, use it directly
  if (taskId) {
    return apiClient.request(`/tasks/${taskId}/logs/${taskLogId}/dispute`, {
      method: 'PUT',
      body: JSON.stringify({}),
    })
  }
  // Otherwise, we'll need to fetch it - this is handled in the component
  throw new Error('taskId is required for rejectTaskLog')
}
