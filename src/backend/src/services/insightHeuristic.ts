interface InsightInput {
  user1Name: string
  user2Name: string
  topCategoryUser1: { name: string; count: number } | null
  topCategoryUser2: { name: string; count: number } | null
  timePctUser1: number              // 0-100
  equityDelta: number               // diff vs mes anterior
  worstCategory: string | null      // categoría más desequilibrada
}

interface InsightOutput {
  text: string
  bullets: { tone: 'success' | 'warn' | 'neutral'; text: string }[]
}

const TEMPLATES: ((i: InsightInput) => string)[] = [
  (i) => `Este mes ${i.user2Name} cubrió más ${i.topCategoryUser2?.name ?? 'tareas'}; ${i.user1Name} llevó más ${i.topCategoryUser1?.name ?? 'otras'}. Reparto por tiempo: ${i.timePctUser1}/${100 - i.timePctUser1}.`,
  (i) => `${i.user1Name} y ${i.user2Name} tuvieron un mes ${i.timePctUser1 >= 45 && i.timePctUser1 <= 55 ? 'equilibrado' : 'desequilibrado'}. ${i.topCategoryUser1?.name ?? 'Otros'} lidera para ${i.user1Name}, ${i.topCategoryUser2?.name ?? 'otros'} para ${i.user2Name}.`,
  (i) => `Análisis del mes: ${Math.abs(50 - i.timePctUser1)}% de diferencia en tiempo invertido. ${i.topCategoryUser1?.name ? `Tu fuerte: ${i.topCategoryUser1.name}.` : ''} ${i.topCategoryUser2?.name ? `El de ${i.user2Name}: ${i.topCategoryUser2.name}.` : ''}`,
]

export function generateInsight(input: InsightInput, seed: number): InsightOutput {
  const tpl = TEMPLATES[seed % TEMPLATES.length]
  const text = tpl(input)
  const bullets: InsightOutput['bullets'] = []
  if (input.equityDelta > 0) bullets.push({ tone: 'success', text: `+${input.equityDelta}% equidad` })
  else if (input.equityDelta < 0) bullets.push({ tone: 'warn', text: `${input.equityDelta}% equidad` })
  if (input.worstCategory) bullets.push({ tone: 'warn', text: `${input.worstCategory} desequilibrado` })
  if (input.timePctUser1 >= 45 && input.timePctUser1 <= 55) bullets.push({ tone: 'success', text: 'Reparto equilibrado' })
  return { text, bullets }
}
