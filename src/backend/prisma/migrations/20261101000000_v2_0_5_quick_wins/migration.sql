-- v2.0.5 Quick wins
-- Couple.relationshipStartDate: fecha de inicio de la relación (anniversary timer)
-- TaskLog.proofImageUrl + proofUploadedAt: imagen prueba opcional (anti-fraude soft)

ALTER TABLE "Couple" ADD COLUMN "relationshipStartDate" TIMESTAMP(3);

ALTER TABLE "TaskLog" ADD COLUMN "proofImageUrl" TEXT;
ALTER TABLE "TaskLog" ADD COLUMN "proofUploadedAt" TIMESTAMP(3);
