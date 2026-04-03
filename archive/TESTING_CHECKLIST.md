# 🧪 MATRIPUNTOS V2 - TESTING CHECKLIST

## PRE-TEST SETUP ✅

```bash
# 1. Instalar Node.js 18+ (si no lo tienes)
# https://nodejs.org/

# 2. Backend Setup
cd /Users/edu/Web\ development/Claude/Matripuntos/src/backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed

# 3. Frontend Setup
cd ../frontend
npm install

# 4. Iniciar Backend (Terminal 1)
cd ../backend
npm run dev
# Esperado: 🚀 Matripuntos backend running on http://localhost:3000

# 5. Iniciar Frontend (Terminal 2)
cd ../frontend
npm run dev
# Esperado: Local: http://localhost:5173/
```

---

## TEST FASE 1: ONBOARDING & INVITATIONS 🎯

### 1.1 - Health Check
- [ ] Backend health: `curl http://localhost:3000/api/health`
- [ ] Esperado: `{"status":"ok",...}`

### 1.2 - Sign Up
- [ ] Abre http://localhost:5173
- [ ] Click en "Sign Up"
- [ ] Llena:
  - User 1: user1@test.com / test123 / Juan
  - User 2: user2@test.com / test123 / María
- [ ] Click "Crear Pareja"
- [ ] **Esperado:** Redirección a onboarding

### 1.3 - Onboarding (4 pasos)
- [ ] **Paso 1 - Información Personal:**
  - [ ] Llenar nombre, apellido, fecha nacimiento
  - [ ] Horas de trabajo por semana
  - [ ] Modo de trabajo (presencial/híbrido/teletrabajo)
  - [ ] Click "Siguiente"

- [ ] **Paso 2 - Datos Pareja:**
  - [ ] Tipo de hogar (piso/casa/otro)
  - [ ] Tamaño m²
  - [ ] Servicios externos
  - [ ] Click "Siguiente"

- [ ] **Paso 3 - Hijos y Mascotas:**
  - [ ] Agregar hijo (opcional)
  - [ ] Agregar mascota (opcional)
  - [ ] Click "Siguiente"

- [ ] **Paso 4 - Preferencias:**
  - [ ] Tareas que amas
  - [ ] Tareas que odias
  - [ ] Click "Completar Onboarding"

- [ ] **Esperado:** Dashboard visible

### 1.4 - Invitación a Pareja
- [ ] En Dashboard, busca botón "Invitar"
- [ ] Copia el link de invitación
- [ ] Abre en navegador incógnito
- [ ] Abre el link
- [ ] Acepta la invitación
- [ ] Crea cuenta con user2@test.com
- [ ] **Esperado:** User 2 en el mismo couple

---

## TEST FASE 2: PUNTOS & CATEGORÍAS 📊

### 2.1 - Crear Evento
- [ ] En Dashboard, click "Solicitar Actividad"
- [ ] Llena:
  - Tipo: "Cena especial"
  - Fecha: Hoy
  - Hijos: Sí/No
  - Descripción: Algo bonito
- [ ] **Esperado:** Ve los puntos calculados (15-500)

### 2.2 - Ver Desglose de Multiplicadores
- [ ] Click "Ver Desglose"
- [ ] Deberías ver:
  - [ ] Base: 15 pts
  - [ ] × Hora (1.0-1.6)
  - [ ] × Día (1.0-1.2)
  - [ ] × Trabajo (1.0-1.2)
  - [ ] × Hijos (1.0-2.2)
  - [ ] × Impacto (0.7-1.2)
  - [ ] = Total
- [ ] **Esperado:** Matemáticas correctas, cap 500

### 2.3 - Categorías Personalizadas
- [ ] En Dashboard, busca "Categorías"
- [ ] Crea nueva categoría:
  - Nombre: "Limpieza Profunda"
  - Emoji: 🧹
  - Puntos base: 20
- [ ] **Esperado:** Categoría listada y disponible

---

## TEST FASE 3: NEGOCIACIÓN 🤝

### 3.1 - Propuesta Inicial
- [ ] Usuario 1 crea evento: "Cena Romántica"
- [ ] Propone: 60 puntos
- [ ] Click "Enviar Propuesta"
- [ ] **Esperado:** Estado "Propuesta Enviada"

### 3.2 - Aceptar Propuesta (Usuario 2)
- [ ] Usuario 2 ve evento pendiente
- [ ] Click "Aceptar"
- [ ] **Esperado:** Estado cambio a "Aceptado" ✅

### 3.3 - Rechazar Propuesta
- [ ] Usuario 1 crea evento: "Viaje"
- [ ] Propone: 100 puntos
- [ ] Usuario 2 click "Rechazar"
- [ ] **Esperado:** Estado "Rechazado" ❌

### 3.4 - Contra-Propuesta
- [ ] Usuario 1 propone: "Limpieza" por 40 pts
- [ ] Usuario 2 click "Contra-proponer"
- [ ] Propone: 35 puntos
- [ ] Usuario 1 ve contra-propuesta
- [ ] Usuario 1 "Aceptar contra-propuesta"
- [ ] **Esperado:** 2 rondas máximo, luego aceptado

### 3.5 - Historial
- [ ] Click en evento
- [ ] Ver historial de negociación
- [ ] **Esperado:** Timeline con all propuestas

---

