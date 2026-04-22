# Join-Code Signup — Design Spec

**Fecha:** 2026-04-22
**Autor:** sesión Claude Code con Edu
**Estado:** aprobado pendiente de implementación
**Tracking:** tarea #52

## Contexto y problema

El flujo de invitación actual requiere:

1. Usuario A genera una invitación en Ajustes introduciendo el email del partner.
2. Backend emite token único (64 hex) con caducidad de 7 días y link `${FRONTEND_URL}/onboarding/join/<token>`.
3. Usuario A copia y envía el link manualmente.
4. Usuario B abre el link — frontend valida contra `GET /api/auth/invitation/:token`.
5. Si válido, pantalla con **email bloqueado al valor de la invitación**, nombre y password → `POST /api/auth/register-with-invitation` → cuenta y vinculación.

Este flujo falla de forma opaca por cinco causas reales:

- **Caducidad:** invitaciones viejas (>7 días) devuelven 410.
- **Un solo uso:** tras aceptar una vez, `status='accepted'` → cualquier re-uso devuelve 410.
- **`FRONTEND_URL` mal configurado en Render** → links que apuntan a un dominio donde la SPA no existe.
- **Email-lock rígido:** el invitado no puede registrarse con un email distinto al que escribió el invitador.
- **Usuario ya logueado:** el código de `Onboarding.tsx` asume que si hay `user` + token, redirige al wizard `StepRules`, lo cual rompe si el usuario actual pertenece a otra pareja.

El mensaje de error del frontend además es genérico ("No pudimos validar la invitación") porque `StepJoinAccount.tsx:49-52` matchea el código HTTP por substring del mensaje y el backend no lo incluye.

Resultado: **los testers no pueden completar el signup** por el link que se les comparte. Bloquea la fase de beta con amigos.

## Objetivo

Flujo de pareja basado en **código permanente de 6 caracteres** asociado al modelo `Couple`, compartible verbalmente o como query-param, sin caducidad, sin email-lock, con una sola pantalla de signup.

**Criterio de éxito:** un tester recibe el código `K7X9M4` de su amigo, entra en `keepitup.io/signup?code=K7X9M4`, rellena email + nombre + password, y tras submit está en el dashboard ya vinculado a la pareja — sin pasos intermedios ni caducidades.

## Alcance

**Dentro:**
- Campo `joinCode` nuevo en `Couple` (schema + migración + backfill).
- Endpoint público `POST /api/auth/register-with-code`.
- Endpoint público `GET /api/auth/couple-preview/:code`.
- Card de compartir código en Ajustes → Tu Pareja.
- Rediseño del `/signup` para aceptar `?code=X`.
- Tests unitarios (backend) y de render (frontend).
- Deploy en staging/producción con verificación manual.

**Fuera:**
- Eliminar el flujo antiguo de token (`/api/auth/invite-partner`, `/api/auth/invitation/:token`, `/api/auth/register-with-invitation`, `/onboarding/join/:token`). Se quedan funcionales para no romper links ya enviados, marcados como deprecated en comentarios.
- Cambios en `Couple.secretKey` (queda intacto, uso interno).
- Migrar usuarios existentes — todos tienen pareja ya.

## Diseño técnico

### 1. Modelo de datos

En `src/backend/prisma/schema.prisma`, añadir a `Couple`:

```prisma
model Couple {
  // ... campos existentes
  joinCode   String   @unique  // 6 chars mayúsculas/números sin confundibles
  // ...
  @@index([joinCode])
}
```

**Migración:** `prisma migrate dev --name add-couple-join-code`.

**Backfill:** script idempotente ejecutado una vez en dev y una vez en prod:
- Para cada `Couple` con `joinCode === null`, generar código único (retry hasta colisión) y guardarlo.
- Script en `src/backend/prisma/backfill-join-codes.ts`, ejecutable con `ts-node`.
- En Render: correr el script post-deploy una vez manualmente vía shell.

### 2. Generador de código

Nuevo helper `src/backend/src/utils/joinCode.ts`:

```ts
// Excluye confundibles: 0, O, 1, I, L. Deja 32 caracteres.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateJoinCode(): string {
  let s = ''
  for (let i = 0; i < 6; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return s
}

export async function generateUniqueJoinCode(
  prisma: PrismaClient,
  maxAttempts = 5
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateJoinCode()
    const existing = await prisma.couple.findUnique({ where: { joinCode: code } })
    if (!existing) return code
  }
  throw new Error('Could not generate unique join code after 5 attempts')
}
```

Cardinalidad: 32⁶ ≈ 1,073M combinaciones. Para ~10k parejas, probabilidad de colisión por intento ≈ 0.001%, sobrado con 5 retries.

