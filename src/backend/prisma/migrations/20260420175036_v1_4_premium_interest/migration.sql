-- v1.4 La Evolución: PremiumInterest — captura de interés en funciones Premium

-- CreateTable
CREATE TABLE "PremiumInterest" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "coupleId" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PremiumInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PremiumInterest_email_idx" ON "PremiumInterest"("email");

-- CreateIndex
CREATE INDEX "PremiumInterest_notified_idx" ON "PremiumInterest"("notified");

-- AddForeignKey
ALTER TABLE "PremiumInterest" ADD CONSTRAINT "PremiumInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
