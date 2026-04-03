const API_BASE_URL = 'http://localhost:3000/api'

// Simple API client with automatic token management
class ApiClient {
  private token: string | null = null

  setToken(token: string) {
    this.token = token
    localStorage.setItem('auth_token', token)
  }

  getToken(): string | null {
    if (this.token) return this.token

    const stored = localStorage.getItem('auth_token')
    if (stored) this.token = stored
    return this.token
  }

  clearToken() {
    this.token = null
    localStorage.removeItem('auth_token')
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    const token = this.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }

  async request(endpoint: string, options: RequestInit = {}) {
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
        // Token expired or invalid
        this.clearToken()
        window.location.href = '/login'
      }
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || `API Error: ${response.statusText}`)
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
        body: JSON.stringify(data),
      }),

    login: (email: string, password: string) =>
      this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    getMe: () => this.request('/auth/me'),

    getCouple: () => this.request('/auth/couple'),
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
    }) =>
      this.request('/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getAll: () => this.request('/tasks'),

    logCompletion: (taskId: string, data: {
      date: string
      pointsBase: number
      modifier?: string
      modifierValue?: number
      pointsFinal: number
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

    getMonthly: (year: number, month: number) =>
      this.request(`/analytics/monthly/${year}/${month}`),

    getYearly: (year: number) =>
      this.request(`/analytics/yearly/${year}`),
  }
}

export const apiClient = new ApiClient()

/**
 * Fetch the 5 most recent activities for the user's couple.
 * @returns {Promise<any>} The recent activity data
 */
export async function fetchRecentActivity() {
  try {
    const response = await apiClient.request('/recent-activity')
    return response
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    throw error
  }
}

/**
 * Fetch all pending task logs for the user's couple.
 * @returns {Promise<any>} Array of pending task logs
 */
export async function fetchPendingTaskLogs() {
  try {
    const response = await apiClient.request('/tasks/logs?status=pending')
    return response
  } catch (error) {
    console.error('Error fetching pending task logs:', error)
    throw error
  }
}

/**
 * Verify a task log by ID.
 * @param {string} taskLogId - The ID of the task log to verify
 * @returns {Promise<any>} The verified task log data
 */
export async function verifyTaskLog(taskLogId: string) {
  try {
    const response = await apiClient.request(`/tasks/logs/${taskLogId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'verified' }),
    })
    return response
  } catch (error) {
    console.error('Error verifying task log:', error)
    throw error
  }
}

/**
 * Reject/dispute a task log by ID.
 * @param {string} taskLogId - The ID of the task log to reject
 * @returns {Promise<any>} The disputed task log data
 */
export async function rejectTaskLog(taskLogId: string) {
  try {
    const response = await apiClient.request(`/tasks/logs/${taskLogId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'disputed' }),
    })
    return response
  } catch (error) {
    console.error('Error rejecting task log:', error)
    throw error
  }
}
