/*
  Warnings:

  - You are about to drop the column `inviteeEmail` on the `Invitation` table. All the data in the column will be lost.
  - You are about to drop the column `inviteeUserId` on the `Invitation` table. All the data in the column will be lost.
  - You are about to drop the column `inviterUserId` on the `Invitation` table. All the data in the column will be lost.
  - Added the required column `fromUserId` to the `Invitation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Invitation` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromUserId" TEXT NOT NULL,
    "toEmail" TEXT,
    "toUserId" TEXT,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "coupleId" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invitation_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invitation_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invitation_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invitation" ("coupleId", "createdAt", "expiresAt", "id", "status", "token", "updatedAt") SELECT "coupleId", "createdAt", "expiresAt", "id", "status", "token", "updatedAt" FROM "Invitation";
DROP TABLE "Invitation";
ALTER TABLE "new_Invitation" RENAME TO "Invitation";
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");
CREATE INDEX "Invitation_fromUserId_idx" ON "Invitation"("fromUserId");
CREATE INDEX "Invitation_toEmail_idx" ON "Invitation"("toEmail");
CREATE INDEX "Invitation_toUserId_idx" ON "Invitation"("toUserId");
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");
CREATE INDEX "Invitation_expiresAt_idx" ON "Invitation"("expiresAt");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coupleId" TEXT,
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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
