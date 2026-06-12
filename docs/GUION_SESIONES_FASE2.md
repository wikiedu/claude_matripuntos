# GUIÓN DE SESIONES — Fase 2 Matripuntos
## Un solo prompt en loop · Copy-paste después de cada /clear

---

## La mecánica (30 segundos para entenderla)

1. `/effort high`
2. Pegar el prompt de abajo
3. El modelo trabaja hasta el 75% de contexto, commitea y para
4. `/clear`
5. Volver al paso 1

**Nada más.** El modelo lee `docs/TODO_PHASE2.md` en cada sesión y sabe
exactamente dónde está: qué está hecho, qué sigue, si toca código o brainstorming.
Tú no gestionas nada entre sesiones.

---

## EL PROMPT (único — siempre el mismo)

```
Eres el ejecutor de la Fase 2 de Matripuntos (rama main, tag v2.9.0).

─── ARRANQUE (haz esto siempre primero) ───────────────────────────────────────

Lee en este orden:
1. docs/PHASE2_MASTERBRIEF.md   ← brief completo con tareas, archivo:línea y fixes
2. docs/TODO_PHASE2.md          ← COLA DE TRABAJO: el primer ítem sin [x] es lo que harás

─── LÓGICA DE SESIÓN ──────────────────────────────────────────────────────────

Mira cuál es el primer ítem sin [x] en la COLA DE TRABAJO de TODO_PHASE2.md:

CASO A — el ítem es técnico (Módulos A / B / C / E / F / G):
  Ejecútalo directamente. Lee solo los archivos citados en ese ítem del brief.

CASO B — el ítem es D.all (Módulo D · Brainstorming):
  Antes de empezar, lee TAMBIÉN:
    - CLAUDE.md §1 (proyecto) · §3 (estructura) · §7 (puntos) · §8 (reglas) · §9 (roadmap)
    - docs/STATUS.md
  Esta sesión NO escribe código. Produce docs/PHASE2_FEATURE_PROPOSALS.md con:
    · Análisis D.1-D.8: situación actual → problema → 2-3 propuestas (pros/contras/esfuerzo S-M-L) → recomendación
    · Sección libre: propuestas nuevas no listadas en D.x
    · Ranking top 5: archivos a tocar, sprint estimado, dependencias, riesgo
  Commit al cerrar: docs(phase2): feature proposals v1

─── REGLAS PARA TODO EL TRABAJO ───────────────────────────────────────────────

NO TOCAR nunca:
  pointsCalculator.ts · negotiationEngine.ts · lib/prisma.ts (singleton)
  rutas V1 · aislamiento coupleId app-level · Tailwind mobile-first max-w-[500px]

Antes de cada commit (módulos técnicos):
  cd src/backend && npx prisma generate && npm run type-check   → 0 errores
  npm run test:e2e                                              → 12 tests verdes
  (si solo tocas frontend: cd src/frontend && npx tsc --noEmit → 0 errores)

Formato de commit:
  tipo(scope): descripción corta
  Co-Authored-By: claude-flow <ruv@ruv.net>

Al llegar al 75% de contexto (~150k tokens):
  1. Commit de lo que esté verde
  2. Marca [x] el ítem si está completo, o escribe el avance en TODO_PHASE2.md
  3. Para. No empieces nada nuevo.

Si te bloqueas en cualquier punto:
  Escribe el bloqueo en la sección BLOQUEOS de TODO_PHASE2.md (qué · por qué · decisión · riesgo)
  y pasa al siguiente ítem o para.

─── INICIO ────────────────────────────────────────────────────────────────────

Dime en 2 líneas qué vas a hacer en esta sesión (basado en el TODO).
Luego ejecútalo.
```

---

## Referencia rápida de módulos

| Módulo | Tipo | Sesiones est. | Qué hace |
|--------|------|---------------|----------|
| **A** | Código | 1 | Math.random→crypto, IDOR audit, npm audit |
| **B** | Código | 1-2 | Lazy loading (898KB→~200KB), DB indexes, N+1 |
| **C** | Código | 1 | Dead code, error boundaries, any types |
| **D** | **Solo docs** | 1 | Brainstorming: análisis features + propuestas |
| **E** | Código | 1 | Empty states, PWA install, a11y, dark mode |
| **F** | Código | 1 | E2E visual, contract tests, cobertura |
| **G** | Código | 1 | Capacitor, rate limiting, decisiones arq. |

**Total estimado: 7-9 sesiones de ~5h.**

---

## Cómo ver el progreso en cualquier momento

```
Lee docs/TODO_PHASE2.md y dime en menos de 10 líneas:
qué está hecho, en qué ítem se quedó la última sesión,
cuántos ítems pendientes quedan y cuál es el siguiente.
No hagas ningún cambio.
```
