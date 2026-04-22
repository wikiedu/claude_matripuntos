# v1.4 Join-Code Signup — Smoke E2E manual

Ejecutar tras desplegar (o contra un entorno staging con postgres levantado).

## Precondiciones

- Backend corriendo contra postgres con la migración `20260422010000_add_couple_join_code` aplicada.
- Script `prisma/backfill-join-codes.ts` ejecutado una vez (si hay parejas pre-v1.4).
- Frontend servido desde el mismo host que el backend o con `VITE_API_URL` apuntando bien.

## Paso a paso

1. **Signup solo** — abre incógnito → `/signup` → crea cuenta (sin `?code=`).
   - Esperado: 201 → navegas a `/onboarding` como antes.
2. **Ver joinCode en Settings** — en la cuenta solo, ve a Settings → Pareja.
   - Esperado: aparece la tarjeta "🔑 Código de pareja" con 6 caracteres.
   - Verifica: alfabeto no incluye `0/O/1/I/L`.
   - Copia el código y el enlace.
3. **Preview del código (sin cuenta)** — abre otro incógnito → `/signup?code=<CODE>`.
   - Esperado: banner morado "Te unes al hogar de <nombre>".
   - Formulario activo.
4. **Register-with-code** — completa email/pwd/nombre → submit.
   - Esperado: 201 → navegas a `/home` (NO a `/onboarding`).
   - Tu cuenta está vinculada al couple original.
   - El miembro original recibe notificación "🎉 Tu pareja se ha unido".
5. **Código llenado** — repite paso 3 con el mismo código desde otro incógnito.
   - Esperado: banner rojo "Este hogar ya está completo".
   - Botón de submit deshabilitado.
6. **Código inválido** — visita `/signup?code=ZZZZZZ`.
   - Esperado: banner amarillo "No encontramos el código".
   - Puedes seguir adelante y crear cuenta normal.
7. **Código mal formado** — visita `/signup?code=ABC`.
   - Esperado: banner rojo "El código del enlace no es válido".
8. **Rate limit** — hit `GET /api/auth/couple-preview/ABCDEF` > 20 veces en 15 min.
   - Esperado: el 21º devuelve 429 "Too many requests".

## Endpoints nuevos

- `GET  /api/auth/couple-preview/:code` — 200 / 400 / 404
- `POST /api/auth/register-with-code` — 201 / 400 / 404 / 409
- `GET  /api/auth/couple` ahora incluye `joinCode` en el payload.

## Qué cubren los tests automáticos

- `tests/joinCode.test.ts` (12 tests) — alfabeto, longitud, uniformidad, normalización.
- `tests/pointsCalculator.test.ts` + `tests/insightHeuristic.test.ts` — sin cambios, siguen verdes.
- Frontend: 42 tests, sin cambios; Signup/Settings no tienen tests dedicados aún.

## Qué NO cubren y requiere validación manual

- Endpoints `/couple-preview/:code` y `/register-with-code` contra postgres real.
- Redirect a `/home` vs `/onboarding` según flujo.
- Notificación "partner_joined" al miembro existente.
- Copy-to-clipboard en Settings (navigator.clipboard requiere https o localhost).
