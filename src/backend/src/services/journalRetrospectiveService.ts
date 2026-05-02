// v2.0.2 — Retrospectivas: stats agregadas para semana/mes/año.
// Pure: el caller pre-carga datos y pasa al service. Sin DB calls aquí.

export interface RetrospectiveInput {
  period: 'week' | 'month' | 'year'
  startDate: Date
  endDate: Date
  events: Array<{ pointsCalculated: number; type: string; status: string }>
  taskLogs: Array<{ status: string }>
  pointsTransactions: Array<{ amount: number; userId: string }>
  journalEntries: Array<{ id: string; type: string; tags: string[]; createdAt: Date; body?: string | null }>
  moodLogs: Array<{ moodKey: string }>
  user1Id?: string
  user2Id?: string
}

export interface RetrospectiveData {
  period: 'week' | 'month' | 'year'
  startDate: string
  endDate: string
  stats: {
    eventsAccepted: number
    eventsRejected: number
    tasksVerified: number
    tasksDisputed: number
    netBalance: number
    isBalanced: boolean
    journalEntriesCount: number
    journalSharedCount: number
    moodPredominant: string | null
    distinctTags: string[]
  }
  highlights: Array<{ kind: 'journal' | 'mood' | 'event'; title: string; date: string }>
}

export function computeRetrospective(input: RetrospectiveInput): RetrospectiveData {
  const eventsAccepted = input.events.filter(e => e.status === 'accepted').length
  const eventsRejected = input.events.filter(e => e.status === 'rejected').length
  const tasksVerified = input.taskLogs.filter(l => l.status === 'verified').length
  const tasksDisputed = input.taskLogs.filter(l => l.status === 'disputed').length

  const sumByUser = new Map<string, number>()
  for (const t of input.pointsTransactions) {
    sumByUser.set(t.userId, (sumByUser.get(t.userId) ?? 0) + t.amount)
  }
  const u1 = input.user1Id ? sumByUser.get(input.user1Id) ?? 0 : 0
  const u2 = input.user2Id ? sumByUser.get(input.user2Id) ?? 0 : 0
  const netBalance = u1 - u2

  const moodCount = new Map<string, number>()
  for (const m of input.moodLogs) {
    moodCount.set(m.moodKey, (moodCount.get(m.moodKey) ?? 0) + 1)
  }
  let moodPredominant: string | null = null
  let max = 0
  for (const [k, v] of moodCount) {
    if (v > max) { max = v; moodPredominant = k }
  }

  const distinctTags = new Set<string>()
  for (const e of input.journalEntries) {
    for (const t of e.tags) distinctTags.add(t)
  }

  // Highlights: hasta 3 journal entries con body más largo.
  const highlights = input.journalEntries
    .filter(e => e.body && e.body.length > 50)
    .sort((a, b) => (b.body?.length ?? 0) - (a.body?.length ?? 0))
    .slice(0, 3)
    .map(e => ({
      kind: 'journal' as const,
      title: e.body?.slice(0, 80) ?? '',
      date: e.createdAt.toISOString(),
    }))

  return {
    period: input.period,
    startDate: input.startDate.toISOString(),
    endDate: input.endDate.toISOString(),
    stats: {
      eventsAccepted,
      eventsRejected,
      tasksVerified,
      tasksDisputed,
      netBalance,
      isBalanced: Math.abs(netBalance) <= 5,
      journalEntriesCount: input.journalEntries.length,
      journalSharedCount: 0,  // se podría enriquecer si se pasa flag shared
      moodPredominant,
      distinctTags: [...distinctTags],
    },
    highlights,
  }
}
