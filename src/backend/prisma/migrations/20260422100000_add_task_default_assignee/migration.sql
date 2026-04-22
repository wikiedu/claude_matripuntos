-- v1.5 quick-win #3 — per-task default assignee
-- Nullable: NULL means "cualquiera" (either user).
ALTER TABLE "Task" ADD COLUMN "defaultAssigneeId" TEXT;
