// Dominio listas compartidas: lista de la compra + to-dos.
import type { ShoppingData, ShoppingItem, ShoppingList, Todo, TodosData } from '../../types/index'
import { http } from './http'

// Shopping list endpoints (v1.3)
export const shopping = {
  getAll: (): Promise<ShoppingData> =>
    http.request('/shopping'),

  addItem: (text: string): Promise<ShoppingItem> =>
    http.request('/shopping/items', { method: 'POST', body: JSON.stringify({ text }) }),

  updateItem: (id: string, data: { isChecked?: boolean; text?: string }): Promise<ShoppingItem> =>
    http.request(`/shopping/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteItem: (id: string): Promise<void> =>
    http.request(`/shopping/items/${id}`, { method: 'DELETE' }),

  archive: (): Promise<ShoppingList> =>
    http.request('/shopping/archive', { method: 'POST' }),
}

// To-dos endpoints (v1.3)
export const todos = {
  getAll: (): Promise<TodosData> =>
    http.request('/todos'),

  create: (data: { text: string; dueDate?: string; isShared?: boolean }): Promise<Todo> =>
    http.request('/todos', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: { text?: string; isCompleted?: boolean; dueDate?: string | null; isShared?: boolean }): Promise<Todo> =>
    http.request(`/todos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string): Promise<void> =>
    http.request(`/todos/${id}`, { method: 'DELETE' }),
}
