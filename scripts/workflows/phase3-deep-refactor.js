export const meta = {
  name: 'phase3-deep-refactor',
  description: 'Auditoría profunda en olas → verificación adversarial → arreglo, sobre la rama refactor/opus-4-8-phase3. Idempotente: re-lanzar salta lo ya hecho.',
  phases: [
    { title: 'Audit', detail: '5 dominios en paralelo, read-only, apoyados en graphify' },
    { title: 'Verify', detail: 'verificación adversarial por hallazgo (descarta falsos positivos)' },
    { title: 'Fix', detail: 'arreglo serializado por olas con puertas type-check/test/e2e, 1 commit por fix' },
  ],
}

// ─── Constantes ─────────────────────────────────────────────────────────────
const AUDIT_DIR = 'docs/phase3-audit'
const BRANCH = 'refactor/opus-4-8-phase3'
// Preámbulo compartido: cómo usar graphify (ahorra tokens) y reglas duras.
const PRE = `Trabajas en el repo Matripuntos (rama ${BRANCH}). Estás en modo ULTRACODE: exhaustivo, sin atajos.

CONTEXTO VÍA GRAPHIFY (úsalo ANTES de leer ficheros enteros — ahorra tokens):
  export PATH="$HOME/.local/bin:$PATH"
  graphify query "<pregunta>" --budget 1200     # contexto BFS con file:line
  graphify explain "<símbolo>"                    # vecinos de un nodo
  graphify path "A" "B"                           # camino entre dos conceptos
El grafo (src/, 2047 nodos) vive en graphify-out/graph.json. Lee ficheros concretos solo cuando graphify ya te haya localizado el file:line.

REGLAS DURAS (CLAUDE.md): no romper V1; V2 deprecada se retira solo con consumidor migrado + E2E. Prisma es singleton (import prisma from '../lib/prisma.js'). Puntos = Decimal. Errores = res.status(4xx).json({error}). Aislamiento por coupleId/userId es sagrado.`

// ─── Schemas de salida estructurada ─────────────────────────────────────────
const FINDINGS_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['domain', 'findings'],
  properties: {
    domain: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'severity', 'title', 'file', 'line', 'evidence', 'proposedFix', 'confidence'],
        properties: {
          id: { type: 'string', description: 'estable: <domainKey>-<n>, ej A2-3' },
          severity: { type: 'string', enum: ['S0', 'S1', 'S2', 'S3'] },
          title: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'number' },
          evidence: { type: 'string', description: 'por qué es un problema, con cita de código' },
          proposedFix: { type: 'string' },
          confidence: { type: 'string', enum: ['alta', 'media', 'baja'] },
        },
      },
    },
  },
}
const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['id', 'isReal', 'finalSeverity', 'reasoning'],
  properties: {
    id: { type: 'string' },
    isReal: { type: 'boolean', description: 'true solo si reproducible/cierto tras intentar refutarlo' },
    finalSeverity: { type: 'string', enum: ['S0', 'S1', 'S2', 'S3'] },
    reasoning: { type: 'string' },
  },
}
const FIX_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['id', 'applied', 'skipped', 'commit', 'filesChanged', 'verification', 'notes'],
  properties: {
    id: { type: 'string' },
    applied: { type: 'boolean' },
    skipped: { type: 'boolean', description: 'true si ya estaba commiteado (idempotencia)' },
    commit: { type: 'string', description: 'hash corto o "" si no se aplicó' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    verification: { type: 'string', description: 'salida resumida de type-check/test/build' },
    notes: { type: 'string' },
  },
}

