# 🚀 GUÍA DE DESPLIEGUE A PRODUCCIÓN

## Introducción

Esta guía te lleva paso a paso a desplegar Matripuntos en la nube. Usaremos:

- **Frontend**: Vercel
- **Backend**: Railway (o Render)
- **Base de datos**: Supabase (PostgreSQL)

Tiempo estimado: 1-2 horas (si es la primera vez)

---

## PARTE 1: PRE-DESPLIEGUE (LOCAL)

### 1.1 Preparar el Código

```bash
# 1. Asegurar que todo está commiteado
git status
# Si hay cambios sin commitear:
git add .
git commit -m "Pre-production: cleanup and optimization"

# 2. Verificar build sin errores
cd src/frontend && npm run build
cd ../backend && npm run build

# 3. Limpiar dependencias no usadas
npm prune

# 4. Verificar variables de entorno necesarias
cat .env
# Debería tener:
# VITE_API_URL=http://localhost:3000 (cambiará en producción)
# JWT_SECRET=tu_secreto_seguro
# DATABASE_URL=sqlite:./dev.db (cambiará a PostgreSQL)

# 5. Crear .env.example (sin valores sensibles)
# Esto es para documentar qué variables se necesitan
```

### 1.2 Checklist Pre-Producción

```
□ Código compilado sin errores (npm run build)
□ Tests pasan (si existen)
□ No hay console.log() en código
□ Variables de entorno documentadas
□ Git history limpio (sin archivos sensibles)
□ README.md actualizado
□ Dependencias auditadas (npm audit)
□ Versiones de Node.js sincronizadas
□ Base de datos: esquema migrado
```

---

## PARTE 2: CONFIGURAR SUPABASE (Base de Datos)

### 2.1 Crear Proyecto en Supabase

1. **Ir a https://supabase.com**
2. **Click "New Project"**
3. **Rellenar:**
   ```
   Name: matripuntos-prod
   Database Password: [Contraseña segura, guardar en 1Password/LastPass]
   Region: Europe-West (España) o tu región
   Plan: Free (hasta 500 MB, suficiente para MVP)
   ```

4. **Esperar 1-2 minutos a que se cree**

### 2.2 Obtener Connection String

1. **En Supabase dashboard, ir a "Settings" → "Database"**
2. **Ver "Connection Pooling" (importante para aplicaciones web)**
3. **Copiar el URI (PostgreSQL):**
   ```
   postgresql://[user]:[password]@[host]:[port]/postgres?sslmode=require
   ```

4. **Guardar en un lugar seguro (no commitear)**

### 2.3 Migrar Base de Datos

```bash
# Desde src/backend

# 1. Crear variable de entorno con la nueva BD
export DATABASE_URL="postgresql://[user]:[password]@[host]:[port]/postgres?sslmode=require"

# 2. Ejecutar migraciones de Prisma
npx prisma migrate deploy

# 3. Verificar que esquema se creó
npx prisma studio
# Debería abrirse interfaz visual en http://localhost:5555
# Verificar que todas las tablas existen

# 4. (Opcional) Seed de datos de prueba
# npx prisma db seed
```

Si hay errores, comprobar:
```bash
# Verificar conexión
npx prisma db execute --stdin < check_connection.sql

# Ver esquema creado
npx prisma introspect  # Regenera schema.prisma basado en BD
```

---

## PARTE 3: DESPLEGAR BACKEND EN RAILWAY

### 3.1 Crear Proyecto en Railway

1. **Ir a https://railway.app**
2. **Sign in con GitHub**
3. **Click "New Project"**
4. **Opción: "Deploy from GitHub"**
5. **Seleccionar repositorio `claude_matripuntos`**
6. **Railway detectará estructura automáticamente**

### 3.2 Configurar Variables de Entorno

En Railway dashboard:

