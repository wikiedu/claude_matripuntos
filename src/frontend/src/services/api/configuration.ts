// Dominio configuración/consenso: config de la pareja, categorías y
// propuestas de regla (RuleProposal).
import type { RuleProposal } from '../../types/index'
import { http } from './http'

// Configuration endpoints
export const configuration = {
  get: () => http.request('/configuration'),

  update: (data: {
    tasksConfig?: { [key: string]: number }
    multipliersConfig?: any
    activityTypes?: any
  }) =>
    http.request('/configuration', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  reset: () =>
    http.request('/configuration/reset', {
      method: 'POST',
    }),
}

// Category endpoints (V2)
export const categories = {
  getAll: () =>
    http.request('/categories'),

  getDefault: () =>
    http.request('/categories/default'),

  getCategory: (categoryId: string) =>
    http.request(`/categories/${categoryId}`),

  create: (data: any) =>
    http.request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (categoryId: string, data: any) =>
    http.request(`/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (categoryId: string) =>
    http.request(`/categories/${categoryId}`, {
      method: 'DELETE',
    }),

  addSubcategory: (categoryId: string, data: any) =>
    http.request(`/categories/${categoryId}/subcategories`, {
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
    http.request('/categories/propose', {
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
    http.request(`/categories/${categoryId}/propose-change`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}

// Rules endpoints (v1.2)
export const rules = {
  getAll: (): Promise<{ rules: any[]; proposals: RuleProposal[] }> =>
    http.request('/rules'),

  propose: (data: {
    type: 'rule' | 'category' | 'category_edit'
    payload: string
    proposerComment?: string
  }): Promise<RuleProposal> =>
    http.request('/rules/propose', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  respond: (id: string, data: {
    status: 'accepted' | 'rejected'
    responderComment?: string
  }): Promise<RuleProposal> =>
    http.request(`/rules/${id}/respond`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}
