-- v2.6.0 audit 03 — schema hardening: audit-trail FKs + indexes hot-path.
-- Idempotente: usa IF NOT EXISTS y DROP IF EXISTS para que reruns no fallen.

-- ===== S1-6 · Compensation.linkedTaskId index =====
CREATE INDEX IF NOT EXISTS "Compensation_linkedTaskId_idx" ON "Compensation"("linkedTaskId");

-- ===== S1-10 · RefreshToken (userId, revokedAt) compound =====
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_revokedAt_idx" ON "RefreshToken"("userId", "revokedAt");

-- ===== S1-9 · Invitation: nullable + SetNull para preservar audit trail =====
-- 1. Drop FK actual y recrear con SetNull. Si fromUserId NOT NULL, hacerlo nullable.
ALTER TABLE "Invitation" DROP CONSTRAINT IF EXISTS "Invitation_fromUserId_fkey";
ALTER TABLE "Invitation" DROP CONSTRAINT IF EXISTS "Invitation_toUserId_fkey";

ALTER TABLE "Invitation" ALTER COLUMN "fromUserId" DROP NOT NULL;

ALTER TABLE "Invitation"
  ADD CONSTRAINT "Invitation_fromUserId_fkey"
  FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Invitation"
  ADD CONSTRAINT "Invitation_toUserId_fkey"
  FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== S1-8 · ConfigurationProposal/ChangeLog: Cascade → SetNull en User refs =====
ALTER TABLE "ConfigurationProposal" DROP CONSTRAINT IF EXISTS "ConfigurationProposal_proposedById_fkey";
ALTER TABLE "ConfigurationProposal" ALTER COLUMN "proposedById" DROP NOT NULL;
ALTER TABLE "ConfigurationProposal"
  ADD CONSTRAINT "ConfigurationProposal_proposedById_fkey"
  FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ConfigurationChangeLog" DROP CONSTRAINT IF EXISTS "ConfigurationChangeLog_appliedById_fkey";
ALTER TABLE "ConfigurationChangeLog" ALTER COLUMN "appliedById" DROP NOT NULL;
ALTER TABLE "ConfigurationChangeLog"
  ADD CONSTRAINT "ConfigurationChangeLog_appliedById_fkey"
  FOREIGN KEY ("appliedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
