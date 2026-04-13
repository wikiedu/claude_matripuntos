-- v1.2 gamification: add Couple fields, AchievementDefinition, CoupleAchievement, RuleProposal

-- AlterTable: add gamification fields to Couple
ALTER TABLE "Couple" ADD COLUMN "xp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Couple" ADD COLUMN "level" TEXT NOT NULL DEFAULT 'nido';
ALTER TABLE "Couple" ADD COLUMN "dailyStreakDays" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Couple" ADD COLUMN "weeklyStreakWeeks" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Couple" ADD COLUMN "dailyStreakFreezerUsed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Couple" ADD COLUMN "lastActivityDate" TIMESTAMP(3);

-- CreateTable: AchievementDefinition
CREATE TABLE "AchievementDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 50,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AchievementDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AchievementDefinition_category_idx" ON "AchievementDefinition"("category");
CREATE INDEX "AchievementDefinition_orderIndex_idx" ON "AchievementDefinition"("orderIndex");

-- CreateTable: CoupleAchievement
CREATE TABLE "CoupleAchievement" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "achievementDefinitionId" TEXT NOT NULL,
    "progress" TEXT,
    "unlockedAt" TIMESTAMP(3),

    CONSTRAINT "CoupleAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoupleAchievement_coupleId_achievementDefinitionId_key" ON "CoupleAchievement"("coupleId", "achievementDefinitionId");
CREATE INDEX "CoupleAchievement_coupleId_idx" ON "CoupleAchievement"("coupleId");

-- AddForeignKey
ALTER TABLE "CoupleAchievement" ADD CONSTRAINT "CoupleAchievement_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoupleAchievement" ADD CONSTRAINT "CoupleAchievement_achievementDefinitionId_fkey" FOREIGN KEY ("achievementDefinitionId") REFERENCES "AchievementDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: RuleProposal
CREATE TABLE "RuleProposal" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "proposedById" TEXT,
    "respondedById" TEXT,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "proposerComment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "responderComment" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RuleProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RuleProposal_coupleId_idx" ON "RuleProposal"("coupleId");
CREATE INDEX "RuleProposal_status_idx" ON "RuleProposal"("status");
CREATE INDEX "RuleProposal_proposedById_idx" ON "RuleProposal"("proposedById");

-- AddForeignKey
ALTER TABLE "RuleProposal" ADD CONSTRAINT "RuleProposal_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RuleProposal" ADD CONSTRAINT "RuleProposal_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RuleProposal" ADD CONSTRAINT "RuleProposal_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
