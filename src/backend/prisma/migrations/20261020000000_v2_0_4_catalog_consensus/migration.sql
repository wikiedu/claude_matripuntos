-- v2.0.4 Catalog & Consensus
-- ActivityTemplate: catálogo de actividades (global + custom por pareja)
-- ConfigurationProposal: propuestas de cambio de config consensuables
-- ConfigurationChangeLog: histórico de cambios aplicados

-- CreateTable: ActivityTemplate
CREATE TABLE "ActivityTemplate" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pointsBaseSuggested" DECIMAL(65,30) NOT NULL DEFAULT 10.0,
    "defaultDurationMinutes" INTEGER,
    "defaultImpact" TEXT,
    "emoji" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "instancesThisMonth" INTEGER NOT NULL DEFAULT 0,
    "lastInstanceAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityTemplate_coupleId_isActive_idx" ON "ActivityTemplate"("coupleId", "isActive");
CREATE INDEX "ActivityTemplate_category_idx" ON "ActivityTemplate"("category");

-- AddForeignKey
ALTER TABLE "ActivityTemplate" ADD CONSTRAINT "ActivityTemplate_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: ConfigurationProposal
CREATE TABLE "ConfigurationProposal" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "proposedById" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "rationale" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "respondedById" TEXT,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfigurationProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConfigurationProposal_coupleId_status_idx" ON "ConfigurationProposal"("coupleId", "status");
CREATE INDEX "ConfigurationProposal_expiresAt_idx" ON "ConfigurationProposal"("expiresAt");

-- AddForeignKey
ALTER TABLE "ConfigurationProposal" ADD CONSTRAINT "ConfigurationProposal_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConfigurationProposal" ADD CONSTRAINT "ConfigurationProposal_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: ConfigurationChangeLog
CREATE TABLE "ConfigurationChangeLog" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "appliedById" TEXT NOT NULL,
    "proposalId" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfigurationChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConfigurationChangeLog_coupleId_appliedAt_idx" ON "ConfigurationChangeLog"("coupleId", "appliedAt");

-- AddForeignKey
ALTER TABLE "ConfigurationChangeLog" ADD CONSTRAINT "ConfigurationChangeLog_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConfigurationChangeLog" ADD CONSTRAINT "ConfigurationChangeLog_appliedById_fkey" FOREIGN KEY ("appliedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
