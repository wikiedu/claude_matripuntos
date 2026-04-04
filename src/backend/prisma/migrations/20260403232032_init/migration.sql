/*
  Warnings:

  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coupleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" DATETIME,
    "name" TEXT NOT NULL,
    "roleInHome" TEXT NOT NULL DEFAULT 'equal',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "language" TEXT NOT NULL DEFAULT 'es',
    "notificationsPush" BOOLEAN NOT NULL DEFAULT true,
    "notificationsEmail" BOOLEAN NOT NULL DEFAULT true,
    "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false,
    "notificationPreferences" TEXT NOT NULL DEFAULT '{}',
    "lastLogin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_User" ("coupleId", "createdAt", "email", "emailVerified", "hasCompletedOnboarding", "id", "language", "lastLogin", "name", "notificationPreferences", "notificationsEmail", "notificationsPush", "passwordHash", "roleInHome", "timezone", "updatedAt", "verifiedAt") SELECT "coupleId", "createdAt", "email", "emailVerified", "hasCompletedOnboarding", "id", "language", "lastLogin", "name", "notificationPreferences", "notificationsEmail", "notificationsPush", "passwordHash", "roleInHome", "timezone", "updatedAt", "verifiedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_coupleId_idx" ON "User"("coupleId");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE TABLE "new_UserAchievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserAchievement" ("achievementId", "id", "unlockedAt", "userId") SELECT "achievementId", "id", "unlockedAt", "userId" FROM "UserAchievement";
DROP TABLE "UserAchievement";
ALTER TABLE "new_UserAchievement" RENAME TO "UserAchievement";
CREATE INDEX "UserAchievement_userId_idx" ON "UserAchievement"("userId");
CREATE INDEX "UserAchievement_achievementId_idx" ON "UserAchievement"("achievementId");
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
