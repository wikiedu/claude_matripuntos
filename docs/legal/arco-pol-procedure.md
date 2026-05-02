# Procedimiento de respuesta a derechos ARCO-POL

> Plazo legal: 30 días naturales desde la solicitud.

## Email dedicado

`privacidad@matripuntos.app` (alias que llega al responsable).

## Tipos de solicitudes

- **Acceso:** "qué datos tienes sobre mí"
- **Rectificación:** "corrige X dato"
- **Cancelación / Supresión:** "borra mi cuenta y mis datos"
- **Oposición:** "deja de tratar mis datos para X finalidad"
- **Portabilidad:** "envíame mis datos en formato estructurado"
- **Limitación:** "no proceses ciertos datos hasta resolver una disputa"

## Proceso interno

1. Responder acuse de recibo en <72h.
2. Verificar identidad (email registrado en la app + verificación adicional si la solicitud es destructiva).
3. Ejecutar la acción:
   - **Acceso:** export JSON desde Supabase (queries Prisma sobre User + UserProfile + Couple + PointsTransaction + Event + TaskLog + MoodLog).
   - **Rectificación:** UPDATE directo en Supabase + log de auditoría.
   - **Cancelación:** invocar `accountDeletionService.deleteAccount(userId)`.
   - **Oposición de analítica:** flag en cookie + invalidar sesión PostHog.
   - **Portabilidad:** export estructurado JSON (en desarrollo; v1.6.2 hotfix o v2.1).
   - **Limitación:** marcar User con flag `dataProcessingLimited` (no implementado aún; añadir cuando llegue una solicitud).
4. Confirmar al usuario que la acción se completó dentro del plazo.
5. Registrar la solicitud en `docs/legal/arco-pol-log.md` (uno por solicitud, sin PII).

## Plantilla de respuesta inicial

```
Hola,

Hemos recibido tu solicitud de [tipo de derecho] el [fecha].

Te confirmaremos la resolución en un plazo máximo de 30 días naturales.

Si necesitas algo más, escríbenos a privacidad@matripuntos.app.

Equipo Matripuntos
```

## Log de solicitudes

Mantener `docs/legal/arco-pol-log.md` (no commit con PII; usar IDs internos).