```
Variables → Click "Add Variable"

Agregar:
- DATABASE_URL = postgresql://[user]:[pass]@[host]:[port]/postgres?sslmode=require
- JWT_SECRET = [Valor seguro, mínimo 32 caracteres]
- PORT = 3000 (automático)
- NODE_ENV = production
- FRONTEND_URL = https://matripuntos.vercel.app (se configura después)
```

### 3.3 Configurar Build & Start Commands

En Railway, ir a "Settings" → "Build":

```
Build Command:
npm run build

Start Command:
npm start

Root Directory:
src/backend

Deployment:
Automatic (trigger on push to main)
```

### 3.4 Desplegar

```bash
# Opción A: Desde CLI de Railway
npm install -g @railway/cli
railway link  # Link a tu proyecto en Railway
railway up    # Desplegar

# Opción B: Push a GitHub (automático)
git push origin main
# Railway detecta cambios y despliega automáticamente

# Esperar 2-5 minutos a que depliegue
```

### 3.5 Verificar Despliegue

```bash
# Railway te dará una URL pública, ej:
# https://matripuntos-production-xxxx.up.railway.app

# Probar health check:
curl https://matripuntos-production-xxxx.up.railway.app/api/health
# Debería retornar: {"status": "ok", "timestamp": "..."}

# Si hay error, ver logs en Railway:
# Dashboard → Logs → Ver qué salió mal
```

---

## PARTE 4: DESPLEGAR FRONTEND EN VERCEL

### 4.1 Crear Proyecto en Vercel

1. **Ir a https://vercel.com**
2. **Sign in con GitHub**
3. **Click "New Project"**
4. **Seleccionar repositorio `claude_matripuntos`**
5. **Vercel detectará configuración automáticamente**

### 4.2 Configurar Build & Output

En Vercel, "Framework Preset" debería ser **Vite**. Verificar:

```
Build Command:
cd src/frontend && npm run build

Output Directory:
src/frontend/dist

Install Command:
npm install
```

### 4.3 Configurar Variables de Entorno

En Vercel, ir a "Settings" → "Environment Variables":

```
VITE_API_URL = https://matripuntos-production-xxxx.up.railway.app

Aplicar a: Production
```

### 4.4 Desplegar

```bash
# Opción A: Automático desde GitHub
git push origin main
# Vercel detecta cambios y despliega automáticamente (2-5 min)

# Opción B: Desde CLI
npm install -g vercel
vercel login
vercel
```

### 4.5 Verificar Despliegue

```bash
# Vercel te dará una URL, ej:
# https://matripuntos.vercel.app

# Abrir en navegador:
# https://matripuntos.vercel.app
# Debería cargar el login
```

---

## PARTE 5: CONECTAR FRONTEND Y BACKEND

### 5.1 Actualizar CORS en Backend

En `src/backend/src/server.ts`, cambiar:

```typescript
// De:
cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
})

// A asegurar que FRONTEND_URL está en variables de Railway
// (ya lo configuramos arriba)
```

### 5.2 Verificar Conexión

Ir a la app en Vercel:
```
1. Login
2. Sign up con credenciales de prueba
3. Crear solicitud de actividad
4. Ver que se guarda en BD de Supabase
```

Si hay error CORS, verificar:
```bash
# En Railway, ver logs
railway logs

# En Vercel, ver logs
# Dashboard → Deployments → Ver logs de build/runtime
```

---

## PARTE 6: OPTIMIZACIONES DE PRODUCCIÓN

### 6.1 Frontend

```typescript
// src/frontend/vite.config.ts
export default {
  build: {
    outDir: 'dist',
    sourcemap: false,  // No incluir source maps en producción
    minify: 'terser',  // Minify JS
    reportCompressedSize: true,  // Ver tamaño final
  },
  define: {
    __DEV__: false,  // Remover código dev
  },
}
```

### 6.2 Backend

```bash
# Asegurar NODE_ENV=production en Railway
# Esto automáticamente:
# - Desactiva logs verbosos
# - Activa compresión de respuestas
# - Oculta info sensible en errores
```

