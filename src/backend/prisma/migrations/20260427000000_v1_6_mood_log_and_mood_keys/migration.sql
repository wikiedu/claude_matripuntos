-- v1.6 · La Personalidad — MoodLog table + mapping de currentMood antiguos
-- 1. Crear MoodLog
CREATE TABLE "MoodLog" (
    "id"        TEXT        NOT NULL,
    "userId"    TEXT        NOT NULL,
    "coupleId"  TEXT        NOT NULL,
    "moodKey"   TEXT        NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoodLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MoodLog"
  ADD CONSTRAINT "MoodLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MoodLog"
  ADD CONSTRAINT "MoodLog_coupleId_fkey"
  FOREIGN KEY ("coupleId") REFERENCES "Couple"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "MoodLog_userId_createdAt_idx" ON "MoodLog"("userId", "createdAt");
CREATE INDEX "MoodLog_coupleId_createdAt_idx" ON "MoodLog"("coupleId", "createdAt");

-- 2. Migrar currentMood antiguo (emoji string) → moodKey nuevo (catálogo v1.6 · 10 moods)
UPDATE "UserProfile" SET "currentMood" = 'feliz'      WHERE "currentMood" = '😊';
UPDATE "UserProfile" SET "currentMood" = 'tranquilo'  WHERE "currentMood" = '😎';
UPDATE "UserProfile" SET "currentMood" = 'cansado'    WHERE "currentMood" = '😴';
UPDATE "UserProfile" SET "currentMood" = 'estresado'  WHERE "currentMood" = '😰';
UPDATE "UserProfile" SET "currentMood" = 'tranquilo'  WHERE "currentMood" = '😐';

-- 3. Cualquier currentMood que no esté en el catálogo nuevo se limpia (resilient)
UPDATE "UserProfile" SET "currentMood" = NULL
  WHERE "currentMood" IS NOT NULL
    AND "currentMood" NOT IN (
      'feliz','enamorado','energico','carinoso',
      'tranquilo','pensativo',
      'cansado','enfermo',
      'estresado','bajon'
    );
