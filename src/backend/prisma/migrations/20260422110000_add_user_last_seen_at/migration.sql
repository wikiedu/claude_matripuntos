-- v1.5 quick-win #5 — presence / last active indicator
ALTER TABLE "User" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
