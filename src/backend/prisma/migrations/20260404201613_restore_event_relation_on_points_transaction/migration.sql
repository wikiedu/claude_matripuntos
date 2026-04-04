-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PointsTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coupleId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "relatedEventId" TEXT,
    "relatedTaskLogId" TEXT,
    "amount" DECIMAL NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PointsTransaction_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PointsTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PointsTransaction_relatedTaskLogId_fkey" FOREIGN KEY ("relatedTaskLogId") REFERENCES "TaskLog" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PointsTransaction_relatedEventId_fkey" FOREIGN KEY ("relatedEventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PointsTransaction" ("amount", "coupleId", "createdAt", "description", "id", "relatedEventId", "relatedTaskLogId", "type", "userId") SELECT "amount", "coupleId", "createdAt", "description", "id", "relatedEventId", "relatedTaskLogId", "type", "userId" FROM "PointsTransaction";
DROP TABLE "PointsTransaction";
ALTER TABLE "new_PointsTransaction" RENAME TO "PointsTransaction";
CREATE UNIQUE INDEX "PointsTransaction_relatedTaskLogId_key" ON "PointsTransaction"("relatedTaskLogId");
CREATE INDEX "PointsTransaction_coupleId_idx" ON "PointsTransaction"("coupleId");
CREATE INDEX "PointsTransaction_userId_idx" ON "PointsTransaction"("userId");
CREATE INDEX "PointsTransaction_type_idx" ON "PointsTransaction"("type");
CREATE INDEX "PointsTransaction_relatedEventId_idx" ON "PointsTransaction"("relatedEventId");
CREATE INDEX "PointsTransaction_createdAt_idx" ON "PointsTransaction"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