// ─── Dominios de auditoría (Fase A) ─────────────────────────────────────────
const DOMAINS = [
  {
    key: 'A2-random-tasks-bug', wave: 1,
    title: 'Bug: tareas que se crean solas',
    prompt: `${PRE}

OBJETIVO: causa raíz del bug "se crean tareas en una cuenta sin que el usuario las cree".
Traza con graphify + lectura puntual: recurringTaskService.runWeeklyGeneration() (cron lunes 08:00, ¿quién lo programa?), generateOnCreate(), generateInstancesForCouple(); seed de tareas por defecto en signup/onboarding; bootstrapCatalog / ACTIVITY_TEMPLATES_SEED + runRetention(); demoService; cualquier createMany de Task/TaskLog. Para CADA vector di si genera Task (definición) o TaskLog (instancia) y bajo qué condición dispara sin acción del usuario. Identifica la causa raíz más probable y propón fix mínimo y seguro (no romper recurrencia legítima).`,
  },
  {
    key: 'A3-responsiveness', wave: 1,
    title: 'Responsiveness Tareas + Responsabilidades(Activities)',
    prompt: `${PRE}

OBJETIVO: problemas de responsiveness ("es un drama") en Tareas y Responsabilidades.
Audita: pages/Tasks.tsx, components/v2/tasks/*, pages/Activities.tsx, pages/ActivityDetail.tsx, components/v2/activities/*. Busca: anchos/altos fijos en px que desbordan en móvil, ausencia de breakpoints (sm:/md:), grids/flex que no colapsan, overflow horizontal, texto/botones que se salen, tap targets <44px, safe-area faltante. Da file:line y el fix Tailwind concreto. App es dark-only y mobile-first.`,
  },
  {
    key: 'A1-two-user-security', wave: 2,
    title: 'Lógica 2-usuarios + seguridad backend',
    prompt: `${PRE}

OBJETIVO: corrección y seguridad de la lógica entre los dos usuarios de la pareja.
Para CADA ruta/servicio relevante verifica: scoping por coupleId/userId forzado (IDOR), fugas de PII; integridad de PointsTransaction (saldo = Σ amount, sin doble conteo); negociación V1 (rondas, force paga del saldo propio, contraoferta); verify/dispute de TaskLog + auto-accept 24h; rotación de refresh tokens + reuse detection; invitación/link-partner; account/couple lifecycle (pause/leave/delete + anonimización). Prioriza S0/S1 reales y reproducibles.`,
  },
  {
    key: 'A4-functionality', wave: 3,
    title: 'Funcionalidad end-to-end',
    prompt: `${PRE}

OBJETIVO: flujos rotos o incompletos de cara al usuario, por dominio (puntos, calendario, journal, logros, shopping/todos, notificaciones, analytics). Incluye desajustes de contrato front↔back y con packages/shared (un campo que el front espera y el back no manda, o viceversa). Da el flujo, dónde se rompe (file:line) y el fix.`,
  },
  {
    key: 'A5-quality-deadcode', wave: 4,
    title: 'Calidad backend + arquitectura + dead code',
    prompt: `${PRE}

OBJETIVO: deuda técnica de alto valor: manejo de errores inconsistente, validación Zod faltante en entradas, dead code real (no exportado/no usado), N+1 restantes, deuda V1/V2. Solo hallazgos accionables con fix claro; nada cosmético.`,
  },
]

// ─── FASE A — Auditoría (paralela, read-only, idempotente) ──────────────────
phase('Audit')
const audits = await parallel(DOMAINS.map(d => () =>
  agent(
    `${d.prompt}

IDEMPOTENCIA: si ${AUDIT_DIR}/${d.key}.json ya existe y tiene findings, LÉELO y devuelve su contenido tal cual (no re-audites).
Si no, audita y ESCRIBE el resultado (objeto {domain, findings}) en ${AUDIT_DIR}/${d.key}.json antes de devolverlo.
IDs de findings estables con prefijo "${d.key.split('-')[0]}-".`,
    { label: `audit:${d.key}`, phase: 'Audit', schema: FINDINGS_SCHEMA, agentType: 'general-purpose', effort: 'high' }
  ).then(r => ({ ...r, wave: d.wave }))
))

const allFindings = audits.filter(Boolean).flatMap(a =>
  (a.findings || []).map(f => ({ ...f, domain: a.domain, wave: a.wave }))
)
log(`Auditoría: ${allFindings.length} hallazgos en ${audits.filter(Boolean).length}/${DOMAINS.length} dominios`)

