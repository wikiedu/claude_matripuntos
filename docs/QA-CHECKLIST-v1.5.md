# QA Checklist — v1.5 Red de Seguridad

**Objetivo:** confirmar end-to-end, con dos cuentas reales en navegadores distintos, que todo lo que shippamos el 2026-04-22 funciona en producción antes de aplicar el tag `v1.5` en `main`.

**Setup:**
- **Cuenta A** (navegador normal) — email propio
- **Cuenta B** (ventana privada / otro navegador) — segundo email o el demo si habilitas `DEMO_MODE_ENABLED=true` en Render
- **URLs:**
  - Frontend: https://matripuntos.keepitup.io (o el dominio vivo)
  - Backend: https://matripuntos-api.onrender.com/api
  - Health: https://matripuntos-api.onrender.com/api/health

**Lee antes de empezar:**
- `docs/ROADMAP.md` sección v1.5 → "Entregado en v1.5"
- Cualquier error no trivial: copia el mensaje, el timestamp, y el commit actual desde `/api/health`

---

## 0. Smoke infra

- [ ] `/api/health` responde `{status:"ok", db:"ok"}` con `lastMigration=20260422110000_add_user_last_seen_at`
- [ ] Frontend carga en <3s, sin errores rojos en la consola
- [ ] Login con cuenta A funciona; cierra sesión; login con cuenta B funciona

---

## 1. Tour interactivo (#15)

- [ ] **Cuenta A** ya hizo onboarding: al entrar al Dashboard, NO aparece el tour (ya lo vio alguna vez)
  - Si aparece: limpia `localStorage.matripuntos_tour_v1_seen` y repite para probar
- [ ] **Cuenta B** en ventana privada (simulando "primer login post-onboarding"): aparece el modal de tour
- [ ] Los 5 pasos navegan con "Siguiente" / "Saltar" / cierre por X
- [ ] Tras cerrar el tour, recarga → NO reaparece
- [ ] `localStorage.matripuntos_tour_v1_seen === '1'` después de cerrarlo

## 2. Demo mode (#14)

> Solo si habilitas `DEMO_MODE_ENABLED=true` en Render → re-deploy automático.

- [ ] Con el flag `false` (default): en /login NO aparece el botón "Probar con datos de ejemplo"
- [ ] Con el flag `true`: aparece el botón
- [ ] Click en el botón crea la pareja demo en la primera llamada (tarda ~1s extra)
- [ ] Aterrizas en /dashboard como "Ana (demo)" con 3 txns pre-seed (Ana 13pts vs Leo 6pts aprox.)
- [ ] Un segundo click al demo NO crea una pareja nueva: reutiliza la existente (confirma con Prisma Studio o un query a `/api/points/balance`)
- [ ] La pareja demo NO colisiona con cuentas reales — no aparece en listados, etc.

## 3. Presencia / último visto (#5)

- [ ] **Cuenta A** inicia sesión; **Cuenta B** abre el Dashboard → bajo "Cuenta A" debe poner "en línea ahora" (verde)
- [ ] **Cuenta A** cierra el navegador (no logout, solo cerrar). Espera 3 min.
- [ ] **Cuenta B** recarga: debe poner "hace 3 min" (gris)
- [ ] A los 60 min debe poner "hace 1 h"
- [ ] Si `lastSeenAt` no existe (usuario antiguo que no ha tocado la app): no muestra pill (null handling)
- [ ] **Prisma Studio / SQL:** `SELECT lastSeenAt FROM "User"` se está actualizando pero no más de una vez por minuto por usuario (throttle)

## 4. Refresh global (#8)

- [ ] En el header hay un botón RefreshCw arriba a la derecha
- [ ] Click → spinner gira ≥400 ms
- [ ] Durante el spinner: si estás en Dashboard, balance / tareas / movimientos se re-fetchan (verlo en Network → múltiples requests)
- [ ] Doble-click no produce errores; el botón se desactiva durante el spinner

## 5. Notificaciones por rama (#6)

Generar notificaciones con dos cuentas:
- [ ] **A → B:** A crea un evento → B recibe `EVENT_PROPOSED`
- [ ] **B → A:** B acepta → A recibe `EVENT_RESPONSE`
- [ ] **A → B:** A completa una tarea → B recibe `TASK_COMPLETED`
- [ ] **B → A:** B disputa la tarea → A recibe `TASK_DISPUTED`
- [ ] En `/notifications`: aparecen los chips Todas / Eventos / Tareas / Pareja con contadores
- [ ] Click en "Eventos" filtra solo eventos; el recuento global no cambia
- [ ] Icono por categoría correcto (Calendar / ListChecks / Users / Inbox)
- [ ] Click en notificación de evento → /inbox; click en tarea → /tasks o /inbox según `relatedTaskLogId`

