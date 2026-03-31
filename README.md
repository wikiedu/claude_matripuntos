# Matripuntos 💑

**Una app para parejas que gamifica la equidad en las responsabilidades del hogar.**

Cuando uno de la pareja se va a una despedida, cena, viaje o lo que sea que haga que la otra persona se quede sola gestionando la casa, los hijos y las obligaciones del matrimonio, genera matripuntos. Un sistema gamificado que permite solicitar actividades, negociar puntos y mantener el equilibrio.

---

## 📋 Características

### Core (MVP)
- ✅ Sistema dual de puntos:
  - **Tareas diarias recurrentes**: Cocina, limpieza, baños, compra, logística, cuidado
  - **Actividades puntuales**: Cenas, viajes, despedidas, eventos
- ✅ Cálculo automático de puntos (multiplicadores por hijos, franja horaria, duración, tipo)
- ✅ Solicitud y negociación de actividades (máx 2 rondas gratis)
- ✅ Compensaciones que mitigan costes
- ✅ Auto-aceptación de tareas después de 24h
- ✅ Dashboard en tiempo real con saldo y gráficos
- ✅ Bandeja de solicitudes con historial de negociación
- ✅ Configuración editable (tareas, multiplicadores, tipos de actividad)
- ✅ Notificaciones smart (máx 1-2/día)
- ✅ Uso forzado de matripuntos si hay desacuerdo

### Premium (Roadmap)
- 📋 Más rondas de negociación ilimitadas
- 📋 Analíticas avanzadas (90+ días, tendencias, equidad score)
- 📋 Integraciones (Google Calendar, Slack)
- 📋 Backup automático y export de datos
- 📋 Soporte prioritario

---

## 🚀 Tech Stack

**Frontend:**
- React 18 + TypeScript
- Tailwind CSS (styling)
- Recharts (gráficos)
- Zustand (state management)
- React Query (server state)

**Backend:**
- Node.js + Express
- Zod (validación)
- Stripe (pagos)
- JWT (autenticación)

**Database:**
- PostgreSQL (Supabase recomendado)
- Prisma (ORM)

**Hosting:**
- Vercel (frontend)
- Railway / Render (backend)

---

## 📁 Estructura del Proyecto

```
/Matripuntos
├── /docs                          # Especificaciones
│   ├── TABLA_PUNTOS.md           # Sistema de puntos (fórmula, tabla)
│   ├── FLUJOS_UX.md              # Flujos de usuario (narrativas)
│   ├── MODELO_DATOS.md           # Esquema de BD
│   ├── PANTALLAS_MVP.md          # Descripción de pantallas
│   ├── MONETIZACION.md           # Plan freemium
│   └── ESPECIFICACION.md         # (TODO)
│
├── /src
│   ├── /frontend                 # React app
│   │   ├── /components
│   │   ├── /pages
│   │   ├── /hooks
│   │   ├── /store
│   │   ├── /utils
│   │   ├── /styles
│   │   ├── /types
│   │   ├── app.tsx
│   │   ├── main.tsx
│   │   └── vite.config.ts
│   │
│   ├── /backend                  # Node.js / Express
│   │   ├── /routes
│   │   ├── /controllers
│   │   ├── /middleware
│   │   ├── /services
│   │   ├── /models (Prisma)
│   │   ├── /utils
│   │   ├── /types
│   │   ├── server.ts
│   │   └── config.ts
│   │
│   └── /database
│       └── schema.sql            # SQL schema inicial
│
├── /design                        # Figma, wireframes, assets
├── .env.example
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

---

## ⚡ Quick Start

### Requisitos Previos
- Node.js 18+
- PostgreSQL 14+
- Git

### Setup Inicial

```bash
# Clone repository
git clone <repo>
cd Matripuntos

# Install dependencies
npm install

# Setup env variables
cp .env.example .env
# Edita .env con tus datos (DB, Stripe API key, etc.)

# Setup database
npx prisma migrate dev

# Start dev server
npm run dev
```

### URLs
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Database: postgresql://localhost:5432/matripuntos

---

## 📚 Documentación

Toda la especificación está en `/docs`:

1. **[TABLA_PUNTOS.md](./docs/TABLA_PUNTOS.md)** - Cómo se calculan los puntos
2. **[FLUJOS_UX.md](./docs/FLUJOS_UX.md)** - Narrativas de cada flujo
3. **[MODELO_DATOS.md](./docs/MODELO_DATOS.md)** - Esquema de BD
4. **[PANTALLAS_MVP.md](./docs/PANTALLAS_MVP.md)** - Wireframes y especificaciones UI
5. **[MONETIZACION.md](./docs/MONETIZACION.md)** - Plan de pricing freemium

---

## 🎯 Roadmap

### MVP (Sprint 1-2: Marzo-Abril)
- ✅ Autenticación (signup/login)
- ✅ Dashboard con saldo
- ✅ Solicitar actividad + cálculo
- ✅ Negociación (2 rondas gratis)
- ✅ Registrar tarea
- ✅ Bandeja de solicitudes
- ✅ Configuración básica
- ✅ Deploy web

### V1.1 (Sprint 3: Mayo)
- 📋 Historial y analytics básicas
- 📋 Notificaciones push
- 📋 Compensaciones avanzadas

### V1.2 (Sprint 4+)
- 📋 Plan PREMIUM
- 📋 Integraciones (Google Calendar)
- 📋 App nativa (React Native)

---

## 👥 Equipo

- **Product**: Eduardo Calderón
- **Design/Spec**: Este documento
- **Development**: TBD

---

## 📝 Notas Importantes

### Principios de Diseño
1. **Transparencia**: Todos los cálculos muestran desglose
2. **Justo**: El sistema debe ser percibido como justo por ambos
3. **Simple**: MVP funcional, evoluciona después
4. **Mobile-first**: Funciona igual en móvil que desktop
5. **No invasivo**: Notificaciones smart, no abrumar

### Decisiones Confirmadas
- ✅ Sistema dual (tareas + actividades)
- ✅ Multiplicadores: hijos (0:1.0x, 1:1.4x, 2:1.8x, 3+:2.2x)
- ✅ Decimales hasta 0.5
- ✅ Negociación: 2 rondas gratis, 3+ premium
- ✅ Compensaciones: fijo + modificadores
- ✅ Validación tareas: confirmación opcional + auto-accept 24h
- ✅ Tech: React + Node + PostgreSQL
- ✅ Timeline: Urgente (MVP ASAP)

---

## 🔧 Desarrollo

### Comandos Útiles
```bash
# Frontend
npm run dev          # Start dev server
npm run build        # Build for prod
npm run lint         # ESLint
npm run test         # Run tests

# Backend
npm run server       # Start backend
npm run migrate      # Database migration
npm run seed         # Populate seed data
npm run prisma:studio  # Open Prisma Studio
```

### Git Workflow
```bash
git checkout -b feature/my-feature
# ... make changes ...
git commit -m "feat: add new feature"
git push origin feature/my-feature
# Create PR
```

---

## 📄 License

MIT

---

## 💬 Contacto

Para preguntas, feedback o bugs: [TBD]

---

**Hecho con ❤️ para parejas que quieren equidad gamificada.**