// ─── FASE B — Verificación adversarial por hallazgo ─────────────────────────
phase('Verify')
const verified = await parallel(allFindings.map(f => () =>
  agent(
    `${PRE}

Verifica adversarialmente este hallazgo — INTENTA REFUTARLO. Marca isReal=false si no es reproducible, ya está mitigado, o es falso positivo. Ante la duda, isReal=false.
HALLAZGO: ${JSON.stringify({ id: f.id, severity: f.severity, title: f.title, file: f.file, line: f.line, evidence: f.evidence })}`,
    { label: `verify:${f.id}`, phase: 'Verify', schema: VERDICT_SCHEMA, agentType: 'general-purpose' }
  ).then(v => ({ ...f, verdict: v }))
))

const SEV = { S0: 0, S1: 1, S2: 2, S3: 3 }
const confirmed = verified
  .filter(Boolean)
  .filter(f => f.verdict && f.verdict.isReal)
  .map(f => ({ ...f, severity: f.verdict.finalSeverity || f.severity }))
  .sort((a, b) => (a.wave - b.wave) || (SEV[a.severity] - SEV[b.severity]))
log(`Confirmados ${confirmed.length}/${allFindings.length} hallazgos reales`)

// Persistir hallazgos confirmados en disco (el script no escribe; lo hace un agente)
await agent(
  `Escribe EXACTAMENTE este JSON en ${AUDIT_DIR}/confirmed-findings.json (créalo/sobrescríbelo) y confirma con "ok":
${JSON.stringify(confirmed, null, 2)}`,
  { label: 'persist:confirmed', phase: 'Verify', agentType: 'general-purpose' }
)

// ─── FASE C — Arreglo serializado por olas (1 commit por fix, idempotente) ──
phase('Fix')
const results = []
for (const f of confirmed) {
  // Parar con gracia si el presupuesto de tokens se agota (lo ya commiteado persiste).
  if (budget.total && budget.remaining() < 60_000) {
    log(`Presupuesto bajo (${Math.round(budget.remaining() / 1000)}k) — paro tras ${results.length} fixes. Relanzar retoma el resto.`)
    break
  }
  const r = await agent(
    `${PRE}

Aplica el arreglo de este hallazgo confirmado. PASOS:
1. IDEMPOTENCIA: ejecuta \`git log --oneline -50 | grep "\\[p3:${f.id}\\]"\`. Si aparece, este fix YA está hecho → devuelve {applied:true, skipped:true, commit:"<hash>", ...} sin tocar nada.
2. Verifica que estás en la rama ${BRANCH} (no en main). Si no, para y reporta.
3. Implementa el fix mínimo y correcto. Respeta las reglas duras del preámbulo.
4. PUERTAS DE VERIFICACIÓN (todas deben pasar antes de commitear):
   - backend: \`cd src/backend && npm run type-check\` (0 errores).
   - si tocaste lógica backend testeable: \`npm test\` (las suites unit deben pasar; las 6 DB-bound que requieren Postgres NO son regresión).
   - si tocaste frontend: \`cd src/frontend && npx tsc --noEmit\` y \`npm run build\`.
5. Commit SOLO de los ficheros del fix, mensaje: "fix(p3): <título> [p3:${f.id}]" + Co-Authored-By: claude-flow <ruv@ruv.net>.
6. Si una puerta falla y no puedes resolverlo limpiamente, NO commitees: devuelve applied:false con el motivo en notes.

HALLAZGO: ${JSON.stringify({ id: f.id, severity: f.severity, title: f.title, file: f.file, line: f.line, evidence: f.evidence, proposedFix: f.proposedFix })}`,
    { label: `fix:${f.id}`, phase: 'Fix', schema: FIX_SCHEMA, agentType: 'general-purpose', effort: 'high' }
  )
  results.push(r)
}

const applied = results.filter(r => r && r.applied && !r.skipped).length
const skipped = results.filter(r => r && r.skipped).length
const failed = results.filter(r => r && !r.applied).length
log(`Fixes: ${applied} aplicados · ${skipped} ya estaban · ${failed} sin aplicar`)

return {
  audited: allFindings.length,
  confirmed: confirmed.length,
  applied, skipped, failed,
  pending: confirmed.length - results.length,
  results,
}
