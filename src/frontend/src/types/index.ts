// Type definitions for Matripuntos

export interface User {
  id: string
  coupleId: string
  email: string
  name: string
  timezone?: string
  roleInHome?: string
  role?: string
  hasCompletedOnboarding?: boolean
  notificationsPush?: boolean
  notificationsEmail?: boolean
}

export interface Couple {
  id: string
  name?: string
  numChildren: number
  language: string
  notificationsEnabled?: boolean
  users?: User[]
  children?: Child[]
  configuration?: CoupleConfiguration | null
}

export interface Child {
  id: string
  name: string
  dateOfBirth: string
  livesWithUser1?: boolean
  livesWithUser2?: boolean
  hasSpecialNeeds?: boolean
}

export interface Event {
  id: string
  coupleId: string
  createdBy: string
  creator?: { id: string; name: string }
  type: string
  title?: string
  description?: string
  dateStart: string
  dateEnd: string
  hasChildren?: boolean
  numChildren?: number
  pointsBase?: number | string
  pointsCalculated: number | string
  pointsAgreed?: number | string | null
  compensation?: string | null
  compensationDiscount?: number | string
  status: 'draft' | 'pending' | 'accepted' | 'rejected' | 'forced' | 'negotiating' | 'completed'
  negotiationRound?: number
  maxFreeRounds?: number
  lastProposedBy?: string | null
  lastProposedPoints?: number | string | null
  negotiations?: Negotiation[]
}

export interface Negotiation {
  id: string
  eventId: string
  roundNumber: number
  proposedBy?: string | null
  pointsProposed: number | string
  message?: string | null
  responseType: 'accepted' | 'rejected' | 'counter_proposed' | 'awaiting' | 'forced'
  respondedBy?: string | null
  respondedAt?: string | null
  createdAt: string
}

export interface Task {
  id: string
  coupleId: string
  name: string
  description?: string
  category: 'cocina' | 'baños' | 'limpieza' | 'compra' | 'logistica' | 'cuidado' | 'mantenimiento' | 'jardineria' | 'mascotas'
  pointsBase: number | string
  isDefault?: boolean
}

export interface TaskLog {
  id: string
  coupleId: string
  taskId: string
  task?: { id: string; name: string; category: string }
  completedBy?: { id: string; name: string } | null
  date: string
  pointsBase: number | string
  modifier?: string | null
  modifierValue?: number | string | null
  pointsFinal: number | string
  status: 'pending' | 'verified' | 'disputed' | 'auto_accepted'
  verifiedBy?: { id: string; name: string } | null
  verifiedAt?: string | null
  disputeReason?: string | null
  notes?: string | null
  createdAt?: string
}

export interface PointsTransaction {
  id: string
  coupleId: string
  userId?: string | null
  user?: { id: string; name: string } | null
  type: 'event_accepted' | 'task_completed' | 'donation' | 'forced_payment' | string
  amount: number | string
  description?: string | null
  relatedEventId?: string | null
  event?: { id: string; type: string; title?: string; date: string } | null
  relatedTaskLogId?: string | null
  taskLog?: { id: string; taskName?: string; date: string } | null
  createdAt: string
}

export interface BalanceData {
  you: { id: string; name: string; balance: number; balanceFormatted?: string }
  partner: { id: string; name: string; balance: number; balanceFormatted?: string }
  difference: number
  isBalanced: boolean
}

export interface Notification {
  id: string
  coupleId: string
  userId: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export interface CoupleConfiguration {
  tasksConfig: Record<string, number>
  multipliersConfig: Record<string, unknown>
  activityTypes: Record<string, unknown>
}
