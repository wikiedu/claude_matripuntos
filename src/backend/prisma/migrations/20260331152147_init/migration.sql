-- CreateTable
CREATE TABLE "Couple" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "secretKey" TEXT NOT NULL,
    "numChildren" INTEGER NOT NULL DEFAULT 0,
    "language" TEXT NOT NULL DEFAULT 'es',
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coupleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" DATETIME,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "notificationsPush" BOOLEAN NOT NULL DEFAULT true,
    "notificationsEmail" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coupleId" TEXT NOT NULL,
    "createdBy" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "dateStart" DATETIME NOT NULL,
    "dateEnd" DATETIME NOT NULL,
    "hasChildren" BOOLEAN NOT NULL DEFAULT false,
    "numChildren" INTEGER NOT NULL DEFAULT 0,
    "pointsBase" DECIMAL NOT NULL,
    "pointsCalculated" DECIMAL NOT NULL,
    "pointsAgreed" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "negotiationRound" INTEGER NOT NULL DEFAULT 0,
    "maxFreeRounds" INTEGER NOT NULL DEFAULT 2,
    "compensation" TEXT,
    "compensationDiscount" DECIMAL NOT NULL DEFAULT 1.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Event_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coupleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "pointsBase" DECIMAL NOT NULL DEFAULT 1.0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coupleId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "completedBy" TEXT,
    "date" DATETIME NOT NULL,
    "pointsBase" DECIMAL NOT NULL,
    "modifier" TEXT,
    "modifierValue" DECIMAL NOT NULL DEFAULT 0,
    "pointsFinal" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verifiedBy" TEXT,
    "verifiedAt" DATETIME,
    "disputeReason" TEXT,
    "disputedAt" DATETIME,
    "pointsDisputed" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaskLog_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskLog_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TaskLog_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Negotiation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "proposedBy" TEXT,
    "pointsProposed" DECIMAL NOT NULL,
    "message" TEXT,
    "responseType" TEXT,
    "respondedBy" TEXT,
    "respondedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Negotiation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Negotiation_proposedBy_fkey" FOREIGN KEY ("proposedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Negotiation_respondedBy_fkey" FOREIGN KEY ("respondedBy") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PointsTransaction" (
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
    CONSTRAINT "PointsTransaction_relatedEventId_fkey" FOREIGN KEY ("relatedEventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PointsTransaction_relatedTaskLogId_fkey" FOREIGN KEY ("relatedTaskLogId") REFERENCES "TaskLog" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Compensation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "discountAmount" DECIMAL NOT NULL,
    "discountPercent" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "linkedTaskId" TEXT,
    "dueDate" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Compensation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Compensation_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Compensation_linkedTaskId_fkey" FOREIGN KEY ("linkedTaskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Configuration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coupleId" TEXT NOT NULL,
    "tasksConfig" TEXT NOT NULL DEFAULT '{}',
    "multipliersConfig" TEXT NOT NULL DEFAULT '{}',
    "activityTypes" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Configuration_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coupleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relatedEventId" TEXT,
    "relatedTaskLogId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coupleId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME,
    "stripeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Couple_secretKey_key" ON "Couple"("secretKey");

-- CreateIndex
CREATE INDEX "Couple_secretKey_idx" ON "Couple"("secretKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_coupleId_idx" ON "User"("coupleId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Event_coupleId_idx" ON "Event"("coupleId");

-- CreateIndex
CREATE INDEX "Event_createdBy_idx" ON "Event"("createdBy");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE INDEX "Event_dateStart_idx" ON "Event"("dateStart");

-- CreateIndex
CREATE INDEX "Task_coupleId_idx" ON "Task"("coupleId");

-- CreateIndex
CREATE INDEX "Task_category_idx" ON "Task"("category");

-- CreateIndex
CREATE INDEX "TaskLog_coupleId_idx" ON "TaskLog"("coupleId");

-- CreateIndex
CREATE INDEX "TaskLog_completedBy_idx" ON "TaskLog"("completedBy");

-- CreateIndex
CREATE INDEX "TaskLog_date_idx" ON "TaskLog"("date");

-- CreateIndex
CREATE INDEX "TaskLog_status_idx" ON "TaskLog"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TaskLog_coupleId_taskId_date_completedBy_key" ON "TaskLog"("coupleId", "taskId", "date", "completedBy");

-- CreateIndex
CREATE INDEX "Negotiation_eventId_idx" ON "Negotiation"("eventId");

-- CreateIndex
CREATE INDEX "Negotiation_proposedBy_idx" ON "Negotiation"("proposedBy");

-- CreateIndex
CREATE INDEX "Negotiation_roundNumber_idx" ON "Negotiation"("roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PointsTransaction_relatedEventId_key" ON "PointsTransaction"("relatedEventId");

-- CreateIndex
CREATE UNIQUE INDEX "PointsTransaction_relatedTaskLogId_key" ON "PointsTransaction"("relatedTaskLogId");

-- CreateIndex
CREATE INDEX "PointsTransaction_coupleId_idx" ON "PointsTransaction"("coupleId");

-- CreateIndex
CREATE INDEX "PointsTransaction_userId_idx" ON "PointsTransaction"("userId");

-- CreateIndex
CREATE INDEX "PointsTransaction_type_idx" ON "PointsTransaction"("type");

-- CreateIndex
CREATE INDEX "PointsTransaction_createdAt_idx" ON "PointsTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "Compensation_eventId_idx" ON "Compensation"("eventId");

-- CreateIndex
CREATE INDEX "Compensation_status_idx" ON "Compensation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Configuration_coupleId_key" ON "Configuration"("coupleId");

-- CreateIndex
CREATE INDEX "Configuration_coupleId_idx" ON "Configuration"("coupleId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_coupleId_key" ON "Subscription"("coupleId");

-- CreateIndex
CREATE INDEX "Subscription_coupleId_idx" ON "Subscription"("coupleId");

-- CreateIndex
CREATE INDEX "Subscription_endsAt_idx" ON "Subscription"("endsAt");
