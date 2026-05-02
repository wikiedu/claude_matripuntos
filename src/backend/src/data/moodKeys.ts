// v1.6.1 — Re-export desde packages/shared (source of truth post-v1.6.1).
// v1.6.4: rutas relativas directas al dist del shared para evitar dependencia
// del symlink npm workspace, que Render no crea cuando Build se ejecuta con
// Root Directory configurado a src/backend.

export { MOOD_KEYS, type MoodKey } from '../../../../packages/shared/dist/index.js'
