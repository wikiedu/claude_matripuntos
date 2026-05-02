# PostHog dashboard · KPIs internos

> Pendiente de crear el dashboard real una vez configurado el proyecto PostHog.

## KPIs a configurar

1. **Activación:** % de signups que completan onboarding en <7d.
2. **Mood adoption (KPI v1.6):** % WAU con ≥1 `mood.set` en la semana. Target ≥30%.
3. **Phrase reach:** % de sesiones diarias con ≥1 `phrase.daily_seen`. Target ≥80%.
4. **Cascade health:** distribución de `phrase.daily_seen.category`. Anomalía si >95% es `neutra-positivo`.
5. **Negotiation health:** ratio accepted vs rejected vs forced. Anomalía si forced >20%.
6. **Disputed rate:** % de TaskLogs con `task.log_disputed`. Anomalía si >10%.
7. **Retention D1/D7/D30** por cohorte de signup.
8. **Consent rate:** % de users con `consent.changed{analytics: true}`.
9. **Ratelimit hit rate:** salto repentino → posible abuso o bug en cliente.
10. **Funnel signup → onboarding completo → primera actividad:** drop-off por step.

## Catálogo de eventos canónicos

Definidos en `packages/shared/src/telemetry-events.ts`. 21 eventos zod-validated.

## Privacidad

- PII blacklist obligatoria en wrappers (`telemetry.ts` frontend y backend).
- Modo opt-out con tracking anónimo por defecto (decisión brainstorm 9-B): PostHog inicializa sin identify hasta que el user acepta analítica.
- Sin replay de sesiones (riesgo PII alto sin masking minucioso).
