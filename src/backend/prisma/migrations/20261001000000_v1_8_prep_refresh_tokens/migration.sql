-- v1.8-prep — RefreshToken model. S1-6 audit. Esquema preparado pero NO activado:
-- JWT_EXPIRY sigue 7d hasta que en una versión dedicada bajemos a 1h y
-- añadamos interceptor frontend.

CREATE TABLE "RefreshToken" (
  "id"                TEXT PRIMARY KEY,
  "userId"            TEXT NOT NULL,
  "tokenHash"         TEXT NOT NULL UNIQUE,
  "expiresAt"         TIMESTAMP(3) NOT NULL,
  "revokedAt"         TIMESTAMP(3),
  "rotatedFrom"       TEXT,
  "deviceFingerprint" TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt"        TIMESTAMP(3),
  CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken" ("userId");
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken" ("expiresAt");
