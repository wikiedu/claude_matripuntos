# Flujos UX — Matripuntos

## Flujo 1: Solicitar Actividad

1. Dashboard → "Solicitar Actividad"
2. Formulario: tipo, fecha inicio/fin, ¿con hijos?, tipo actividad, compensación (opcional)
3. App calcula puntos en tiempo real mostrando preview
4. Si hay compensación → preview actualizado con descuento
5. Enviar → Event status: `pending`, notificación al partner
6. Partner ve en bandeja: acepta / rechaza / contraoferta

**Negociación (max 2 rondas free, ilimitadas premium):**
- Ronda 1: Proposer propone X pts
- Ronda 2: Partner contraoferta Y pts → proposer acepta o rechaza
- Si sin acuerdo: proposer puede "forzar" (paga de su propio saldo)
- Si rechazado: Event queda en `rejected`, sin cambio de saldo

---

## Flujo 2: Registrar Tarea

1. Tasks page → seleccionar tarea de la lista (o crear nueva)
2. Registrar: fecha, modificadores opcionales (limpieza profunda, etc.)
3. App calcula puntos finales
4. Log creado en status `pending`
5. Partner recibe notificación: "verificar o disputar"
6. Partner verifica → status `verified`, crea PointsTransaction
7. Partner disputa → status `disputed`, ambos pueden renegociar
8. Si no hay respuesta en 24h → auto-accept (status `verified`)

---

## Flujo 3: Onboarding (Nuevo Usuario)

**Step 1 — Crear cuenta:** email + password + nombre
**Step 2 — ¿Crear o unirse?**
  - Crear nueva pareja → genera `secretKey`
  - Unirse → introduce token de invitación

**Step 3 — Perfil:** hijos, mascotas, tipo de hogar
**Step 4 — Configuración inicial:** tareas base, multiplicadores
**Join Flow:** partner recibe link con token → acepta → vinculado al couple

---

## Flujo 4: Dashboard (Pantalla Principal)

- Saldo neto actual (ambos usuarios, con indicador quién debe a quién)
- Gráfico últimos 30 días (puntos por semana)
- Últimas actividades (events + task logs)
- Bandeja: eventos pendientes de respuesta
- Accesos rápidos: Solicitar actividad · Registrar tarea

---

## Flujo 5: Notificaciones

Triggers automáticos:
- Nuevo evento propuesto → al partner
- Respuesta a evento (aceptado/rechazado/contraoferta) → al proposer
- Tarea registrada → al partner (para verificar)
- Disputa de tarea → al registrador
- Logro desbloqueado → a ambos
- Recordatorio de tarea pendiente de verificar (si 20h sin respuesta)

Regla: máx 1-2 notificaciones/día por usuario para no saturar.

---

## Flujo 6: Analytics

- Resumen 30 días: total pts, eventos, tareas por usuario
- Gráfico semanal de tendencia
- Equity score: equilibrium (saldo), activity (participación), consensus (% acuerdos), constancy (regularidad)
- Vista: semana / mes / todo el historial (premium)

---

## Flujo 7: Single-User Signup

1. Usuario llega a `/signup`
2. Formulario: nombre, email, password
3. POST `/api/auth/signup` → User creado, coupleId=null (sin pareja aún)
4. Token JWT guardado en localStorage
5. Redirect a `/dashboard` (modo single-user)
6. Dashboard muestra opción "Invitar pareja" en settings

---

## Flujo 8: Invitar Pareja por Email

1. User A (logueado) va a Settings → "Invitar Pareja"
2. Introduce email de User B → POST `/api/auth/invite`
3. Backend: crea Invitation (tipo=email_invite, expira en 48h), genera token único
4. Frontend muestra link copiable: `/onboarding/join?token=XXX&email=bob@example.com`
5. User B recibe link (manual o email futuro)
6. User B abre link → página `/onboarding/join` con email pre-rellenado
7. User B introduce nombre + password → POST `/api/auth/accept-invite`
8. Backend valida token, crea User B, crea Couple vinculando ambos
9. Ambos redirigidos a `/dashboard` con pareja formada

---

## Flujo 9: Rechazar Invitación por Email

1. User B recibe link de invitación
2. User B decide no aceptar → POST `/api/auth/reject-invite` con token
3. Invitation status → "rejected"
4. User B puede registrarse independientemente vía `/signup`
5. User A sigue como single-user, puede invitar a otro email

---

## Flujo 10: Proponer Pareja (Usuario ya registrado)

**Escenario:** User A invitó a bob@example.com, pero User B se registró con bob.smith@example.com y no vio la invitación.

1. User B (logueado con bob.smith@example.com) va a Settings → "Añadir Pareja"
2. Introduce email de User A → POST `/api/auth/propose-partner`
3. Backend: crea Invitation (tipo=user_proposal) para User A, expira 48h
4. User A recibe notificación: "User B quiere ser tu pareja"
5. User A ve propuesta pendiente en Settings/notificaciones

---

## Flujo 11: Aceptar Propuesta de Pareja

1. User A ve propuesta de User B
2. User A acepta → POST `/api/auth/accept-proposal` con invitationId
3. Backend: crea Couple vinculando User A + User B
4. Ambos pasan a tener coupleId asignado
5. Notificación a User B: "User A aceptó tu propuesta"
6. Ambos redirigidos a dashboard de pareja

---

## Flujo 12: Rechazar Propuesta de Pareja

1. User A ve propuesta de User B
2. User A rechaza → POST `/api/auth/reject-proposal` con invitationId
3. Invitation status → "rejected"
4. User B notificado: "User A rechazó tu propuesta"
5. Ambos siguen independientes