### 6.3 Base de Datos

```sql
-- En Supabase SQL editor

-- Crear índices para queries comunes
CREATE INDEX idx_events_couple_created ON events(couple_id, created_at DESC);
CREATE INDEX idx_negotiations_event ON negotiations(event_id);
CREATE INDEX idx_task_logs_user ON task_logs(completed_by, date DESC);

-- Crear vista para balance de usuario
CREATE VIEW user_balances AS
SELECT
  u.id,
  u.couple_id,
  COALESCE(SUM(CASE WHEN to_user_id = u.id THEN points ELSE -points END), 0) as balance
FROM users u
LEFT JOIN points_transactions pt ON u.id = pt.from_user_id OR u.id = pt.to_user_id
GROUP BY u.id, u.couple_id;
```

### 6.4 Monitoreo

```bash
# Railway: Ir a "Logs" → Active logs
# Vercel: Ir a "Deployments" → "Function Logs"
# Supabase: Ir a "Logs" → Ver queries y errores

# Configurar alertas:
# Railway: "Alerts" → triggerar si error rate > X%
# Vercel: No tiene alertas nativas, usar Sentry/Rollbar

# (Futuro) Integrar Sentry para error tracking:
import * as Sentry from "@sentry/node"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
})
```

---

## PARTE 7: CONFIGURACIÓN DE DOMINIO

### 7.1 Comprar Dominio

1. **Comprar en GoDaddy, Namecheap, o similar**
2. **Ej: matripuntos.com ($10-15/año)**

### 7.2 Configurar DNS en Vercel

1. **En Vercel, ir a "Settings" → "Domains"**
2. **Click "Add" → introducir `matripuntos.com`**
3. **Seguir instrucciones para actualizar nameservers en registrar**
4. **O apuntar CNAME a `cname.vercel-dns.com`** (simplificado)

### 7.3 Configurar Backend con Dominio

```bash
# Si usas Railway + dominio personalizado:
# Railway → Enviroment → FRONTEND_URL = https://matripuntos.com

# Si usas Railway con su dominio:
# https://matripuntos-api.up.railway.app
# Actualizar en Vercel:
# VITE_API_URL = https://matripuntos-api.up.railway.app
```

### 7.4 Verificar SSL/HTTPS

```bash
# Debería ser automático en Vercel + Supabase + Railway
# Todos proporcionan HTTPS gratuito

# Verificar:
curl -I https://matripuntos.com
# Debería mostrar "HTTP/2" y "Strict-Transport-Security"
```

---

## PARTE 8: MONITOREO Y MANTENIMIENTO

### 8.1 Logs Diarios

```bash
# Verificar cada mañana:

# 1. Vercel Logs
# https://vercel.com → Deployments → Logs

# 2. Railway Logs
# https://railway.app → Logs

# 3. Supabase Logs
# https://supabase.com → Logs

# 4. Verificar health check
curl https://matripuntos.vercel.app/api/health
```

### 8.2 Backups BD

```bash
# Railway no hace backups automáticos en plan gratuito

# Opción A: Script manual (semanal)
pg_dump "postgresql://[user]:[pass]@[host]:[port]/postgres" > backup_$(date +%Y-%m-%d).sql
# Guardar en AWS S3 o Google Cloud Storage

# Opción B: Supabase Pro (backups automáticos)
# Upgrade a plan pagado ($25/mes) para backups diarios
```

### 8.3 Scaling

```bash
# Si la app crece:

# Vercel:
# - Automático (serverless, escalado gratis)

# Railway:
# - Aumentar RAM/CPU en "Resources"
# - O migrar a render.com (similar pero más flexible)

# Supabase:
# - Cambiar a plan Pro ($25/mes)
# - O migrar a AWS RDS (más caro pero profesional)
```

---

## PARTE 9: TROUBLESHOOTING

