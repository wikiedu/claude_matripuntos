# Retención de datos · tabla autoritativa

> Aplicada via cron `dataRetentionJob` (`src/backend/src/jobs/dataRetentionJob.ts`).

| Tipo de dato | Retención | Justificación |
|---|---|---|
| `User`, `UserProfile`, `Couple` activos | Vida de la cuenta | Core del producto |
| `User` con `deletedAt` set | 30 días papelera | Recuperación tras error humano antes de hard-purge |
| `PointsTransaction`, `Event`, `TaskLog` | Vida de la cuenta (histórico compartido) | Es el balance y la memoria de la pareja |
| `MoodLog` | 90 días rolling | Sirve para `MyMoodWeek`; no necesita vivir más |
| `Notification` | 60 días rolling | Solo se usan en feed reciente |
| `Invitation` `status='pending'` | 14 días tras `expiresAt` | Limpieza |
| Logs de Sentry | 30 días | Gestión Sentry plan free |
| Eventos PostHog | 12 meses | Análisis longitudinal |
| Backups Supabase | 7 días daily, 30 días weekly | Recuperación |

## Salvaguarda dry-run

Las primeras 2 ejecuciones del cron en producción corren con `DRY_RUN=true` → solo loguean qué borrarían. Tras revisar logs y verificar coherencia, se pasa a modo real automáticamente (`retentionRunCount` en `server.ts`).

## Cómo verificar el cron

```bash
# Manual run desde local (dev DB):
DATABASE_URL=... DRY_RUN=1 node src/backend/src/jobs/runRetention.mjs
```

(Pendiente: añadir wrapper `runRetention.mjs` para ejecución one-shot.)
