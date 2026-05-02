// v2.0.2 — Catálogo curado de prompts diarios. Spec §4.2.
// 30 prompts × 5 categorías = ~150 entradas en futuras versiones.
// Esta versión inicial: 30 prompts repartidos.

export interface JournalPromptSeed {
  id: string
  text: string
  category: 'reflection' | 'gratitude' | 'future' | 'conflict' | 'celebration'
  weight: number
}

export const JOURNAL_PROMPTS: JournalPromptSeed[] = [
  // Reflection (10)
  { id: 'q-001', text: '¿Qué te ha hecho sonreír hoy?', category: 'reflection', weight: 3 },
  { id: 'q-002', text: '¿Algo que tu pareja hizo te sorprendió?', category: 'reflection', weight: 2 },
  { id: 'q-003', text: '¿Qué aprendiste sobre ti misma/o esta semana?', category: 'reflection', weight: 1 },
  { id: 'q-004', text: '¿Qué momento del día te dio más calma?', category: 'reflection', weight: 2 },
  { id: 'q-005', text: 'Si pudieras revivir un momento de hoy, ¿cuál sería?', category: 'reflection', weight: 1 },
  { id: 'q-006', text: '¿Qué pensamiento te ha acompañado más?', category: 'reflection', weight: 1 },
  { id: 'q-007', text: '¿Cómo describirías tu energía hoy en una palabra?', category: 'reflection', weight: 2 },
  { id: 'q-008', text: '¿Hay algo que querías hacer hoy y no hiciste? ¿Por qué?', category: 'reflection', weight: 1 },
  { id: 'q-009', text: '¿Qué te ha emocionado este fin de semana?', category: 'reflection', weight: 1 },
  { id: 'q-010', text: '¿Qué decisión pequeña tomaste hoy de la que estés orgullosa/o?', category: 'reflection', weight: 1 },

  // Gratitude (8)
  { id: 'q-011', text: 'Una cosa que tu pareja hizo que aprecias.', category: 'gratitude', weight: 3 },
  { id: 'q-012', text: '¿A quién le agradecerías hoy?', category: 'gratitude', weight: 2 },
  { id: 'q-013', text: 'Tres cosas pequeñas que han ido bien hoy.', category: 'gratitude', weight: 2 },
  { id: 'q-014', text: '¿Qué tienes hoy que hace 5 años creías imposible?', category: 'gratitude', weight: 1 },
  { id: 'q-015', text: 'Un detalle de vuestra casa que te hace feliz.', category: 'gratitude', weight: 1 },
  { id: 'q-016', text: 'Una conversación reciente que te hizo bien.', category: 'gratitude', weight: 2 },
  { id: 'q-017', text: '¿Qué de tu pareja te ha dado paz hoy?', category: 'gratitude', weight: 2 },
  { id: 'q-018', text: 'Un olor, sabor o sonido que asocies con vosotros.', category: 'gratitude', weight: 1 },

  // Future (5)
  { id: 'q-019', text: '¿Qué quieres hacer juntos esta semana?', category: 'future', weight: 2 },
  { id: 'q-020', text: 'Un sueño compartido que aún no habéis hecho realidad.', category: 'future', weight: 1 },
  { id: 'q-021', text: '¿Cómo te imaginas vuestra próxima escapada?', category: 'future', weight: 1 },
  { id: 'q-022', text: 'Una cosa que quieres aprender de tu pareja.', category: 'future', weight: 2 },
  { id: 'q-023', text: 'Si tuvierais que mudaros mañana, ¿qué os llevaríais?', category: 'future', weight: 1 },

  // Conflict (4) — para procesar tensiones
  { id: 'q-024', text: 'Si hay algo que te ha incomodado, escríbelo aquí.', category: 'conflict', weight: 1 },
  { id: 'q-025', text: '¿Algo que querrías hablar y aún no has hablado?', category: 'conflict', weight: 1 },
  { id: 'q-026', text: '¿Qué necesitas más ahora mismo de tu pareja?', category: 'conflict', weight: 2 },
  { id: 'q-027', text: '¿Qué responsabilidad sientes que pesa más?', category: 'conflict', weight: 1 },

  // Celebration (3)
  { id: 'q-028', text: '¿Qué celebraríais juntos esta semana?', category: 'celebration', weight: 2 },
  { id: 'q-029', text: 'Un logro pequeño tuyo que merece un brindis.', category: 'celebration', weight: 2 },
  { id: 'q-030', text: '¿Qué hito de vuestra historia recordáis con cariño?', category: 'celebration', weight: 1 },
]
