# Registro de Actividades de Tratamiento (RAT)

> Plantilla AEPD adaptada. Versión inicial v1.6.1 (2026-05-02). Pendiente de revisión legal completa antes de superar 100 usuarios activos.

## 1. Identificación del responsable

- **Responsable:** Eduardo Calderón (Matripuntos)
- **Email:** privacidad@matripuntos.app
- **Domicilio:** España (a completar)

## 2. Finalidades del tratamiento

| Finalidad | Base legal |
|---|---|
| Prestación del servicio de gestión de tareas/actividades en pareja | Ejecución del contrato (art. 6.1.b RGPD) |
| Gestión de cuentas y autenticación | Ejecución del contrato |
| Notificaciones in-app esenciales | Ejecución del contrato |
| Mejora del producto vía analítica anónima agregada | Interés legítimo (art. 6.1.f) |
| Análisis de uso identificado (PostHog con userId) | Consentimiento (art. 6.1.a) |
| Cumplimiento legal | Obligación legal (art. 6.1.c) |

## 3. Categorías de interesados

- Usuarios registrados (mayores de 16 años).
- Parejas (dos usuarios conectados).

## 4. Categorías de datos

- **Identificativos:** email, nombre, contraseña hasheada (bcrypt).
- **Perfil:** apellidos, foto, avatar (emoji+color), preferencias.
- **Laborales declarados por el user:** workMode, weeklyWorkHours.
- **Familiares declarados por el user (opcional):** hijos, mascotas.
- **Estado emocional:** mood actual + histórico 90 días.
- **Actividad:** puntos, transacciones, eventos, tareas, negociaciones.
- **Técnicos:** IP, user-agent, timestamps de sesión.

## 5. Categorías de destinatarios

- Sub-procesadores: Render (hosting), Supabase (DB), PostHog (analítica opcional), Sentry (errores).
- No transferencias internacionales: todos los sub-procesadores tienen instancias UE.

## 6. Plazos previstos para la supresión

Ver `docs/legal/retention.md`.

## 7. Medidas técnicas y organizativas

- HTTPS obligatorio (Render + Cloudflare).
- Contraseñas hasheadas con bcrypt (10 rounds).
- JWT_SECRET ≥32 chars, env var no commiteada.
- Rate-limiting granular en endpoints sensibles.
- Sentry para detección de errores (no PII).
- PII whitelist en wrappers de telemetría (PostHog).
- Backups Supabase automáticos (daily 7d, weekly 30d).
- Acceso a producción restringido al responsable.

## 8. Transferencias internacionales

Ninguna prevista. Sub-procesadores en UE.

## 9. Revisión

A revisar al menos anualmente o ante cambios sustanciales (nuevo sub-procesador, nueva finalidad, ampliación de datos).
