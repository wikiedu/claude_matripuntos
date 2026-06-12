# GUIÓN DE SESIONES — Fase 2 Matripuntos
## Plan Max · High Effort · Copy-paste directo

> Tienes DOS prompts. Nada más. El modelo lee `TODO_PHASE2.md` al arrancar y
> sabe exactamente dónde está sin que tú le digas nada. Tú solo gestionas
> cuándo hacer `/clear`.

---

## Antes de cada sesión (siempre los mismos 2 comandos)

```
/effort high
```
*(el modelo ya está en max si tienes el plan activo)*

---

## PROMPT A — Universal (úsalo en el 90% de las sesiones)

> Cópíalo entero. Funciona para todos los módulos EXCEPTO el de brainstorming (D).
> Después de cada `/clear`, pega este mismo prompt. El modelo lee el TODO y continúa.

```
Eres el ejecutor de la Fase 2 de Matripuntos (rama main, tag v2.9.0).

Lee en este orden antes de hacer NADA:
1. docs/PHASE2_MASTERBRIEF.md  ← brief completo: qué hacer, archivo:línea, fixes
2. docs/TODO_PHASE2.md          ← estado vivo: de aquí sabes exactamente por dónde seguir

Coge el PRIMER ítem marcado como pendiente [ ] en TODO_PHASE2.md y trabájalo.
Si el ítem es del Módulo D (brainstorming), sáltalo y ve al siguiente módulo —
el Módulo D tiene su propio prompt especial.

Reglas inamovibles:
- NO TOCAR: pointsCalculator.ts · negotiationEngine.ts · lib/prisma.ts (singleton)
  · rutas V1 · aislamiento coupleId app-level · Tailwind mobile-first max-w-[500px]
- Antes de cada commit:
    cd src/backend && npx prisma generate && npm run type-check   → 0 errores
    npm run test:e2e                                              → 12 tests verdes
- Si tocas solo frontend: npx tsc --noEmit en src/frontend → 0 errores
- Una pieza lógica por commit. Cada commit cierra con:
    Co-Authored-By: claude-flow <ruv@ruv.net>
- Al llegar al 75% de contexto (~150k tokens):
    1. Haz commit de lo que esté verde
    2. Marca el ítem como [x] o anota el bloqueo en TODO_PHASE2.md
    3. Para. No empieces nada nuevo.
- Si te bloqueas: escribe en TODO_PHASE2.md qué/por qué/decisión/riesgo. Para.

Empieza con 2 líneas confirmando qué tarea vas a hacer (basado en el TODO).
Luego ejecútala.
```

---

## PROMPT B — Brainstorming (solo para el Módulo D)

> Úsalo cuando en el TODO los módulos A/B/C estén todos hechos, o cuando
> explícitamente quieras la sesión de análisis y propuestas.
> Esta sesión NO escribe código — solo produce `docs/PHASE2_FEATURE_PROPOSALS.md`.

```
Eres el analista de producto de la Fase 2 de Matripuntos (main, tag v2.9.0).

Lee en este orden antes de empezar:
1. docs/PHASE2_MASTERBRIEF.md §5 (Módulo D — los 8 puntos de análisis)
2. docs/TODO_PHASE2.md
3. CLAUDE.md §1 · §3 · §7 · §8 · §9  ← contexto del proyecto, features, roadmap, puntos
4. docs/STATUS.md                     ← qué hay en producción hoy

Esta sesión NO escribe código de producción.
Tu único output es el archivo docs/PHASE2_FEATURE_PROPOSALS.md con:

  Para cada punto D.1-D.8:
  - Situación actual (cómo funciona hoy)
  - Problema o fricción detectada
  - 2-3 propuestas concretas con pros, contras y esfuerzo S/M/L
  - Recomendación final razonada

  Sección libre (después de D.8):
  - Propuestas que no están en los D.x pero tienen sentido para Matripuntos
    (inspiradas en el roadmap, stack, comportamiento de parejas reales)

  Ranking final:
  - Top 5 propuestas más impactantes: qué archivos tocar, sprint estimado,
    dependencias técnicas, riesgo

Al 75% de contexto: guarda el archivo en el estado que esté + commit:
  docs(phase2): feature proposals — parcial sesión X
Al terminar: commit final:
  docs(phase2): feature proposals v1

Empieza con un índice de los 8 puntos que vas a analizar. Luego desarrolla uno a uno.
```

---

## Flujo completo de las sesiones

```
Sesión 1
  /effort high → pegar PROMPT A
  → modelo trabaja Módulo A (seguridad S0/S1)
  → al 75%: commitea + para

/clear

Sesión 2
  /effort high → pegar PROMPT A  ← exactamente el mismo
  → modelo lee TODO, sigue donde se quedó (resto del A o empieza B)
  → al 75%: commitea + para

/clear

Sesión 3
  /effort high → pegar PROMPT A
  → sigue (B, C, lo que toque)

...cuando A/B/C estén hechos (o cuando quieras el análisis)...

Sesión N (brainstorming)
  /effort high → pegar PROMPT B
  → produce docs/PHASE2_FEATURE_PROPOSALS.md
  → al 75%: commit parcial

/clear

Sesión N+1
  /effort high → pegar PROMPT A (vuelve al universal)
  → sigue con E, F, G
```

**Regla de oro:** después de cada `/clear`, pega siempre PROMPT A.
Solo cambias a PROMPT B cuando quieres la sesión de brainstorming explícitamente.

---

## Control de progreso (opcional, en cualquier momento)

Si quieres saber dónde estás sin empezar trabajo:

```
Lee docs/TODO_PHASE2.md y dime en menos de 10 líneas:
- Qué módulos están completamente hechos
- En qué ítem se quedó la última sesión
- Cuántos ítems pendientes quedan
- Próximo ítem recomendado
No hagas ningún cambio, solo el resumen.
```

---

## Referencia rápida de módulos y tiempo estimado

| Módulo | Qué hace | Sesiones est. |
|--------|----------|---------------|
| **A** Seguridad | Math.random→crypto, IDOR invitations, npm audit | 1 |
| **B** Performance | Lazy loading (898KB→~200KB), DB indexes, N+1 | 1-2 |
| **C** Deuda técnica | Dead code, error boundaries, any types, plan V2→V1 | 1 |
| **D** Brainstorming | Análisis features + propuestas UX/lógica/roadmap | 1 |
| **E** UX/UI | Empty states, PWA install prompt, a11y, dark mode | 1 |
| **F** Testing | E2E visual Tasks/Calendar, contract tests, cobertura | 1 |
| **G** Architecture | Capacitor readiness, Realtime, rate limiting audit | 1 |

**Total estimado: 7-9 sesiones de 5h.**
