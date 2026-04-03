# 🚀 Getting Started - Matripuntos MVP

**Tienes un proyecto funcional listo para correr. Aquí está cómo hacerlo en 30 segundos.**

---

## ⚡ Quick Start (Windows/Mac/Linux)

### 1️⃣ Instala dependencias
```bash
npm install
```
**Espera:** ~2 minutos mientras se descargan React, Tailwind, Recharts, etc.

### 2️⃣ Abre dos terminales

**Terminal 1 - Frontend:**
```bash
npm run dev
```
→ Espera a que diga: `VITE v5.0.8 ready in XXX ms`

**Terminal 2 - Backend:**
```bash
npm run server
```
→ Espera a que diga: `🚀 Matripuntos backend running on http://localhost:3000`

### 3️⃣ Abre el navegador
```
http://localhost:5173
```

**¡Listo!** Estás viendo el MVP funcional.

---

## 🎮 Qué Puedes Hacer

### En el Dashboard (la primera pantalla):
1. **Ves el saldo** de Juan (35.5 pts) vs María (-12.0 pts)
2. **Gráfico interactivo** de últimos 30 días
3. **4 botones:**
   - ✅ **"Solicitar Actividad"** → VE EL CÁLCULO EN TIEMPO REAL
   - ⬜ "Registrar Tarea" (todavía en construcción)
   - ✅ **"Bandeja: 2 Pendientes"** → VE LA NEGOCIACIÓN

### En "Solicitar Actividad":
1. Elige tipo (Cena, Deporte, Viaje, etc.)
2. Pon fecha/hora
3. **Mira el CÁLCULO AUTOMÁTICO:**
   - Base points
   - Multiplicador tipo actividad
   - Multiplicador franja horaria
   - Multiplicador duración
   - Multiplicador hijos
   - Descuento por compensación
   - **TOTAL FINAL**

**Prueba esto:** Elige "Cena" viernes 19:30-23:30 → verás 10 pts. Ahora marca "Con hijos" → 18 pts. ¡La magia del multiplicador!

### En "Bandeja de Solicitudes":
1. **Click en una solicitud** → ves el detalle
2. **Historial de negociación** (rondas previas)
3. **Form para responder** (aceptar / ajustar / rechazar)

---

## 📋 Archivos Importantes

| Ruta | Qué es |
|------|--------|
| `/docs/MVP_COMPLETADO.md` | Resumen de qué está hecho |
| `/src/frontend/src/pages/Dashboard.tsx` | Pantalla principal |
| `/src/frontend/src/pages/RequestActivity.tsx` | Formulario solicitud + cálculo |
| `/src/frontend/src/pages/RequestInbox.tsx` | Bandeja negociación |
| `/src/frontend/src/utils/pointsCalculator.ts` | **Motor de cálculo (el core)** |
| `/src/backend/prisma/schema.prisma` | Schema BD (11 tablas) |

---

## 🧪 Prueba el Motor de Cálculo

Si quieres entender cómo funciona el cálculo, abre:
```
/src/frontend/src/utils/pointsCalculator.ts
```

Verás la función `calculateActivityPoints()` que hace todo:
- Aplica multiplicadores
- Aplica compensaciones
- Redondea a 0.5
- Retorna desglose paso a paso

**Es testeable, rápido y sin dependencias** → perfecto para testing.

---

## 📱 Responsive?

Sí. Abre DevTools (F12) y prueba en mobile (iPhone 12). Todo funciona.

---

## 🛑 Errores Comunes

**"Module not found"**
→ Hiciste `npm install`? Si no:
```bash
npm install
```

**"Cannot find module 'react'"**
→ Mismo problema. `npm install` resuelve.

**"Port 5173 already in use"**
→ Cambia el puerto en `src/frontend/vite.config.ts`:
```ts
server: {
  port: 5174,  // ← Cambiar aquí
}
```

**"Connection refused localhost:3000"**
→ ¿Corriste `npm run server`? Hazlo en terminal 2.

---

## 🎯 Siguientes Pasos

### Si quieres ampliar (DIY):
1. Crea pantalla de "Registrar Tarea" (template en `/docs/PANTALLAS_MVP.md`)
2. Crea pantalla de "Configuración" (editar multiplicadores)
3. Crea pantalla de "Historial" (con filters)

### Si quieres conectar a BD:
1. Setup Supabase (PostgreSQL free tier)
2. `npx prisma migrate dev` (cuando tengas DATABASE_URL)
3. Crear endpoints en backend
4. Conectar frontend a API

### Si quieres hacer tests:
1. Crea archivo `pointsCalculator.test.ts`
2. Usa Vitest (es lo estándar)
3. Testea casos edge (ej: compensación múltiple, hijos = 3, etc.)

---

## 💬 Preguntas?

- "¿Por qué se ve vacío el gráfico?" → Es mock data realista
- "¿Por qué no guarda nada?" → Aún no tiene BD, es mock
- "¿Puedo cambiar los colores?" → Sí, en `src/frontend/tailwind.config.js`

---

## ✨ Demo (2 minutos)

1. Dashboard → muestra saldos
2. Click "Solicitar Actividad"
3. Pon "Cena" viernes 19:30-23:30
4. Marca "Cocina hecha" (compensación)
5. **MIRA el cálculo: 9 pts** (en lugar de 10)
6. Vuelve atrás
7. Click "Bandeja: 2"
8. Click solicitud
9. Muestra contrapropuesta

**Tiempo:** ~2 min, **Impacto:** muy alto 🎯

---

## 🚀 Ready?

```bash
npm install && npm run dev
```

Tu MVP está esperando. 🎉
