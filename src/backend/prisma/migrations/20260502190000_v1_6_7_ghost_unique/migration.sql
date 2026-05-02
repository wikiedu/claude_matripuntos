-- v1.6.7 Sprint 2 final: cerrar race condition de ghost user.
-- accountDeletionService usa email determinista `ghost-{coupleId}@deleted.local`
-- y confía en el UNIQUE de User.email para que dos delete simultáneos del
-- mismo couple no creen dos ghosts. El UNIQUE de email ya existe (email global
-- @unique en el schema). Esta migración añade un index parcial adicional para
-- consultas frecuentes "obtener ghost de un couple" sin escan completo.
--
-- IMPORTANTE: PostgreSQL solo. Usar índice parcial WHERE deletedAt IS NOT NULL
-- (filtra solo ghosts activos en histórico).

CREATE INDEX IF NOT EXISTS "User_couple_ghost_idx"
  ON "User" ("coupleId")
  WHERE "deletedAt" IS NOT NULL AND "name" = 'Usuario eliminado';

-- Auditoría S1-4: índice parcial para queries frecuentes de "user activo por
-- email" — relevante cuando crece la base de users y hay soft-deleted retenidos.
-- partial index es null-safe (solo incluye filas donde deletedAt IS NULL).
CREATE INDEX IF NOT EXISTS "User_email_active_idx"
  ON "User" ("email")
  WHERE "deletedAt" IS NULL;
