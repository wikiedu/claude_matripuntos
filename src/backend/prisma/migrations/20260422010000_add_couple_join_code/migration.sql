-- v1.4 Join Code Signup (2026-04-22)
-- Adds permanent per-couple join code used to bootstrap the second partner
-- during signup. Nullable while we backfill existing rows; a separate
-- maintenance script populates it for legacy couples.

ALTER TABLE "Couple" ADD COLUMN "joinCode" TEXT;
CREATE UNIQUE INDEX "Couple_joinCode_key" ON "Couple"("joinCode");
CREATE INDEX "Couple_joinCode_idx" ON "Couple"("joinCode");
