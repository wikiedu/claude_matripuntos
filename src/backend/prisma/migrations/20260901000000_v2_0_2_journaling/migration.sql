-- v2.0.2 Journaling — 4 modelos nuevos. Migración aditiva.

CREATE TABLE "JournalPrompt" (
  "id"       TEXT PRIMARY KEY,
  "text"     TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "weight"   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE "JournalEntry" (
  "id"              TEXT PRIMARY KEY,
  "coupleId"        TEXT NOT NULL,
  "authorId"        TEXT NOT NULL,
  "type"            TEXT NOT NULL,
  "title"           TEXT,
  "body"            TEXT,
  "shared"          BOOLEAN NOT NULL DEFAULT FALSE,
  "attachments"     TEXT NOT NULL DEFAULT '[]',
  "tags"            TEXT NOT NULL DEFAULT '[]',
  "promptId"        TEXT,
  "recipientId"     TEXT,
  "readByPartnerAt" TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JournalEntry_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "JournalEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "JournalEntry_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "JournalPrompt"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "JournalEntry_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "JournalEntry_coupleId_createdAt_idx" ON "JournalEntry" ("coupleId", "createdAt");
CREATE INDEX "JournalEntry_authorId_createdAt_idx" ON "JournalEntry" ("authorId", "createdAt");

CREATE TABLE "JournalReaction" (
  "id"        TEXT PRIMARY KEY,
  "entryId"   TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "emoji"     TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JournalReaction_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "JournalReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "JournalReaction_entryId_userId_emoji_key" ON "JournalReaction" ("entryId", "userId", "emoji");

CREATE TABLE "JournalRetrospective" (
  "id"          TEXT PRIMARY KEY,
  "coupleId"    TEXT NOT NULL,
  "period"      TEXT NOT NULL,
  "startDate"   TIMESTAMP(3) NOT NULL,
  "endDate"     TIMESTAMP(3) NOT NULL,
  "data"        TEXT NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "seenByUser1" BOOLEAN NOT NULL DEFAULT FALSE,
  "seenByUser2" BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT "JournalRetrospective_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "JournalRetrospective_coupleId_period_startDate_key" ON "JournalRetrospective" ("coupleId", "period", "startDate");
