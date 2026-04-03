# Matripuntos

App web gamificada que ayuda a parejas a gestionar responsabilidades del hogar de forma equitativa mediante un sistema de puntos negociables.

**[Ver contexto completo → CLAUDE.md](./CLAUDE.md)**

---

## Quick Start

```bash
# Backend (SQLite, sin setup adicional)
cd src/backend && npm install && npm run dev    # localhost:3000

# Frontend
cd src/frontend && npm install && npm run dev   # localhost:5173
```

Health check: `http://localhost:3000/api/health`

---

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind + Zustand
- **Backend:** Node.js + Express + TypeScript + Prisma + Zod
- **DB local:** SQLite · **DB producción:** PostgreSQL (Supabase)
- **Deploy:** Vercel (frontend) + Railway (backend)

---

## Documentación

| Archivo | Contenido |
|---------|-----------|
| [CLAUDE.md](./CLAUDE.md) | Contexto completo del proyecto (stack, rutas, DB, reglas) |
| [docs/PUNTOS.md](./docs/PUNTOS.md) | Sistema de puntos: fórmula, multiplicadores, ejemplos |
| [docs/API.md](./docs/API.md) | Referencia completa de endpoints |
| [docs/FLUJOS.md](./docs/FLUJOS.md) | Flujos UX principales |
| [docs/DATOS.md](./docs/DATOS.md) | Schema de base de datos |
| [CHANGELOG.md](./CHANGELOG.md) | Historial de cambios |

---

## Comandos Útiles

```bash
cd src/backend
npx prisma studio          # Browser de base de datos
npx prisma migrate dev     # Aplicar migraciones
npx ts-node prisma/seed.ts # Seed de datos de prueba
```

---

**Eduardo Calderón** — https://github.com/wikiedu/claude_matripuntos
