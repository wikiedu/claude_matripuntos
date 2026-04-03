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