### 3. Endpoints backend

Nuevo router o ampliación de `authRoutes.ts`.

**`GET /api/auth/couple-preview/:code`** — público, rate-limited (reusa `authLimiter`).

Request: param `code`, normalizado a mayúsculas.

Response 200:
```json
{ "valid": true, "inviterName": "Edu", "isFull": false }
```

Response 404:
```json
{ "valid": false, "error": "Código no encontrado" }
```

Response 400 (pareja ya tiene 2 usuarios):
```json
{ "valid": true, "inviterName": "Edu", "isFull": true, "error": "Esta pareja ya está completa" }
```

**`POST /api/auth/register-with-code`** — público, rate-limited.

Request body:
```json
{ "email": "blanca@mail.com", "password": "min8chars", "name": "Blanca", "joinCode": "K7X9M4" }
```

Response 201:
```json
{ "message": "Account created and linked", "token": "jwt...", "user": { ... }, "couple": { ... } }
```

Response 400 si email ya registrado, pareja llena, o código inválido. Siempre con mensaje específico:
- `"Código de pareja no encontrado"` (404)
- `"Esta pareja ya está completa"` (400)
- `"Ya tienes cuenta con este email. Inicia sesión."` (400)
- Errores Zod estándar.

Lógica:
1. Normalizar `joinCode.toUpperCase()`.
2. `prisma.couple.findUnique({ where: { joinCode }, include: { users: true } })`.
3. Si no existe → 404.
4. Si `couple.users.length >= 2` → 400.
5. Si email ya existe → 400.
6. `bcryptjs.hash(password, 10)`.
7. `prisma.user.create({ data: { coupleId, email, passwordHash, name, hasCompletedOnboarding: true } })`.
8. Firmar JWT con `{ userId, coupleId }`, 7d.
9. Responder.

**Modificar `signupCouple`** en `authService.ts` para generar `joinCode` al crear la pareja (usa `generateUniqueJoinCode`).

### 4. Frontend — `apiClient`

Añadir en `src/frontend/src/services/apiClient.ts`:

```ts
auth = {
  // ... existente
  previewCouple: (code: string) =>
    this.request(`/auth/couple-preview/${encodeURIComponent(code)}`),

  registerWithCode: (data: { email: string; password: string; name: string; joinCode: string }) =>
    this.request('/auth/register-with-code', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}
```

### 5. Frontend — Ajustes Card

En `Settings.tsx` (o donde esté la pantalla de Tu Pareja), añadir nueva card al top:

```
┌────────────────────────────────────────┐
│ 💕  Invita a tu pareja                 │
│                                        │
│     Vuestro código                     │
│     ┌──────────────────┐               │
│     │    K7X9M4        │  [Copiar]     │
│     └──────────────────┘               │
│                                        │
│     O comparte este link:              │
│     keepitup.io/signup?code=K7X9M4     │
│     [Copiar link]  [Compartir]         │
│                                        │
│     Dale el código o el link a tu      │
│     pareja para que se una.            │
└────────────────────────────────────────┘
```

- El botón "Compartir" usa `navigator.share()` si está disponible; si no, cae a copiar-al-clipboard con toast "Link copiado".
- El link se arma desde `window.location.origin + '/signup?code=' + couple.joinCode`.
- El código se lee desde `useAppStore().couple.joinCode` (hay que exponerlo desde `GET /api/auth/couple`).

**Cambio en `GET /api/auth/couple`:** incluir `joinCode` en el response payload.

El antiguo botón "Invitar por email" queda debajo, menos prominente, con un subtítulo "Alternativa: envíale un email".

### 6. Frontend — `/signup`

Refactorizar la página de signup existente (`src/frontend/src/pages/Signup.tsx` o equivalente) para manejar ambos modos.

**Al montar:**
```tsx
const params = new URLSearchParams(useLocation().search)
const code = params.get('code')?.toUpperCase() ?? null
```

Si hay `code`:
1. Llamar a `apiClient.auth.previewCouple(code)` al montar.
2. Mientras carga: spinner "Comprobando código…".
3. Si `isFull=true`: mostrar error "Esta pareja ya está completa" + botón "Crear pareja nueva" (que vacía el code).
4. Si `valid=false`: mostrar error "Código no reconocido. Comprueba que está bien escrito." con campo editable para corregirlo.
5. Si válido: mostrar banner "Te unirás a la pareja de Edu" arriba del formulario.

Formulario (único, un paso):
- Campos: email, nombre, password (8+ chars).
- Submit:
  - Si hay code válido → `registerWithCode({...form, joinCode: code})`.
  - Si no hay code → crear pareja nueva con la API ya existente (`signupCouple` o similar — preservar flujo actual).
