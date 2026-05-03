-- v2.1.1 Consenso de puntos en ActivityTemplate (opción C híbrida).
-- Cuando una pareja crea/edita un template, los campos no-puntos se aplican
-- al instante; los puntos requieren aceptación del partner vía
-- ConfigurationProposal con field='activity_template:<id>:points'.
-- Templates globales (coupleId NULL) vienen pre-aprobados por backfill.

ALTER TABLE "ActivityTemplate"
  ADD COLUMN "pointsApproved" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pointsApprovedAt" TIMESTAMP(3);

-- Backfill: globales pre-aprobados (no requieren consenso pareja).
UPDATE "ActivityTemplate"
   SET "pointsApproved" = true,
       "pointsApprovedAt" = CURRENT_TIMESTAMP
 WHERE "coupleId" IS NULL;

-- Backfill: custom de pareja existentes hasta hoy se consideran ya
-- acordados (no rompemos el flujo de parejas que ya los tenían usando).
UPDATE "ActivityTemplate"
   SET "pointsApproved" = true,
       "pointsApprovedAt" = CURRENT_TIMESTAMP
 WHERE "coupleId" IS NOT NULL;
