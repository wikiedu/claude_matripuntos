# Política de Privacidad

> Última actualización: 2026-05-02 · v1.6.1

## 1. Quién es el responsable de tus datos

Matripuntos · Eduardo Calderón · contacto: privacidad@matripuntos.app

## 2. Qué datos recogemos

- **Identificativos:** email, nombre, contraseña hasheada (bcrypt).
- **Perfil:** apellidos opcionales, foto opcional, avatar (emoji + color), preferencias de tareas, horas y modo de trabajo.
- **Estado emocional opcional:** mood actual (10 estados predefinidos sin moods hostiles), histórico personal de moods (últimos 90 días).
- **Familiares (opcionales):** nombres y datos básicos de hijos y mascotas si los registras.
- **Actividad y puntos:** actividades creadas, tareas completadas, balance de puntos, transacciones, negociaciones.
- **Telemetría agregada:** eventos anónimos de uso (solo si aceptas analíticas en el banner de cookies).

## 3. Para qué los usamos

| Finalidad | Base legal |
|---|---|
| Funcionar la app | Ejecución del contrato |
| Mejorar el producto (analítica anónima) | Interés legítimo |
| Análisis identificado de uso (PostHog con userId) | Consentimiento explícito |
| Notificaciones in-app | Ejecución del contrato |

## 4. Sub-procesadores

| Servicio | Finalidad | Ubicación |
|---|---|---|
| Render | Hosting backend | UE |
| Supabase | Base de datos | UE |
| PostHog | Analítica opcional | UE (Frankfurt) |
| Sentry | Errores y monitoring | UE |

Los DPAs firmados con cada uno se documentan internamente en `docs/legal/dpa-checklist.md`.

## 5. Retención

| Tipo | Plazo |
|---|---|
| Cuenta activa | Mientras la cuenta esté activa |
| Cuenta borrada | 30 días en papelera, luego hard-purge |
| Datos de balance e histórico (PointsTransaction, Event, TaskLog) | Vida de la cuenta |
| MoodLog | 90 días rolling |
| Notificaciones | 60 días rolling |
| Invitaciones pendientes | 14 días tras `expiresAt` |
| Logs de Sentry | 30 días (gestión Sentry) |
| Eventos PostHog | 12 meses |

## 6. Tus derechos

- **Acceso:** ver qué datos tenemos sobre ti.
- **Rectificación:** corregir datos incorrectos.
- **Supresión (derecho al olvido):** eliminar tu cuenta.
- **Oposición:** retirar consentimiento de analítica en cualquier momento.
- **Portabilidad:** descargar tus datos en formato estructurado (en preparación, ver §8).
- **Limitación:** restringir tratamientos específicos.

Plazo de respuesta: **30 días naturales**. Contacto: privacidad@matripuntos.app

## 7. Borrar tu cuenta

**Settings → Privacidad → Eliminar mi cuenta.** Wizard de 3 pasos (educativo + verificación con password + código por email). Tras confirmación:

- Tus datos personales (email, nombre, perfil, mood histórico, notificaciones) se eliminan o pseudonimizan inmediatamente.
- Tu histórico compartido con tu pareja (puntos, eventos, tareas) se conserva pero queda anonimizado como "Usuario eliminado" para que tu pareja conserve su balance y memoria de la etapa compartida.
- Tras **30 días** de papelera, hard-purge definitivo de tu User row.

Si eras el único miembro activo del couple, el couple se marca como disuelto y se purga junto con tu user.

## 8. Salir de la pareja sin borrar cuenta

**Settings → Pareja → Salir de la pareja.** Tu cuenta permanece activa. El couple se marca disuelto, ambos quedáis en couples individuales nuevos. El histórico compartido queda accesible read-only en "Etapas anteriores".

## 9. Cookies y consentimiento de analítica

Banner de cookies en primera visita con 3 acciones (Aceptar todo · Solo esenciales · Personalizar). Detalle en `/cookies`.

## 10. Cambios en esta política

Si la política cambia materialmente, te avisaremos en la app y/o por email. Versión actual: v1.6.1 (2026-05-02).
