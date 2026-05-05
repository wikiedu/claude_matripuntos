-- v2.5.8 audit 03 S1 — FK explícitas CalendarEntry.relatedEventId/Task.
-- Limpia primero referencias huérfanas. SET NULL on delete preserva
-- el CalendarEntry con su title cached.

UPDATE "CalendarEntry" ce
SET "relatedEventId" = NULL
WHERE "relatedEventId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Event" e WHERE e."id" = ce."relatedEventId");

UPDATE "CalendarEntry" ce
SET "relatedTaskId" = NULL
WHERE "relatedTaskId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Task" t WHERE t."id" = ce."relatedTaskId");

CREATE INDEX IF NOT EXISTS "CalendarEntry_relatedEventId_idx" ON "CalendarEntry"("relatedEventId");
CREATE INDEX IF NOT EXISTS "CalendarEntry_relatedTaskId_idx" ON "CalendarEntry"("relatedTaskId");

ALTER TABLE "CalendarEntry"
  ADD CONSTRAINT "CalendarEntry_relatedEventId_fkey"
  FOREIGN KEY ("relatedEventId") REFERENCES "Event"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CalendarEntry"
  ADD CONSTRAINT "CalendarEntry_relatedTaskId_fkey"
  FOREIGN KEY ("relatedTaskId") REFERENCES "Task"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
