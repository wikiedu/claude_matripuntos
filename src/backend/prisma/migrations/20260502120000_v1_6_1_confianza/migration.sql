-- v1.6.1 · Confianza — User soft-delete papelera + firstLoginAt + Couple dissolvedAt

-- AlterTable User: deletedAt + firstLoginAt
ALTER TABLE "User" ADD COLUMN "deletedAt"    TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "firstLoginAt" TIMESTAMP(3);

-- Backfill firstLoginAt con createdAt para users existentes (no rompe banner ya
-- expirado: si createdAt > 7d, banner no se muestra; si < 7d, se muestra
-- mientras corresponda).
UPDATE "User" SET "firstLoginAt" = "createdAt" WHERE "firstLoginAt" IS NULL;

-- AlterTable Couple: dissolvedAt
ALTER TABLE "Couple" ADD COLUMN "dissolvedAt" TIMESTAMP(3);

-- Index parcial para purge cron: query frecuente "users borrados hace >30d".
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt") WHERE "deletedAt" IS NOT NULL;
