// Tipos compartidos de la página Tareas (extraídos de pages/Tasks.tsx en T2).

export interface Task {
  id: string
  name: string
  category: string
  pointsBase: string
  description?: string
  isRecurring?: boolean
  frequency?: string | null
  scheduledFor?: string
  // v1.6.3 fix QA Bug 4: marcador de "tarea sembrada del catálogo del seed".
  // Si true y sin scheduledFor/recurrencia, no aparece en "Hoy".
  isDefault?: boolean
}

export interface TaskLog {
  id: string
  taskId: string
  taskName: string
  taskCategory: string
  date: string
  pointsFinal: number | string
  status: 'pending' | 'verified' | 'disputed'
  modifier?: string
  completedBy: { id: string; name: string } | null
  verifiedBy: { id: string; name: string } | null
  verifiedAt?: string
  disputeReason?: string
}
