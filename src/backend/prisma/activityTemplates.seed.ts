/**
 * v2.0.4 — Catálogo global de actividades (ActivityTemplate seed)
 *
 * Templates con `coupleId = null` son globales (visibles a todas las parejas).
 * Las parejas pueden duplicar/customizar creando templates con coupleId propio.
 *
 * Categorías (mirroran event.type slugs en pointsCalculator):
 *  - trabajo       (necesaria,   ×0.7)
 *  - salud         (salud,       ×0.85)
 *  - ocio          (ocio social, ×1.0)
 *  - social        (ocio social, ×1.0)
 *  - viaje         (variable según subcategoría)
 *  - alto_impacto  (boda/despedida/comunión/etc, ×1.4)
 *  - cuidado       (variable)
 *  - personal      (ocio social, ×1.0)
 */

export type ActivityTemplateSeed = {
  category: string
  subcategory?: string
  name: string
  description?: string
  pointsBaseSuggested: number
  defaultDurationMinutes?: number
  defaultImpact?: 'necessary' | 'health' | 'leisure' | 'high'
  emoji?: string
}

export const ACTIVITY_TEMPLATES_SEED: ActivityTemplateSeed[] = [
  // ─── TRABAJO ──────────────────────────────────────────────
  { category: 'trabajo', subcategory: 'jornada',  name: 'Jornada laboral',          pointsBaseSuggested: 8,  defaultDurationMinutes: 480, defaultImpact: 'necessary', emoji: '💼' },
  { category: 'trabajo', subcategory: 'jornada',  name: 'Reunión / call importante', pointsBaseSuggested: 5,  defaultDurationMinutes: 60,  defaultImpact: 'necessary', emoji: '📞' },
  { category: 'trabajo', subcategory: 'viaje',    name: 'Viaje de trabajo',         pointsBaseSuggested: 12, defaultDurationMinutes: 1440, defaultImpact: 'necessary', emoji: '✈️' },
  { category: 'trabajo', subcategory: 'viaje',    name: 'Conferencia / formación',  pointsBaseSuggested: 10, defaultDurationMinutes: 480, defaultImpact: 'necessary', emoji: '🎓' },
  { category: 'trabajo', subcategory: 'extra',    name: 'Hora extra / turno doble', pointsBaseSuggested: 6,  defaultDurationMinutes: 240, defaultImpact: 'necessary', emoji: '⏰' },
  { category: 'trabajo', subcategory: 'extra',    name: 'Guardia / on-call',        pointsBaseSuggested: 5,  defaultDurationMinutes: 720, defaultImpact: 'necessary', emoji: '🆘' },

  // ─── SALUD ────────────────────────────────────────────────
  { category: 'salud',   subcategory: 'medica',   name: 'Cita médica',              pointsBaseSuggested: 4,  defaultDurationMinutes: 60,  defaultImpact: 'necessary', emoji: '🩺' },
  { category: 'salud',   subcategory: 'medica',   name: 'Revisión dental',          pointsBaseSuggested: 4,  defaultDurationMinutes: 60,  defaultImpact: 'necessary', emoji: '🦷' },
  { category: 'salud',   subcategory: 'medica',   name: 'Análisis / pruebas',       pointsBaseSuggested: 4,  defaultDurationMinutes: 90,  defaultImpact: 'necessary', emoji: '🧪' },
  { category: 'salud',   subcategory: 'medica',   name: 'Operación / cirugía',      pointsBaseSuggested: 15, defaultDurationMinutes: 480, defaultImpact: 'necessary', emoji: '🏥' },
  { category: 'salud',   subcategory: 'deporte',  name: 'Gimnasio / entreno',       pointsBaseSuggested: 4,  defaultDurationMinutes: 60,  defaultImpact: 'health',    emoji: '🏋️' },
  { category: 'salud',   subcategory: 'deporte',  name: 'Yoga / pilates',           pointsBaseSuggested: 4,  defaultDurationMinutes: 60,  defaultImpact: 'health',    emoji: '🧘' },
  { category: 'salud',   subcategory: 'deporte',  name: 'Running / ciclismo',       pointsBaseSuggested: 5,  defaultDurationMinutes: 60,  defaultImpact: 'health',    emoji: '🏃' },
  { category: 'salud',   subcategory: 'deporte',  name: 'Partido / liga amateur',   pointsBaseSuggested: 6,  defaultDurationMinutes: 120, defaultImpact: 'health',    emoji: '⚽' },
  { category: 'salud',   subcategory: 'bienestar', name: 'Spa / masaje',            pointsBaseSuggested: 5,  defaultDurationMinutes: 90,  defaultImpact: 'health',    emoji: '💆' },
  { category: 'salud',   subcategory: 'bienestar', name: 'Terapia / psicólogo',     pointsBaseSuggested: 4,  defaultDurationMinutes: 60,  defaultImpact: 'necessary', emoji: '🛋️' },

  // ─── OCIO (personal) ──────────────────────────────────────
  { category: 'ocio',    subcategory: 'cultura',  name: 'Cine / teatro',            pointsBaseSuggested: 5,  defaultDurationMinutes: 150, defaultImpact: 'leisure',   emoji: '🎬' },
  { category: 'ocio',    subcategory: 'cultura',  name: 'Concierto',                pointsBaseSuggested: 7,  defaultDurationMinutes: 180, defaultImpact: 'leisure',   emoji: '🎤' },
  { category: 'ocio',    subcategory: 'cultura',  name: 'Museo / exposición',       pointsBaseSuggested: 4,  defaultDurationMinutes: 120, defaultImpact: 'leisure',   emoji: '🖼️' },
  { category: 'ocio',    subcategory: 'gastro',   name: 'Cena fuera',               pointsBaseSuggested: 6,  defaultDurationMinutes: 120, defaultImpact: 'leisure',   emoji: '🍽️' },
  { category: 'ocio',    subcategory: 'gastro',   name: 'Comida con amigos',        pointsBaseSuggested: 6,  defaultDurationMinutes: 180, defaultImpact: 'leisure',   emoji: '🍷' },
  { category: 'ocio',    subcategory: 'hobbie',   name: 'Hobbie / clase',           pointsBaseSuggested: 4,  defaultDurationMinutes: 90,  defaultImpact: 'leisure',   emoji: '🎨' },
  { category: 'ocio',    subcategory: 'hobbie',   name: 'Videojuegos / serie maraton', pointsBaseSuggested: 3, defaultDurationMinutes: 180, defaultImpact: 'leisure', emoji: '🎮' },

  // ─── SOCIAL (compromiso con otros) ────────────────────────
  { category: 'social',  subcategory: 'familia',  name: 'Comida familiar',          pointsBaseSuggested: 5,  defaultDurationMinutes: 240, defaultImpact: 'leisure',   emoji: '👨‍👩‍👧' },
  { category: 'social',  subcategory: 'familia',  name: 'Visita a padres / suegros', pointsBaseSuggested: 5,  defaultDurationMinutes: 180, defaultImpact: 'leisure',   emoji: '🏡' },
  { category: 'social',  subcategory: 'amigos',   name: 'Quedada con amigos',       pointsBaseSuggested: 5,  defaultDurationMinutes: 180, defaultImpact: 'leisure',   emoji: '👯' },
  { category: 'social',  subcategory: 'amigos',   name: 'Cumpleaños amigo',         pointsBaseSuggested: 6,  defaultDurationMinutes: 240, defaultImpact: 'leisure',   emoji: '🎂' },
  { category: 'social',  subcategory: 'eventos',  name: 'Despedida soltero/a',      pointsBaseSuggested: 12, defaultDurationMinutes: 720, defaultImpact: 'high',      emoji: '🥂' },

  // ─── ALTO IMPACTO ────────────────────────────────────────
  { category: 'alto_impacto', subcategory: 'celebracion', name: 'Boda',             pointsBaseSuggested: 15, defaultDurationMinutes: 600, defaultImpact: 'high',     emoji: '💒' },
  { category: 'alto_impacto', subcategory: 'celebracion', name: 'Comunión / bautizo', pointsBaseSuggested: 10, defaultDurationMinutes: 360, defaultImpact: 'high',  emoji: '🕊️' },
  { category: 'alto_impacto', subcategory: 'celebracion', name: 'Cumpleaños grande / propio', pointsBaseSuggested: 8, defaultDurationMinutes: 240, defaultImpact: 'leisure', emoji: '🎉' },
  { category: 'alto_impacto', subcategory: 'celebracion', name: 'Aniversario',      pointsBaseSuggested: 8,  defaultDurationMinutes: 240, defaultImpact: 'leisure',   emoji: '💐' },
  { category: 'alto_impacto', subcategory: 'duelo',       name: 'Funeral / duelo',  pointsBaseSuggested: 8,  defaultDurationMinutes: 360, defaultImpact: 'high',     emoji: '🕯️' },

  // ─── VIAJE ────────────────────────────────────────────────
  { category: 'viaje',   subcategory: 'corto',    name: 'Escapada fin de semana',   pointsBaseSuggested: 12, defaultDurationMinutes: 2880, defaultImpact: 'leisure', emoji: '🏖️' },
  { category: 'viaje',   subcategory: 'corto',    name: 'Excursión 1 día',          pointsBaseSuggested: 7,  defaultDurationMinutes: 720, defaultImpact: 'leisure',  emoji: '🥾' },
  { category: 'viaje',   subcategory: 'largo',    name: 'Vacaciones (1+ semana)',   pointsBaseSuggested: 20, defaultDurationMinutes: 10080, defaultImpact: 'leisure', emoji: '🌍' },
  { category: 'viaje',   subcategory: 'largo',    name: 'Viaje con amigos solo',    pointsBaseSuggested: 18, defaultDurationMinutes: 4320, defaultImpact: 'high',    emoji: '🎒' },

  // ─── CUIDADO (eventos relacionados con hijos / mayores) ───
  { category: 'cuidado', subcategory: 'hijos',    name: 'Reunión colegio / tutoría', pointsBaseSuggested: 4,  defaultDurationMinutes: 60,  defaultImpact: 'necessary', emoji: '🏫' },
  { category: 'cuidado', subcategory: 'hijos',    name: 'Cumpleaños hijo',          pointsBaseSuggested: 8,  defaultDurationMinutes: 240, defaultImpact: 'leisure',   emoji: '🎈' },
  { category: 'cuidado', subcategory: 'hijos',    name: 'Pediatra',                 pointsBaseSuggested: 4,  defaultDurationMinutes: 60,  defaultImpact: 'necessary', emoji: '🧸' },
  { category: 'cuidado', subcategory: 'hijos',    name: 'Extraescolar / actividad', pointsBaseSuggested: 3,  defaultDurationMinutes: 90,  defaultImpact: 'necessary', emoji: '🎽' },
  { category: 'cuidado', subcategory: 'mayores',  name: 'Cuidado padres / mayores', pointsBaseSuggested: 6,  defaultDurationMinutes: 240, defaultImpact: 'necessary', emoji: '👵' },

  // ─── PERSONAL (descanso y autocuidado) ───────────────────
  { category: 'personal', subcategory: 'descanso', name: 'Tiempo solo / descanso',  pointsBaseSuggested: 3,  defaultDurationMinutes: 120, defaultImpact: 'leisure',   emoji: '😌' },
  { category: 'personal', subcategory: 'descanso', name: 'Siesta / dormir extra',   pointsBaseSuggested: 2,  defaultDurationMinutes: 60,  defaultImpact: 'leisure',   emoji: '😴' },
  { category: 'personal', subcategory: 'tramites', name: 'Trámites administrativos', pointsBaseSuggested: 4, defaultDurationMinutes: 90,  defaultImpact: 'necessary', emoji: '📋' },
  { category: 'personal', subcategory: 'tramites', name: 'Banco / gestoría',        pointsBaseSuggested: 4,  defaultDurationMinutes: 60,  defaultImpact: 'necessary', emoji: '🏦' },
  { category: 'personal', subcategory: 'estetica', name: 'Peluquería / estética',   pointsBaseSuggested: 4,  defaultDurationMinutes: 90,  defaultImpact: 'leisure',   emoji: '💇' },
]
