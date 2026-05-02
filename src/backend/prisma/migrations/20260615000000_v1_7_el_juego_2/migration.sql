-- v1.7 El Juego (segundo round) — Migración aditiva.
-- 4 modelos nuevos: CoupleLevel, CoupleStreak, CoupleChallenge,
-- PushSubscription, CoupleReplaySeen. AchievementDefinition existente se
-- reusa (no se altera en esta migración).

CREATE TABLE "CoupleLevel" (
  "id"        TEXT PRIMARY KEY,
  "coupleId"  TEXT NOT NULL UNIQUE,
  "xp"        INTEGER NOT NULL DEFAULT 0,
  "level"     INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CoupleLevel_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "CoupleStreak" (
  "id"             TEXT PRIMARY KEY,
  "coupleId"       TEXT NOT NULL UNIQUE,
  "dailyStreak"    INTEGER NOT NULL DEFAULT 0,
  "weeklyStreak"   INTEGER NOT NULL DEFAULT 0,
  "lastActivityAt" TIMESTAMP(3),
  "longestDaily"   INTEGER NOT NULL DEFAULT 0,
  "longestWeekly"  INTEGER NOT NULL DEFAULT 0,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CoupleStreak_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "CoupleChallenge" (
  "id"          TEXT PRIMARY KEY,
  "coupleId"    TEXT NOT NULL,
  "weekStart"   TIMESTAMP(3) NOT NULL,
  "type"        TEXT NOT NULL,
  "config"      TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'active',
  "progress"    INTEGER NOT NULL DEFAULT 0,
  "goal"        INTEGER NOT NULL,
  "rewardXp"    INTEGER NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CoupleChallenge_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CoupleChallenge_coupleId_weekStart_key" ON "CoupleChallenge"("coupleId", "weekStart");
CREATE INDEX "CoupleChallenge_coupleId_status_idx" ON "CoupleChallenge"("coupleId", "status");

CREATE TABLE "PushSubscription" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL,
  "coupleId"  TEXT NOT NULL,
  "endpoint"  TEXT NOT NULL UNIQUE,
  "p256dh"    TEXT NOT NULL,
  "auth"      TEXT NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PushSubscription_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

CREATE TABLE "CoupleReplaySeen" (
  "id"          TEXT PRIMARY KEY,
  "coupleId"    TEXT NOT NULL,
  "replayKey"   TEXT NOT NULL,
  "seenByUser1" BOOLEAN NOT NULL DEFAULT FALSE,
  "seenByUser2" BOOLEAN NOT NULL DEFAULT FALSE,
  "seenAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CoupleReplaySeen_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CoupleReplaySeen_coupleId_replayKey_key" ON "CoupleReplaySeen"("coupleId", "replayKey");
