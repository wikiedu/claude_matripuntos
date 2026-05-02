// v1.6 — Catálogo de frases del día.
// Distribución MVP: 10 frases por categoría = 80 totales.
// Iterar a ~280 en commits incrementales sin afectar arquitectura.
//
// Frases en castellano peninsular, género neutro, sin guiños religiosos
// ni asunciones culturales específicas, sin referencias a hijos.
// Cada frase ≤140 caracteres.

export type PhraseCategory =
  | 'reconciliacion'   // hay disputa o evento rejected reciente
  | 'animo'            // racha rota, periodo bajo
  | 'celebrar'         // fin de semana, racha alta
  | 'agradecer'        // tras semana de mucho aporte
  | 'calma'            // semana cargada
  | 'animo-suave'      // lunes, retomar
  | 'hito'             // logro reciente, nivel subido
  | 'neutra-positivo'  // fallback siempre

export interface Phrase {
  id: string
  category: PhraseCategory
  text: string
  tone: 'warm' | 'playful' | 'reflective' | 'celebratory'
}

export const PHRASES: Phrase[] = [
  // ── reconciliacion (10) ────────────────────────────────────────────────
  { id: 'rec-001', category: 'reconciliacion', text: 'Las parejas que se reparan son las que aprenden el idioma del otro.', tone: 'reflective' },
  { id: 'rec-002', category: 'reconciliacion', text: 'Hoy vale más un "lo siento" que tener razón.', tone: 'warm' },
  { id: 'rec-003', category: 'reconciliacion', text: 'Volver a empezar es también un acto de amor.', tone: 'warm' },
  { id: 'rec-004', category: 'reconciliacion', text: 'No hay puntos para reconciliarse, pero el saldo emocional sí cuenta.', tone: 'reflective' },
  { id: 'rec-005', category: 'reconciliacion', text: 'El silencio incómodo es el preludio del próximo abrazo.', tone: 'warm' },
  { id: 'rec-006', category: 'reconciliacion', text: 'A veces la solución es preguntar "¿qué necesitas ahora?".', tone: 'warm' },
  { id: 'rec-007', category: 'reconciliacion', text: 'El primer paso es siempre el más difícil. Y el más necesario.', tone: 'reflective' },
  { id: 'rec-008', category: 'reconciliacion', text: 'Estar enfadados también es estar juntos.', tone: 'reflective' },
  { id: 'rec-009', category: 'reconciliacion', text: 'Hoy os toca un café, no un debate.', tone: 'warm' },
  { id: 'rec-010', category: 'reconciliacion', text: 'Los desencuentros bien resueltos os hacen más equipo, no menos.', tone: 'reflective' },

  // ── animo (10) ─────────────────────────────────────────────────────────
  { id: 'ani-001', category: 'animo', text: 'Las rachas se rompen y se vuelven a hacer. Como casi todo en pareja.', tone: 'warm' },
  { id: 'ani-002', category: 'animo', text: 'Hoy sólo cuenta una cosa: empezar de nuevo.', tone: 'warm' },
  { id: 'ani-003', category: 'animo', text: 'El día de mañana también os necesita.', tone: 'reflective' },
  { id: 'ani-004', category: 'animo', text: 'Una mala semana no define una buena pareja.', tone: 'warm' },
  { id: 'ani-005', category: 'animo', text: 'Vuelve a sumar. La balanza tiene memoria corta.', tone: 'playful' },
  { id: 'ani-006', category: 'animo', text: 'No hace falta hacer mucho hoy. Sólo hacer algo.', tone: 'warm' },
  { id: 'ani-007', category: 'animo', text: 'La constancia es tropezar y volver al ritmo.', tone: 'reflective' },
  { id: 'ani-008', category: 'animo', text: 'Lo bueno de los días flojos es el contraste con los siguientes.', tone: 'warm' },
  { id: 'ani-009', category: 'animo', text: 'Tu pareja también tiene un día así. Mejor juntas/os.', tone: 'warm' },
  { id: 'ani-010', category: 'animo', text: 'Una pequeña tarea hoy reactiva la racha.', tone: 'playful' },

  // ── celebrar (10) ──────────────────────────────────────────────────────
  { id: 'cel-001', category: 'celebrar', text: 'Es viernes. Brindad por todo lo que ya habéis hecho esta semana.', tone: 'celebratory' },
  { id: 'cel-002', category: 'celebrar', text: 'Hoy, los puntos importan menos que disfrutarlos juntos.', tone: 'celebratory' },
  { id: 'cel-003', category: 'celebrar', text: 'Equipo en modo fin de semana activado.', tone: 'playful' },
  { id: 'cel-004', category: 'celebrar', text: 'Los hogares se ganan, pero también se celebran.', tone: 'celebratory' },
  { id: 'cel-005', category: 'celebrar', text: 'Una pareja que se ríe junta resuelve cualquier balance.', tone: 'playful' },
  { id: 'cel-006', category: 'celebrar', text: 'Hoy os habéis ganado un plan que no esté en la app.', tone: 'celebratory' },
  { id: 'cel-007', category: 'celebrar', text: 'Mirad el saldo de cariño. ¿A que no necesita app?', tone: 'warm' },
  { id: 'cel-008', category: 'celebrar', text: 'Sábado de los que se cuentan, no de los que se trabajan.', tone: 'celebratory' },
  { id: 'cel-009', category: 'celebrar', text: 'Recordad: lo equilibrado se celebra.', tone: 'celebratory' },
  { id: 'cel-010', category: 'celebrar', text: 'Si hoy descansáis, descansa también la app.', tone: 'playful' },

  // ── agradecer (10) ─────────────────────────────────────────────────────
  { id: 'agr-001', category: 'agradecer', text: 'Hoy es un buen día para decirle al otro qué es lo que más has notado.', tone: 'warm' },
  { id: 'agr-002', category: 'agradecer', text: 'Las gracias verbalizadas valen el doble.', tone: 'warm' },
  { id: 'agr-003', category: 'agradecer', text: 'El reconocimiento sostiene el equilibrio mejor que los puntos.', tone: 'reflective' },
  { id: 'agr-004', category: 'agradecer', text: 'Reconocer el esfuerzo invisible es la magia de las parejas que duran.', tone: 'reflective' },
  { id: 'agr-005', category: 'agradecer', text: 'Una semana de mucho aporte se cierra con un "gracias" mirando a los ojos.', tone: 'warm' },
  { id: 'agr-006', category: 'agradecer', text: 'Hoy podríais escribirle al otro lo que no decís nunca.', tone: 'reflective' },
  { id: 'agr-007', category: 'agradecer', text: 'El "se nota lo que haces" pesa más que un punto.', tone: 'warm' },
  { id: 'agr-008', category: 'agradecer', text: 'Decir gracias es la forma más barata de subir nivel de pareja.', tone: 'playful' },
  { id: 'agr-009', category: 'agradecer', text: 'Hay aportes que no se ven pero se notan.', tone: 'reflective' },
  { id: 'agr-010', category: 'agradecer', text: 'Hoy tu pareja merece un mensaje sin emoji ni broma.', tone: 'warm' },

  // ── calma (10) ─────────────────────────────────────────────────────────
  { id: 'cal-001', category: 'calma', text: 'Una semana cargada también es una semana que pasa.', tone: 'reflective' },
  { id: 'cal-002', category: 'calma', text: 'Si hoy todo va lento, hoy todo va bien.', tone: 'warm' },
  { id: 'cal-003', category: 'calma', text: 'Recordad: no es competición, es convivencia.', tone: 'reflective' },
  { id: 'cal-004', category: 'calma', text: 'A veces lo mejor es no añadir tareas.', tone: 'warm' },
  { id: 'cal-005', category: 'calma', text: 'Os habéis ganado un día sin balance.', tone: 'warm' },
  { id: 'cal-006', category: 'calma', text: 'Si la lista está larga, primero respirar.', tone: 'reflective' },
  { id: 'cal-007', category: 'calma', text: 'Hoy es buen día para delegar de verdad.', tone: 'warm' },
  { id: 'cal-008', category: 'calma', text: 'No todo se mide en puntos. La paciencia tampoco.', tone: 'reflective' },
  { id: 'cal-009', category: 'calma', text: 'Una semana intensa pide un domingo amable.', tone: 'warm' },
  { id: 'cal-010', category: 'calma', text: 'El equilibrio incluye los descansos.', tone: 'reflective' },

  // ── animo-suave (10) ──────────────────────────────────────────────────
  { id: 'ans-001', category: 'animo-suave', text: 'Lunes. La semana es larga, vais a llegar.', tone: 'warm' },
  { id: 'ans-002', category: 'animo-suave', text: 'Empezar es la parte más cara. Ya estáis dentro.', tone: 'reflective' },
  { id: 'ans-003', category: 'animo-suave', text: 'Una semana nueva es un balance nuevo.', tone: 'warm' },
  { id: 'ans-004', category: 'animo-suave', text: 'Pequeños pasos hoy, efecto compuesto el viernes.', tone: 'reflective' },
  { id: 'ans-005', category: 'animo-suave', text: 'Hoy basta con poner el plan sobre la mesa.', tone: 'warm' },
  { id: 'ans-006', category: 'animo-suave', text: 'No hace falta empezar fuerte. Empezar ya es suficiente.', tone: 'warm' },
  { id: 'ans-007', category: 'animo-suave', text: 'Domingo cerrado, lunes abierto.', tone: 'playful' },
  { id: 'ans-008', category: 'animo-suave', text: 'Hoy tres tareas, no veinte.', tone: 'warm' },
  { id: 'ans-009', category: 'animo-suave', text: 'La energía del lunes la marcáis vosotros.', tone: 'warm' },
  { id: 'ans-010', category: 'animo-suave', text: 'Dos manos, una pareja, una semana.', tone: 'reflective' },

  // ── hito (10) ──────────────────────────────────────────────────────────
  { id: 'hit-001', category: 'hito', text: 'Habéis subido de nivel. El hogar también.', tone: 'celebratory' },
  { id: 'hit-002', category: 'hito', text: 'Logro nuevo desbloqueado. Algo estáis haciendo bien.', tone: 'celebratory' },
  { id: 'hit-003', category: 'hito', text: 'Cada hito es una capa más en la casa que estáis construyendo.', tone: 'reflective' },
  { id: 'hit-004', category: 'hito', text: 'Subir de nivel es opcional. Vosotros lo habéis elegido.', tone: 'celebratory' },
  { id: 'hit-005', category: 'hito', text: 'Las parejas que celebran pequeños hitos resisten los grandes.', tone: 'reflective' },
  { id: 'hit-006', category: 'hito', text: 'Un mes más juntos en esto. No es poco.', tone: 'warm' },
  { id: 'hit-007', category: 'hito', text: 'Hoy lo importante no son los puntos, es lo que ya habéis construido.', tone: 'reflective' },
  { id: 'hit-008', category: 'hito', text: 'Vuestro nivel actual lo habéis ganado entre los dos.', tone: 'celebratory' },
  { id: 'hit-009', category: 'hito', text: 'Hito desbloqueado. Brindis a elegir.', tone: 'playful' },
  { id: 'hit-010', category: 'hito', text: 'Mirad atrás 30 días. Otra pareja. Mejor.', tone: 'reflective' },

  // ── neutra-positivo (10) — fallback diario ────────────────────────────
  { id: 'neu-001', category: 'neutra-positivo', text: 'El equilibrio no es hacer lo mismo, es valorar lo que hace el otro.', tone: 'reflective' },
  { id: 'neu-002', category: 'neutra-positivo', text: 'Pequeñas tareas, grandes gestos.', tone: 'warm' },
  { id: 'neu-003', category: 'neutra-positivo', text: 'Negociar no es perder, es encontrar el punto justo.', tone: 'reflective' },
  { id: 'neu-004', category: 'neutra-positivo', text: 'Las tareas compartidas pesan menos.', tone: 'warm' },
  { id: 'neu-005', category: 'neutra-positivo', text: 'Un hogar en equilibrio es un hogar en paz.', tone: 'warm' },
  { id: 'neu-006', category: 'neutra-positivo', text: 'No hay tarea pequeña cuando se hace con intención.', tone: 'reflective' },
  { id: 'neu-007', category: 'neutra-positivo', text: 'Dos cabezas piensan mejor, y dos pares de manos hacen más.', tone: 'warm' },
  { id: 'neu-008', category: 'neutra-positivo', text: 'Hoy es un buen día para proponer algo.', tone: 'warm' },
  { id: 'neu-009', category: 'neutra-positivo', text: 'Constancia, no perfección.', tone: 'reflective' },
  { id: 'neu-010', category: 'neutra-positivo', text: 'Lo que se mide, mejora. Lo que se reconoce, dura.', tone: 'reflective' },
]
