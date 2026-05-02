// v1.6.1 — Re-export desde @matripuntos/shared (source of truth post-v1.6.1).
// Este archivo se mantiene como compatibilidad para imports existentes que
// referencian './data/moodKeys.js'. En sesiones futuras, los consumidores
// pueden migrar a importar directamente de @matripuntos/shared y este shim
// se borra.

export { MOOD_KEYS, type MoodKey } from '@matripuntos/shared'
