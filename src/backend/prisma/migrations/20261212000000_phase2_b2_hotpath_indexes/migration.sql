-- Fase 2 B.2 — indexes hot-path que faltaban tras el barrido de Sprint 12.
-- Idempotente: IF NOT EXISTS para que reruns no fallen.

-- ===== Event (coupleId, dateStart) =====
-- analyticsService consulta rangos {coupleId, dateStart gte/lte} sin status
-- en 6+ call sites; el composite existente (coupleId, status, dateStart)
-- no sirve para ese scan.
CREATE INDEX IF NOT EXISTS "Event_coupleId_dateStart_idx" ON "Event"("coupleId", "dateStart");

-- ===== Notification (userId, createdAt) =====
-- GET /notifications lista por user ordenado por createdAt desc con
-- paginación; evita el sort posterior al index scan de [userId].
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
