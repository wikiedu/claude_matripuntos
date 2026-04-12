-- AlterTable: Add avatar, theme, and mood fields to UserProfile
ALTER TABLE "UserProfile" ADD COLUMN "avatarEmoji" TEXT NOT NULL DEFAULT '🐼';
ALTER TABLE "UserProfile" ADD COLUMN "avatarColor" TEXT NOT NULL DEFAULT '#7c3aed';
ALTER TABLE "UserProfile" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'dark';
ALTER TABLE "UserProfile" ADD COLUMN "currentMood" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "moodUpdatedAt" TIMESTAMP(3);
