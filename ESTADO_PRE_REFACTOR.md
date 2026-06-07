# Estado pre-refactor Matripuntos — 7 junio 2026

Baseline antes del refactor con Opus 4.8. Documenta qué funciona hoy
para detectar regresiones después del refactor.

## Funcionalidad core (NO se puede romper)

### Tareas (suman puntos)
- User crea una tarea con valor en puntos
- User la marca como completada (con o sin foto de prueba)
- Sistema suma puntos al usuario que la completó
- La pareja ve el cambio reflejado (vía polling 30s)

### Actividades (restan puntos)
- User propone una actividad con coste en puntos
- Negociación entre los dos miembros de la pareja
- Aceptación de la actividad → resta puntos
- Estado del saldo de puntos visible para ambos

### Gamificación (importante, a mejorar después)
- Sistema de puntos funcional
- Logros / achievements existen pero a mejorar (estilo Duolingo es el norte)

### Auth y emparejamiento
- Login de los 2 usuarios
- Vinculación de pareja (couple)
- Cada usuario solo ve datos de su pareja

## Funciona pero con bugs intermitentes
- Backend a veces falla con lógicas concretas (sin patrón identificado,
  documentar cuando se reproduzca)

## Roto confirmado por auditoría 2026-06-07
- Web push: `useWebPush` registra `/push-sw.js` que no existe en `public/`
- Safe-area iPhone con notch: viewport sin `viewport-fit=cover`
  (todo el código `env(safe-area-inset-*)` está inerte)
- IDOR cross-couple en `/api/events/:id/respond` y `/propose`
  (ruta V2 vencida 01 Jun 2026, sigue montada)

## Estado técnico
- Stack: Vite 5 + React 18 SPA + react-router
- Backend: Express + Prisma + Postgres en Supabase (sin Realtime, sin RLS efectiva)
- Sync entre usuarios: polling React Query cada 30s
- TypeScript: backend con `strict: false`, ~196 `any`
- Logging: 131 `console.*` sin logger estructurado
- Versión: v2.8.0

## Datos en BD
- Todo es de prueba, se puede borrar sin pérdida
- Útil para tener algo con lo que testear post-refactor

## Flujos críticos que se probarán manualmente tras el refactor
1. Login user A + user B → ambos ven el dashboard de pareja
2. User A crea tarea → la marca completa → puntos suman → User B lo ve
3. User A propone actividad → User B contraproporne / acepta →
   puntos restan al aceptar
4. Logros y badges se otorgan correctamente al alcanzar hitos

## Decisiones arquitectónicas tomadas (7 jun 2026)
- Mantener Vite SPA (futuro: Capacitor para móvil híbrido/nativo)
- Mantener polling ahora, Supabase Realtime selectivo en fase posterior
- Activar PWA en este refactor (manifest + SW + push real)
- Activar `strict: true` en backend
- Activar rotación de refresh tokens
- Retirar rutas V2 deprecadas (empezando por la del IDOR)