- Tras éxito: `apiClient.setToken(res.token)`, `loadUserData()`, `navigate('/dashboard')`.

**El nuevo signup con código NUNCA entra al wizard.** `hasCompletedOnboarding=true` se marca desde el backend al crear el usuario.

### 7. Casos límite

| Caso | Comportamiento esperado |
|---|---|
| Código en minúsculas en URL | Backend + frontend normalizan a mayúsculas antes de buscar |
| Código con caracteres inválidos (`0/O/1/I/L`) | 404 desde backend (no existe); frontend muestra "Código no reconocido" |
| Pareja ya con 2 miembros | 400 con mensaje claro; frontend ofrece "Crear pareja nueva" |
| Email duplicado con code válido | 400 "Ya tienes cuenta, inicia sesión"; link a `/login` |
| Rate-limit exceeded | Mensaje "Demasiados intentos, espera unos minutos" |
| Link viejo de token (`/onboarding/join/:token`) | Sigue funcionando — no se toca ese flujo |
| DB sin `joinCode` (couple antigua sin backfill) | No debería ocurrir tras backfill; si pasa, backend devuelve 404 al preview |

### 8. Testing

**Backend** (`src/backend/tests/joinCode.test.ts`):
- `generateJoinCode` produce 6 chars del alfabeto seguro.
- `generateUniqueJoinCode` retry ante colisión simulada.
- `POST /register-with-code` happy path (couple con 1 user → crea 2do).
- `POST /register-with-code` 400 si email duplicado.
- `POST /register-with-code` 400 si pareja llena.
- `POST /register-with-code` 404 si código no existe.
- `GET /couple-preview/:code` happy path.
- `GET /couple-preview/:code` 404 si no existe.
- `GET /couple-preview/:code` devuelve `isFull=true` correctamente.

**Frontend** (Vitest + RTL):
- Ajustes Card muestra código y link correctamente.
- Botón "Copiar código" invoca `navigator.clipboard.writeText`.
- `/signup?code=X` renderiza banner con nombre del invitador tras preview exitoso.
- `/signup?code=INVALID` muestra error y permite crear pareja nueva.
- `/signup` sin code renderiza formulario normal de pareja nueva.

### 9. Plan de deploy

1. Crear branch `feature/v1.4-join-code-signup` desde main.
2. Migración local + tests backend en verde.
3. Tests frontend en verde.
4. Deploy backend a Render (auto-deploy desde main tras merge).
5. Correr `backfill-join-codes.ts` manualmente en la shell de Render contra Supabase.
6. Deploy frontend vía FTP (`lftp`) con credenciales de `.deploy-credentials`.
7. Verificación manual en producción:
   - Login con Edu → Ajustes → ver código → copiar link.
   - Abrir link en navegador privado → registrarse con email nuevo → verificar dashboard + ambos usuarios en `/auth/couple`.
   - Probar flujo sin code (registrarse como pareja nueva) → verifica no-regresión.
8. Commit tag `v1.4-join-code`.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Backfill falla en medio para alguna pareja | Script idempotente; puede re-correrse sin efectos |
| Código colisiona en producción | Retry hasta 5 veces + error claro si falla; en escala actual (~10 parejas) imposible |
| Usuarios confunden `joinCode` con `secretKey` | No se expone `secretKey` en UI; claro que el "código" es lo único compartible |
| Link antiguo de invitación roto no se arregla | Explícitamente fuera de alcance; si sigue fallando tras este cambio, es un bug aparte a tratar en v1.5 |
| Rate limit bloquea a testers | `authLimiter` ya está en 20/15min; suficiente para testers |

## Cosas que NO hacemos (YAGNI)

- No validamos formato del código en frontend antes del preview — lo deja al backend (fuente de verdad).
- No enviamos emails desde este flujo — es 100% compartir manual.
- No rotamos el `joinCode` ni ofrecemos regenerarlo (si alguien lo "lleva fuera", cambia de pareja o tras el beta añadimos rotación).
- No guardamos métricas de uso de código vs registro directo (telemetry out of scope).

## Checklist de auto-revisión

- [x] Sin placeholders "TBD" o "a decidir".
- [x] Cada endpoint nuevo tiene método, path, request/response explícitos.
- [x] Tipos y nombres consistentes entre secciones (`joinCode` en todos, nunca `joinCode`/`code`/`couplecode` mezclados).
- [x] Alcance acotado a un feature; no arrastra refactors no relacionados.
- [x] Casos límite explícitos y comportamiento definido.
- [x] Plan de rollout descrito y ejecutable.
