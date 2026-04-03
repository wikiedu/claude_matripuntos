export interface AnalyticsMetrics {
  totalEvents: number
  totalPoints: number
  averagePointsPerEvent: number
  negotiationSuccessRate: number
  averageNegotiationRounds: number
  mostActiveDay: string
  totalAchievements: number
}

export interface UserAnalytics {
  userId: string
  userName: string
  totalPoints: number
  totalEvents: number
  totalCompleted: number
  totalPending: number
  successRate: number
  averagePoints: number
  achievements: number
}

export interface EventAnalytics {
  date: string
  count: number
  totalPoints: number
  types: Record<string, number>
}

export interface NegotiationAnalytics {
  totalNegotiations: number
  accepted: number
  rejected: number
  pendingRounds: number
  successRate: number
  averageRounds: number
}

export interface WeeklyTrend {
  week: number
  events: number
  points: number
}

export interface MonthlySummary {
  month: number
  year: number
  events: number
  points: number
  negotiations: number
  achievements: number
}

export interface YearlyOverview {
  year: number
  totalEvents: number
  totalPoints: number
  totalNegotiations: number
  totalAchievements: number
  months: MonthlySummary[]
}
