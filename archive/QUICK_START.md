# 🚀 QUICK START — MATRIPUNTOS V2

**Status:** FASE 1 + FASE 2 ✅ COMPLETADAS

---

## 📋 EN 60 SEGUNDOS

✅ Se han implementado:
- Sistema de perfiles de usuario/hogar
- Invitaciones token-based a pareja
- Onboarding de 4 pasos
- 14 categorías base + subcategorías
- Motor de cálculo puntos (15+ multiplicadores)
- Gestión de categorías personalizadas
- 26 endpoints API nuevos
- 8 componentes React nuevos

**Progreso:** 33% del proyecto (2/6 fases)

---

## 🔧 SETUP (5 MINUTOS)

```bash
# 1. Instalar dependencias
cd src/backend
npm install

cd ../frontend
npm install

# 2. Generar Prisma Client
cd ../backend
npx prisma generate
npx prisma migrate deploy
npm run seed

# 3. Iniciar servidores
# Terminal 1:
npm run dev

# Terminal 2:
cd ../frontend && npm run dev

# 4. Acceder
# http://localhost:5173
```

---

## 📚 DOCUMENTACIÓN RÁPIDA

| Documento | Duración | Contenido |
|-----------|----------|-----------|
| **V2_PROGRESS_REPORT.md** | 10 min | Overview ejecutivo |
| **PHASE1_COMPLETE.md** | 5 min | Detalles FASE 1 |
| **PHASE2_COMPLETE.md** | 5 min | Detalles FASE 2 |
| **MATRIPUNTOS_V2_SPEC.md** | 20 min | Especificación completa |
| **PHASE1_TESTING_GUIDE.md** | 15 min | Cómo testear |
| **FILES_MODIFIED_SUMMARY.md** | 5 min | Qué cambió |

---

## 🎯 PRÓXIMOS PASOS

### Inmediato (Hoy)
- [ ] npm install en backend y frontend
- [ ] npx prisma generate
- [ ] npx prisma migrate deploy
- [ ] npm run seed

### Corto plazo (Esta semana)
- [ ] Testear FASE 1 onboarding
- [ ] Testear cálculo de puntos
- [ ] Crear primera categoría custom
- [ ] Verificar que invitaciones funcionen

### Mediano plazo (Próximas 2 semanas)
- [ ] Implementar FASE 3 (Negociación)
- [ ] Pruebas e2e completas
- [ ] Deploy a staging
- [ ] Feedback de usuarios

---

## 📁 ARCHIVOS PRINCIPALES

### Backend
```
/src/backend/
├── src/
│   ├── routes/
│   │   ├── profile.ts          ← Perfiles
│   │   ├── family.ts           ← Hijos/mascotas
│   │   ├── invitations.ts      ← Invitaciones
│   │   ├── categories.ts       ← Categorías
│   │   └── pointsV2.ts         ← Cálculo puntos
│   ├── services/
│   │   └── pointsCalculator.ts ← Motor puntos
│   └── server.ts               ← Rutas agregadas
└── prisma/
    ├── schema.prisma           ← Base datos
    └── seed.ts                 ← Categorías base
```

### Frontend
```
/src/frontend/src/
├── pages/
│   └── Onboarding.tsx          ← Onboarding
├── components/
│   ├── CategoryManager.tsx      ← UI categorías
│   ├── PointsBreakdown.tsx      ← Desglose puntos
│   └── onboarding/
│       ├── OnboardingStep1.tsx  ← Perfil
│       ├── OnboardingStep2.tsx  ← Hogar
│       ├── OnboardingStep3.tsx  ← Familia
│       ├── OnboardingStep4.tsx  ← Invitar
│       └── OnboardingJoinFlow.tsx ← Join
└── services/
    └── apiClient.ts            ← Métodos nuevos
```

---

## 🧪 TESTING RÁPIDO

```bash
# Verificar rutas
curl -H "Authorization: Bearer [TOKEN]" \
  http://localhost:3000/api/categories

# Crear categoría
curl -X POST -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"name":"Custom","emoji":"🎯","type":"event","basePoints":15}' \
  http://localhost:3000/api/categories

# Ver desglose puntos
curl -X POST -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"eventId":"[EVENT_ID]"}' \
  http://localhost:3000/api/points/calculate
```

---

## 📊 ARQUITECTURA EN IMAGEN

