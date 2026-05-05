-- v2.5.7 audit 03 S1 — Foreign key explícita Task.defaultAssigneeId → User.id.
-- onDelete: SetNull para que borrar un user no rompa Task referenced.
-- Defensivo: limpia primero referencias fantasma a usuarios que ya no existen.

UPDATE "Task" t
SET "defaultAssigneeId" = NULL
WHERE "defaultAssigneeId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u."id" = t."defaultAssigneeId");

CREATE INDEX IF NOT EXISTS "Task_defaultAssigneeId_idx" ON "Task"("defaultAssigneeId");

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_defaultAssigneeId_fkey"
  FOREIGN KEY ("defaultAssigneeId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
