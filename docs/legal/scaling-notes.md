# Notas de escalado · futuro

Items que van bien para single-instance Render hoy y se documentan para cuando crezcamos:

## Rate-limit con Redis

Hoy: `express-rate-limit` con storage memoria en proceso. Funciona en Render single-instance.

Cuando: si pasamos a multi-instancia (autoscale, blue-green, etc.), los buckets se duplican por instancia y el límite real es el agregado. Migrar a `rate-limit-redis` con un Redis compartido.

## SMTP transaccional

Hoy: `/api/account/delete-request` en producción devuelve 503 si `SMTP_HOST` no está configurado. En dev devuelve el código en respuesta + console.log.

Cuando: integrar Resend o SendGrid (DPA firmable, free tier suficiente para los volúmenes esperados). Templates: código de borrado, recordatorio de invitación, digest semanal opcional. v2.1 cubre esto en su scope.

## RAT (Registro de Actividades de Tratamiento)

Hoy: borrador en `docs/legal/rat.md` (se completará al firmar DPAs). Plantilla AEPD adaptada.

Cuando: completar antes de superar 1000 usuarios activos (umbral pragmático para considerar a la AEPD como riesgo real).

## Cookie banner certificado

Hoy: banner propio simple con 3 acciones. Cubre el consentimiento granular (esenciales + analítica) que GDPR exige.

Cuando: si crecemos a escala empresarial o integramos más sub-procesadores, evaluar OneTrust / Cookiebot / similar. No es necesario hoy.
