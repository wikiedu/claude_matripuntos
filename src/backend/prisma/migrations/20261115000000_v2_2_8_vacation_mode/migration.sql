-- v2.2.8 Modo pausa / vacaciones (Claude Design canvas 14).
-- Si Couple.pausedUntil > NOW(): saldo + streaks congelados, sin digest.

ALTER TABLE "Couple"
  ADD COLUMN "pausedUntil" TIMESTAMP(3),
  ADD COLUMN "pausedReason" TEXT;
