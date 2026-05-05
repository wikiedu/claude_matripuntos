-- v2.5.6 audit 03 S1 — composite indexes para queries hot-path.
-- IF NOT EXISTS para idempotencia (si reconcile-prisma-migrations los crea
-- vía Postgres directo, esta migration es no-op).

CREATE INDEX IF NOT EXISTS "Event_coupleId_status_dateStart_idx"
  ON "Event"("coupleId", "status", "dateStart");

CREATE INDEX IF NOT EXISTS "TaskLog_coupleId_date_completedBy_idx"
  ON "TaskLog"("coupleId", "date", "completedBy");

CREATE INDEX IF NOT EXISTS "PointsTransaction_coupleId_createdAt_idx"
  ON "PointsTransaction"("coupleId", "createdAt");

CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx"
  ON "Notification"("userId", "isRead");