```
┌─────────────────────────────────────────────┐
│          USUARIO (Browser)                   │
└──────────────────┬──────────────────────────┘
                   │ HTTP/JSON
                   ▼
┌─────────────────────────────────────────────┐
│   FRONTEND (React)                           │
│ - Onboarding.tsx (4 steps)                  │
│ - CategoryManager.tsx                        │
│ - PointsBreakdown.tsx                        │
│ - apiClient.ts (llamadas API)               │
└──────────────────┬──────────────────────────┘
                   │ JWT Tokens
                   ▼
┌─────────────────────────────────────────────┐
│   BACKEND (Express)                          │
│ ├─ routes/                                   │
│ │  ├─ profile.ts (4 endpoints)              │
│ │  ├─ family.ts (8 endpoints)               │
│ │  ├─ invitations.ts (4 endpoints)          │
│ │  ├─ categories.ts (7 endpoints)           │
│ │  └─ pointsV2.ts (3 endpoints)             │
│ └─ services/                                 │
│    └─ pointsCalculator.ts (15+ mults)       │
└──────────────────┬──────────────────────────┘
                   │ SQL/ORM
                   ▼
┌─────────────────────────────────────────────┐
│   DATABASE (SQLite + Prisma)                 │
│ - 11 nuevas tablas                           │
│ - 14 categorías base seeded                  │
│ - Índices optimizados                        │
└─────────────────────────────────────────────┘
```

---

## 💡 CONCEPTOS CLAVE

### Sistema de Puntos V2

```
Puntos = Base × (Hora) × (Día) × (Trabajo) × (Hijos) × (Impacto)

Ejemplos:
- Evento 20:00 sábado sin hijos: 15 × 1.3 × 1.15 × 1.0 × 1.0 × 1.0 = 22 pts
- Evento 15:00 domingo con 2 hijos: 15 × 1.1 × 1.2 × 1.0 × 1.8 × 1.0 = 39 pts
- Máximo capeado: 500 pts
```

### Invitaciones

```
Usuario A → Genera token (256-bit)
         → Envía email/link
         → Válido 7 días
         → Usuario B: Registra o Acepta
         → Ambos en mismo couple
```

### Categorías

```
14 Base (inmutables) + Infinitas Custom (editables)
↓
Cada una con subcategorías
↓
Cada subcategoría con modificador
↓
Total = Base + Modificador, luego × Multiplicadores
```

---

## 🐛 TROUBLESHOOTING

| Problema | Solución |
|----------|----------|
| npm not found | Instalar Node.js |
| Prisma error | `npx prisma generate` |
| DB migration error | `npx prisma migrate deploy` |
| Seed error | Verificar couples existen |
| API 404 | Verificar rutas en server.ts |
| Token inválido | Hacer login antes |

---

## 📞 REFERENCIAS RÁPIDAS

**API Base URL:** `http://localhost:3000/api`

**Endpoints por categoría:**
- `auth/*` — Autenticación
- `profile/*` — Perfiles
- `/children`, `/pets` — Familia
- `categories/*` — Categorías
- `points/*` — Cálculo puntos
- `events/*` — Eventos
- `tasks/*` — Tareas

**Frontend Base URL:** `http://localhost:5173`

**Rutas frontend:**
- `/login` — Login
- `/onboarding` — Onboarding
- `/onboarding/join/:token` — Join con invitación
- `/dashboard` — Dashboard principal

---

## ✨ FEATURES IMPLEMENTADAS

### FASE 1 ✅
- [x] Onboarding 4 pasos
- [x] Invitaciones token-based
- [x] Perfil usuario + hogar
- [x] Gestión hijos/mascotas
- [x] Join via link

### FASE 2 ✅
- [x] Taxonomía 14 categorías
- [x] Cálculo puntos 15+ mults
- [x] Gestión custom categories
- [x] Desglose de puntos
- [x] Seeding automático

### FASE 3-6 ⭕
- [ ] Negociación mejorada
- [ ] Gamificación (logros, scores)
- [ ] Calendario (mes/semana/día)
- [ ] Premium model + Stripe

---

## 🎉 RESUMEN FINAL

**COMPLETADO:**
- ✅ 26 endpoints API
- ✅ 11 tablas BD
- ✅ 8 componentes React
- ✅ 15+ multiplicadores puntos
- ✅ Sistema invitaciones
- ✅ Onboarding completo

**EN 3-4 HORAS:**
- Arquitectura V2 completa
- Código listo para testing
- Documentación exhaustiva
- Proyecto 33% completo

**PRÓXIMO:**
- FASE 3: Negociación Mejorada
- Testing e2e
- Deploy staging

---

**¡Listo para empezar! 🚀**

Comienza con: `npm install` → `npx prisma generate` → `npm run seed`

Para más info, ver **V2_PROGRESS_REPORT.md**
