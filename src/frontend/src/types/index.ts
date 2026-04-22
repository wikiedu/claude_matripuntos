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
  avatarEmoji?: string
  avatarColor?: string
  theme?: 'dark' | 'light'
  currentMood?: string | null
}

export interface Couple {
  id: string
  name?: string
  joinCode?: string | null
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
  scheduledFor?: string | null
  isRecurring?: boolean
  frequency?: string | null
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

// v1.2 gamification types
export interface GamificationStatus {
  xp: number
  level: string
  levelEmoji: string
  levelName: string
  nextLevel: string
  nextLevelEmoji: string
  xpToNext: number
  xpProgress: number
  dailyStreak: number
  weeklyStreak: number
  dailyMultiplier: number
  weeklyBonus: number
  combinedMultiplier: number
  freezerAvailable: boolean
  lastActivityDate: string | null
}

export interface AchievementMapNode {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  category: string
  xpReward: number
  orderIndex: number
  status: 'unlocked' | 'in_progress' | 'locked'
  unlockedAt: string | null
  progress: { current: number; target: number; percentage: number } | null
}

export interface RuleProposal {
  id: string
  coupleId: string
  proposedById: string | null
  type: 'rule' | 'category' | 'category_edit'
  payload: string
  proposerComment: string | null
  status: 'pending' | 'accepted' | 'rejected'
  responderComment: string | null
  respondedAt: string | null
  proposedBy: { id: string; name: string } | null
  respondedBy: { id: string; name: string } | null
  createdAt: string
}

// v1.3 Shopping List
export interface ShoppingItem {
  id: string
  listId: string
  text: string
  isChecked: boolean
  checkedBy: string | null
  checkedAt: string | null
  createdAt: string
}

export interface ShoppingList {
  id: string
  coupleId: string
  isActive: boolean
  archivedAt: string | null
  createdAt: string
  items: ShoppingItem[]
}

export interface ShoppingData {
  active: ShoppingList
  history: ShoppingList[]
}

// v1.3 To-dos
export interface Todo {
  id: string
  userId: string
  coupleId: string
  text: string
  isCompleted: boolean
  completedAt: string | null
  dueDate: string | null
  isShared: boolean
  createdAt: string
  updatedAt: string
}

export interface TodosData {
  mine: Todo[]
  partnerShared: Todo[]
}

// v1.3 Task scheduling
export interface TaskSchedule {
  scheduledFor: string
  frequency?: 'daily' | 'biweekly' | 'weekly' | 'bimonthly' | 'monthly'
  recurrenceEnd?: string
  maxOccurrences?: number
}

// v1.3 Digest
export interface WeeklyDigestData {
  weekStart: string
  weekEnd: string
  tasksCompleted: number
  user1Name: string
  user1Balance: number
  user2Name: string
  user2Balance: number
  achievementsUnlocked: string[]
  dailyStreakDays: number
}
