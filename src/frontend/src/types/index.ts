// Type definitions for Matripuntos

export interface User {
  id: string
  coupleId: string
  email: string
  name: string
  timezone: string
}

export interface Couple {
  id: string
  name?: string
  numChildren: number
  language: string
  users?: User[]
  children?: { id: string; name: string; dateOfBirth: string }[]
}

export interface Event {
  id: string
  coupleId: string
  createdBy: string
  type: string
  title: string
  dateStart: string
  dateEnd: string
  hasChildren: boolean
  pointsCalculated: number
  pointsAgreed?: number
  status: 'draft' | 'pending' | 'accepted' | 'rejected' | 'negotiating' | 'completed'
  negotiationRound: number
}

export interface TaskLog {
  id: string
  coupleId: string
  taskId: string
  completedBy: string
  date: string
  pointsFinal: number
  status: 'pending' | 'verified' | 'disputed' | 'auto_accepted'
}

export interface PointsTransaction {
  id: string
  coupleId: string
  userId: string
  type: string
  amount: number
  description: string
  createdAt: string
}
