-- v2.1.0 Refactor gamificación: renombre de slugs de Couple.level del sistema
-- legacy "Nido/Brote/..." al unificado "Encuentro/Confianza/..." (10 niveles).
-- Mapeo aprobado en docs/superpowers/specs/2026-05-03-gamification-refactor-design.md.

UPDATE "Couple" SET "level" = 'encuentro'   WHERE "level" = 'nido';
UPDATE "Couple" SET "level" = 'confianza'   WHERE "level" = 'brote';
UPDATE "Couple" SET "level" = 'refugio'     WHERE "level" = 'hogar';
-- raices se mantiene igual ('raices' -> 'raices')
UPDATE "Couple" SET "level" = 'legado'      WHERE "level" = 'diamante';
UPDATE "Couple" SET "level" = 'eterno'      WHERE "level" = 'leyenda';
UPDATE "Couple" SET "level" = 'mito'        WHERE "level" = 'eterno' AND "xp" >= 100000;
-- 'eterno' (legacy threshold 80000) → 'eterno' (nuevo threshold 24000), se mantiene.

-- Defensivo: cualquier valor inesperado vuelve al primer nivel.
UPDATE "Couple" SET "level" = 'encuentro'
WHERE "level" NOT IN (
  'encuentro','confianza','compania','complicidad','refugio',
  'raices','tribu','legado','eterno','mito'
);