### Problema: "Database connection failed"

```bash
# Verificar:
1. DATABASE_URL está en Railway variables
2. Database existe en Supabase
3. IP de Railway está whitelisteda en Supabase (ver Settings → Database)
4. Contraseña es correcta (sin caracteres especiales sin escapar)

# Solución:
# Copiar URL exacta de Supabase "Connection Pooling"
# Reemplazar en Railway
# Esperar 1 min a que recarge
```

### Problema: "CORS error" en frontend

```bash
# Error en navegador:
# "Access to XMLHttpRequest blocked by CORS policy"

# Verificar:
1. FRONTEND_URL en Railway coincide con URL de Vercel
2. CORS headers configurados en Express

# Solución:
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
```

### Problema: "JWT token invalid"

```bash
# Error: "Invalid or expired token"

# Verificar:
1. JWT_SECRET es igual en TODAS partes
   - src/backend/.env
   - Variables de Railway
   - Node_modules actualizado

# Solución:
# Generar nuevo JWT_SECRET y actualizar en Railway
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copiar valor a Railway variables
# Todos los tokens viejos se invalidarán (usuarios deben login de nuevo)
```

### Problema: "Build fails on Vercel"

```bash
# Ver logs en Vercel
# Errores típicos:
# 1. "Module not found" → npm install no funcionó
# 2. "TypeScript error" → hay errores de tipado
# 3. "Out of memory" → dependencias demasiado grandes

# Soluciones:
# 1. Limpiar cache en Vercel:
#    Settings → Git → Clear cache → Redeploy

# 2. Verificar que build local funciona:
npm run build

# 3. Aumentar memory limit en vercel.json:
{
  "buildCommand": "npm run build",
  "env": {
    "NODE_OPTIONS": "--max-old-space-size=4096"
  }
}
```

---

## PARTE 10: CHECKLIST FINAL

Antes de dar por completado:

```
□ Frontend desplegado en Vercel ✓
□ Backend desplegado en Railway ✓
□ Base de datos en Supabase ✓
□ CORS configurado ✓
□ JWT secret generado y configurado ✓
□ DATABASE_URL migrada a PostgreSQL ✓
□ FRONTEND_URL configurada en backend ✓
□ VITE_API_URL apuntando a backend en Railway ✓
□ SSL/HTTPS activo (automático) ✓
□ Health check responde ✓
□ Login funciona ✓
□ Crear pareja funciona ✓
□ Crear solicitud funciona ✓
□ Datos se guardan en BD ✓
□ Notificaciones funcionan ✓
□ Logs monitoreados ✓
```

---

## COSTOS MENSUALES

| Servicio | Plan | Costo | Notas |
|----------|------|-------|-------|
| Vercel | Hobby | $0 | Suficiente para MVP |
| Railway | Pay as you go | ~$5-10 | 50 horas/mes incluidas |
| Supabase | Free | $0 | 500 MB, 50 MB/día |
| Dominio | .com | ~$12/año | ($1/mes promedio) |
| **TOTAL** | | **~$15-20/mes** | Escalable según uso |

Si escala (>100k usuarios):
- Vercel Pro: $20/mes
- Railway dedicated: $50-200/mes
- Supabase Pro: $25/mes
- Total: ~$100-250/mes

---

## PRÓXIMOS PASOS

1. ✅ Desplegar a producción (hoy)
2. 📊 Monitorear primeros días
3. 🐛 Fijar bugs que encuentren usuarios
4. 📱 Comenzar desarrollo de app móvil (React Native)
5. 💰 Implementar pagos (Stripe/Mercado Pago)
6. 📈 Analytics (Google Analytics, Mixpanel)
7. 🌍 Internacionalización (i18n)

---

**Próximo documento: `08_GUIA_DESARROLLO_LOCAL.md`**

Allí aprenderás a trabajar en desarrollo local y agregar nuevas features.
