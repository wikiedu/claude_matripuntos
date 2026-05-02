// v2.0.1 — Birthdays auto-derivado de Child + couple anniversary.
// Pure: el caller hace la persistencia (upsert CalendarEntry).

export interface ChildLite {
  id: string
  name: string
  dateOfBirth: Date
}

export interface CoupleAnniversary {
  startDate: Date
  user1Name?: string
  user2Name?: string
}

export interface BirthdayDraft {
  type: 'birthday'
  title: string
  date: Date
  allDay: true
  externalSource: 'auto'
  metadata: { kind: 'child' | 'anniversary'; refId?: string }
}

export function deriveBirthdaysForYear(
  children: ChildLite[],
  anniversary: CoupleAnniversary | null,
  year: number,
): BirthdayDraft[] {
  const out: BirthdayDraft[] = []

  for (const c of children) {
    const dob = c.dateOfBirth
    const ageThisYear = year - dob.getUTCFullYear()
    if (ageThisYear < 0) continue
    out.push({
      type: 'birthday',
      title: `Cumpleaños de ${c.name} (${ageThisYear})`,
      date: new Date(Date.UTC(year, dob.getUTCMonth(), dob.getUTCDate(), 0, 0, 0)),
      allDay: true,
      externalSource: 'auto',
      metadata: { kind: 'child', refId: c.id },
    })
  }

  if (anniversary) {
    const a = anniversary.startDate
    const yearsTogether = year - a.getUTCFullYear()
    if (yearsTogether >= 1) {
      out.push({
        type: 'birthday',
        title: `Aniversario en Matripuntos (${yearsTogether} años)`,
        date: new Date(Date.UTC(year, a.getUTCMonth(), a.getUTCDate(), 0, 0, 0)),
        allDay: true,
        externalSource: 'auto',
        metadata: { kind: 'anniversary' },
      })
    }
  }

  return out
}
