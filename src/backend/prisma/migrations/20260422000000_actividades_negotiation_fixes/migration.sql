-- Actividades module: negotiation fixes (2026-04-22)
-- 1. Bump Event.maxFreeRounds default from 2 → 99 to match MVP reality
--    (no premium plan implementation yet, cap was unreachable-but-blocking).
-- 2. Repair any stuck events: when the backend used to transition a negotiation
--    out of 'awaiting' and then fail mid-request, the event was left in
--    status='pending' with no 'awaiting' negotiation. Reset them so users can
--    retry. The reset picks the highest roundNumber per event.

-- 1) Bump the default
ALTER TABLE "Event" ALTER COLUMN "maxFreeRounds" SET DEFAULT 99;

-- Upgrade existing low caps so no live event blocks counter-offers. We keep
-- any row already above 99 untouched.
UPDATE "Event" SET "maxFreeRounds" = 99 WHERE "maxFreeRounds" < 99;

-- 2) Repair stuck pending events: for every Event where status='pending' and
--    no Negotiation is still 'awaiting', set the latest Negotiation back to
--    'awaiting' and clear its respondedBy/respondedAt.
UPDATE "Negotiation"
SET "responseType" = 'awaiting', "respondedBy" = NULL, "respondedAt" = NULL
WHERE "id" IN (
  SELECT n."id"
  FROM "Negotiation" n
  JOIN "Event" e ON e."id" = n."eventId"
  WHERE e."status" = 'pending'
    AND NOT EXISTS (
      SELECT 1 FROM "Negotiation" n2
      WHERE n2."eventId" = e."id" AND n2."responseType" = 'awaiting'
    )
    AND n."roundNumber" = (
      SELECT MAX(n3."roundNumber") FROM "Negotiation" n3 WHERE n3."eventId" = e."id"
    )
);
