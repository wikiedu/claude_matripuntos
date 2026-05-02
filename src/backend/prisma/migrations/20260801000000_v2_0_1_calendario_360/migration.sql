-- v2.0.1 Calendario 360 — Migración aditiva.
-- Extiende CalendarEntry y añade GoogleCalendarSync + ServiceProvider.

-- 1. Extender CalendarEntry
ALTER TABLE "CalendarEntry" ADD COLUMN "endDate" TIMESTAMP(3);
ALTER TABLE "CalendarEntry" ADD COLUMN "allDay" BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "CalendarEntry" ADD COLUMN "category" TEXT;
ALTER TABLE "CalendarEntry" ADD COLUMN "externalSource" TEXT;
ALTER TABLE "CalendarEntry" ADD COLUMN "externalId" TEXT;
ALTER TABLE "CalendarEntry" ADD COLUMN "recurrence" TEXT;
ALTER TABLE "CalendarEntry" ADD COLUMN "metadata" TEXT;
ALTER TABLE "CalendarEntry" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "CalendarEntry_coupleId_date_idx" ON "CalendarEntry" ("coupleId", "date");
CREATE INDEX "CalendarEntry_coupleId_type_idx" ON "CalendarEntry" ("coupleId", "type");

-- Unique compuesto solo cuando ambos son no-null. PostgreSQL acepta NULL ≠ NULL,
-- por lo que entries internas (manual, sin externalId) no chocan entre sí.
CREATE UNIQUE INDEX "CalendarEntry_externalSource_externalId_key"
  ON "CalendarEntry" ("externalSource", "externalId")
  WHERE "externalSource" IS NOT NULL AND "externalId" IS NOT NULL;

-- 2. GoogleCalendarSync
CREATE TABLE "GoogleCalendarSync" (
  "id"            TEXT PRIMARY KEY,
  "userId"        TEXT NOT NULL UNIQUE,
  "refreshToken"  TEXT NOT NULL,
  "scope"         TEXT NOT NULL,
  "syncEnabled"   BOOLEAN NOT NULL DEFAULT TRUE,
  "lastSyncedAt"  TIMESTAMP(3),
  "lastSyncToken" TEXT,
  "syncWindow"    INTEGER NOT NULL DEFAULT 90,
  "filters"       TEXT NOT NULL DEFAULT '[]',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoogleCalendarSync_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 3. ServiceProvider
CREATE TABLE "ServiceProvider" (
  "id"          TEXT PRIMARY KEY,
  "coupleId"    TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "type"        TEXT NOT NULL,
  "recurrence"  TEXT,
  "color"       TEXT,
  "active"      BOOLEAN NOT NULL DEFAULT TRUE,
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceProvider_coupleId_fkey" FOREIGN KEY ("coupleId")
    REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ServiceProvider_coupleId_active_idx" ON "ServiceProvider" ("coupleId", "active");