## 6. `defaultAssigneeId` por tarea (#3)

- [ ] Crear tarea en AddTaskSheet: paso 3 muestra nombres reales de los dos usuarios
- [ ] Seleccionar "yo" → `defaultAssigneeId = userIdA` en backend
- [ ] Seleccionar "pareja" → `defaultAssigneeId = userIdB`
- [ ] GET `/api/tasks` devuelve el campo correctamente
- [ ] La tarea hereda la asignación al generar el siguiente log/instancia recurrente

## 7. `CoupleHealthCard` en Settings > Pareja (#16)

- [ ] El card aparece ENCIMA del existente cuando hay pareja enlazada
- [ ] Balance pill: tono correcto (success / warn / purple)
- [ ] "Últimos 7 días": cuenta concuerda con `/api/points/history?limit=50`
- [ ] "Última actividad": respeta timezone local
- [ ] Copiar join-code: confirma con el clipboard del sistema

## 8. Tareas — empty states (#7)

- [ ] Pestaña **Verificar** sin logs pendientes → card con Sparkles + "Ir a mis tareas"
- [ ] Pestaña **Historial** sin logs → icono History + mensaje adaptado a filtro (mías/pareja/todas)
- [ ] Pestaña **Hoy** sin tareas → icono ListChecks + CTA

## 9. Recurrentes (Paso 2)

- [ ] Pausar una tarea recurrente → se detiene generación de instancias futuras
- [ ] Reactivar → vuelven a generarse
- [ ] Anular → soft delete, no reaparece en lista activa
- [ ] **Hotfix Paso 1:** editar una recurrente NO crea placeholders con 0 puntos en los días pasados

## 10. Sentry (#11)

Solo si tienes `SENTRY_DSN` configurado en Render y en el frontend (`VITE_SENTRY_DSN`).
- [ ] Backend: forzar un error (ej. enviar JSON malformado a `/api/events`) aparece en el proyecto Sentry del backend
- [ ] Frontend: lanzar un `throw new Error('test')` en la consola aparece en el proyecto Sentry del frontend
- [ ] Sin DSN: arranque normal del backend sin warnings (no-op verificado en `lib/sentry.ts`)

## 11. `/api/health` enriquecido (#12)

- [ ] Response incluye `version`, `commit` (7 chars), `uptimeSeconds`, `lastMigration`, `db`, `env`
- [ ] Comportamiento `degraded`: no se puede forzar fácilmente en prod; ya cubierto por test unitario

## 12. CI GitHub Actions (Paso 3)

- [ ] Push a `main` dispara el workflow → ambos jobs en verde (`backend — typecheck + unit tests` / `frontend — typecheck + build`)
- [ ] Un PR con un typecheck-break falla el job `Typecheck` como se espera

---

## 13. Regresión V1 (crítico)

Nada de lo siguiente puede romperse:
- [ ] Signup nueva pareja funciona
- [ ] Invitación por email + /onboarding/join funciona
- [ ] Registro con joinCode funciona (normalización mayúsculas/espacios)
- [ ] Flujo completo evento: proponer → contraofertar → aceptar → `PointsTransaction` creada
- [ ] Flujo completo tarea: crear log → 24h auto-accept (o forzar cambio de estado manualmente)
- [ ] Balance `/api/points/balance` refleja las txns
- [ ] Calendario muestra eventos + tareas en la fecha local correcta
- [ ] Analytics (overview / trends / equity) carga sin error

---

## 14. Review de seguridad

- [ ] `/api/auth/demo-login` devuelve 404 con `DEMO_MODE_ENABLED` ausente o `false`
- [ ] `authMiddleware` sigue rechazando tokens caducados y usuarios zombie
- [ ] No hay `console.log` nuevos con datos sensibles (tokens, emails de producción)
- [ ] Dependencias: `npm audit` en front y back — anotar críticos (no bloqueantes para v1.5 si son transitivos)
- [ ] Supabase RLS / permisos — verificación manual vía SQL Editor que los writes a `lastSeenAt` solo los puede hacer el propio usuario vía la conexión del backend (no cliente directo)

---

## Al terminar

Si todo pasa:

```bash
cd /Users/edu/Web\ development/Claude/Matripuntos
git tag -a v1.5 -m "v1.5 · Red de Seguridad (tests + CI + 16 quick-wins)"
git push origin v1.5
```

Luego actualiza `docs/ROADMAP.md` (tabla de "Estado actual") cambiando v1.5 a `✅ En producción` con tag `v1.5` y quita la sección "Pendiente para cerrar el tag v1.5".

Si algo no pasa: abre un ticket (o un commit `fix:`) por cada hallazgo antes de taggear.
