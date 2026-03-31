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
    }) =>
      this.request(`/tasks/${taskId}/log`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getLogs: (taskId: string, startDate?: string, endDate?: string) => {
      const query = startDate && endDate
        ? `?startDate=${startDate}&endDate=${endDate}`
        : ''
      return this.request(`/tasks/${taskId}/logs${query}`)
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
}

export const apiClient = new ApiClient()