## TEST FASE 4: GAMIFICACIÓN 🏆

### 4.1 - Desbloquear Logros
- [ ] Usuario 1 crea y acepta 5+ eventos
- [ ] User 2 hace lo mismo
- [ ] **Esperado:**
  - [ ] "Primer Evento" desbloqueado (1 evento)
  - [ ] "Colaborador" desbloqueado (5 eventos)
  - [ ] Badges visibles

### 4.2 - Leaderboard
- [ ] En Dashboard, busca "Logros"
- [ ] Click "Ver Leaderboard"
- [ ] **Esperado:**
  - [ ] Muestra puntos totales
  - [ ] Ranking usuarios
  - [ ] Progreso de logros

### 4.3 - Resumen Semanal
- [ ] En Gamificación Dashboard
- [ ] Ve "Resumen Semanal"
- [ ] **Esperado:**
  - [ ] Puntos de la semana
  - [ ] Eventos completados
  - [ ] Logros desbloqueados

---

## TEST FASE 5: CALENDARIO 📅

### 5.1 - Vista Mensual
- [ ] Click en "Ver Calendario"
- [ ] Ve vista de mes
- [ ] **Esperado:**
  - [ ] Grid de días
  - [ ] Eventos marcados
  - [ ] Colores por tipo

### 5.2 - Navegación
- [ ] Click siguiente mes
- [ ] Click mes anterior
- [ ] Click "Hoy"
- [ ] **Esperado:** Cambia correctamente

### 5.3 - Ver Detalles Día
- [ ] Click en un día
- [ ] Ve todos los eventos del día
- [ ] **Esperado:** Detalles desplegados

### 5.4 - Vista Semanal
- [ ] Click botón "Semana"
- [ ] Ve 7 columnas (lun-dom)
- [ ] **Esperado:** Eventos por día correctos

### 5.5 - Vista Diaria
- [ ] Click botón "Día"
- [ ] Ve formulario "Agregar evento"
- [ ] Llena y crea evento
- [ ] **Esperado:** Evento creado y listado

### 5.6 - Próximos Eventos
- [ ] Click botón "Próximos"
- [ ] Ve eventos de los próximos 30 días
- [ ] **Esperado:** Ordenados por fecha

---

## TEST FASE 6: ANALYTICS AVANZADO 📈

### 6.1 - Dashboard Abierto
- [ ] Click "Analytics Avanzado"
- [ ] Ve 4 tarjetas KPI
- [ ] **Esperado:**
  - [ ] Total de eventos
  - [ ] Puntos totales
  - [ ] Tasa de éxito
  - [ ] Logros desbloqueados

### 6.2 - Período (Semana/Mes)
- [ ] Click "Última semana"
- [ ] Datos se actualizan
- [ ] Click "Último mes"
- [ ] **Esperado:** Datos diferentes

### 6.3 - Gráficos
- [ ] Ve "Tendencia Semanal" (línea)
- [ ] Ve "Puntos por Tipo" (barra)
- [ ] **Esperado:** Gráficos se renderizan

### 6.4 - Comparativa Usuarios
- [ ] Tarjetas para cada usuario
- [ ] **Esperado:**
  - [ ] Eventos completados
  - [ ] Puntos totales
  - [ ] Tasa de éxito
  - [ ] Promedio por evento

### 6.5 - Negociaciones
- [ ] Ve estadísticas de negociación
- [ ] **Esperado:**
  - [ ] Aceptadas (verde)
  - [ ] Rechazadas (rojo)
  - [ ] Rondas promedio

---

## TEST INTEGRACIÓN GENERAL ✅

### Flujo Completo (25 min)

1. [ ] **Minuto 0-5:** Login → Onboarding (4 pasos)
2. [ ] **Minuto 5-7:** Invitar pareja, accept en incógnito
3. [ ] **Minuto 7-10:** Crear 3 eventos con puntos
4. [ ] **Minuto 10-12:** Una propuesta, aceptar
5. [ ] **Minuto 12-14:** Una contra-propuesta
6. [ ] **Minuto 14-16:** Ver historial negociación
7. [ ] **Minuto 16-18:** Ver calendario (mes/semana/día)
8. [ ] **Minuto 18-20:** Crear evento en calendario
9. [ ] **Minuto 20-22:** Ver logros y leaderboard
10. [ ] **Minuto 22-25:** Ver analytics, gráficos

**Esperado:** Todo funciona sin errores ✅

---

## CRITERIOS DE ÉXITO 🎯

- ✅ No hay errores en console
- ✅ Todas las APIs responden
- ✅ Datos se guardan en BD
- ✅ Frontend se actualiza correctamente
- ✅ Autenticación funciona
- ✅ Las 6 fases completas funcionan
- ✅ Los gráficos se renderizan
- ✅ Las transiciones son suaves

---

## NOTAS IMPORTANTES

⚠️ **Si algo falla:**
1. Abre DevTools (F12)
2. Ve a Console
3. Busca el error
4. Anota el error exacto
5. Reporta con mensaje completo

🔄 **Si necesitas resetear:**
```bash
# Elimina la BD
rm src/backend/prisma/dev.db

# Reinicia
npx prisma migrate deploy
npm run seed
```

---

**Status:** ✅ LISTO PARA TESTING
**Fecha:** 2 de Abril de 2026
**Versión:** Matripuntos V2 - FASE 1-6 Complete
