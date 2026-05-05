-- v2.5.9 audit 01 S1-R-9 — separar el rol "disputador" del de "verificador"
-- en TaskLog. Antes la ruta /dispute escribía `verifiedBy` para el partner
-- que disputaba, confundiendo analytics y el cron de auto-accept.

-- Idempotente con IF NOT EXISTS por si la migration se reejecuta.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'TaskLog' AND column_name = 'disputedBy'
  ) THEN
    ALTER TABLE "TaskLog" ADD COLUMN "disputedBy" TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'TaskLog_disputedBy_fkey' AND table_name = 'TaskLog'
  ) THEN
    ALTER TABLE "TaskLog"
    ADD CONSTRAINT "TaskLog_disputedBy_fkey"
    FOREIGN KEY ("disputedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill defensivo: si ya hay TaskLogs disputados con verifiedBy poblado,
-- copiamos a disputedBy. (No vaciamos verifiedBy para no romper analytics
-- históricas que ya hubieran ejecutado.)
UPDATE "TaskLog"
SET "disputedBy" = "verifiedBy"
WHERE "status" = 'disputed' AND "disputedBy" IS NULL AND "verifiedBy" IS NOT NULL;
