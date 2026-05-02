-- v2.0.3 Analytics Pro — AnalyticsInsight cache.

CREATE TABLE "AnalyticsInsight" (
  "id"          TEXT PRIMARY KEY,
  "coupleId"    TEXT NOT NULL,
  "kind"        TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "body"        TEXT NOT NULL,
  "payload"     TEXT NOT NULL DEFAULT '{}',
  "trend"       TEXT,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil"  TIMESTAMP(3) NOT NULL,
  "seenByUser1" BOOLEAN NOT NULL DEFAULT FALSE,
  "seenByUser2" BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT "AnalyticsInsight_coupleId_fkey" FOREIGN KEY ("coupleId")
    REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AnalyticsInsight_coupleId_validUntil_idx"
  ON "AnalyticsInsight" ("coupleId", "validUntil");
CREATE INDEX "AnalyticsInsight_coupleId_kind_idx"
  ON "AnalyticsInsight" ("coupleId", "kind");
