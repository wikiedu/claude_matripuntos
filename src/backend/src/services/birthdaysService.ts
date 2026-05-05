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
    // v2.7.2 audit 02 S3-5 — Date.UTC(year, 1, 29) en años no bisiestos
    // se normaliza silenciosamente a 1-mar, lo que confunde al user
    // ("¿por qué cumple en marzo?"). Clamp explícito a 28-feb cuando el
    // año destino no es bisiesto.
    let day = dob.getUTCDate()
    const month = dob.getUTCMonth()
    if (month === 1 /* Feb */ && day === 29) {
      const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
      if (!isLeap) day = 28
    }
    out.push({
      type: 'birthday',
      title: `Cumpleaños de ${c.name} (${ageThisYear})`,
      date: new Date(Date.UTC(year, month, day, 0, 0, 0)),
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
