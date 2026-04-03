# 🧪 GUÍA DE TESTING - FASE 1

## Pre-requisitos

```bash
# 1. Instalar dependencias
cd src/backend && npm install
cd ../frontend && npm install

# 2. Generar Prisma Client
cd src/backend
npx prisma generate
npx prisma migrate deploy

# 3. Verificar base de datos
npx prisma studio  # Opcional: interface visual de DB
```

---

## 🧬 Flujos a Testear

### 1️⃣ Flujo Estándar: Onboarding Completo

**Ruta:** `http://localhost:5173/onboarding`

**Pasos:**
```
1. Login → Redirige a /onboarding si no completó
2. Step 1: Perfil Personal
   - Llenar apellido
   - Fecha nacimiento
   - Horas de trabajo
   - Agregar preferencias (loves/dislikes)

3. Step 2: Hogar
   - Tipo vivienda
   - Tamaño m²
   - Modalidad convivencia
   - Servicios externos

4. Step 3: Familia
   - Agregar hijo/a (opcional)
   - Agregar mascota (opcional)

5. Step 4: Invitación
   - Email de pareja (opcional)
   - Método invitación
   - CLICK: "Completar y Comenzar"

6. ✅ Redirige a Dashboard
```

**Esperado:**
- Todos los datos guardados en DB
- Usuario marcado como `hasCompletedOnboarding = true`
- Sin errores en consola
- Mensaje confirmación en cada paso

---

### 2️⃣ Flujo Invitación: Pareja por Link

**Parte 1: Usuario original invita**
```
1. Completa onboarding Step 4 con email de pareja
2. Copia link o recibe email
3. Link formato: http://localhost:5173/onboarding/join/[TOKEN]
```

**Parte 2: Usuario invitado se une**
```
1. Accede a link con token
2. Página valida token (debe mostrar nombre invitante)
3. Completa registro:
   - Email pre-llenado
   - Crea contraseña (min 8 caracteres)
   - Nombre completo
4. Completa perfil:
   - Apellido (opcional)
   - Fecha nacimiento (opcional)
5. ✅ Redirige a Dashboard
   - Ambos usuarios ahora en mismo couple
   - Pueden ver datos mutuamente
```

**Esperado:**
- Invitación marcada como `accepted`
- Nuevo usuario creado y asignado al couple
- Sin errores en validación de token
- Feedback visual clara en cada paso

---

### 3️⃣ Flujo: Invitación Expirada/Inválida

**Casos a probar:**
```
1. Token inválido
   - Ruta: /onboarding/join/XXXXXXXXXXXX
   - Esperado: Mensaje "Invitación inválida"

2. Token expirado (>7 días)
   - Modifica expiresAt en DB a fecha pasada
   - Esperado: Mensaje "Invitación expirada"

3. Email no coincide
   - Token válido pero usuario login con otro email
   - Esperado: Error "Email no coincide"
```

---

## ✅ Checklist de Validación

### Backend
- [ ] Todos los endpoints responden (usar Postman)
- [ ] Autenticación requerida donde corresponde
- [ ] Validaciones de datos funcionan
- [ ] Relaciones en DB se crean correctamente
- [ ] No hay SQL errors en logs
- [ ] CORS permite frontend

### Database
- [ ] Todas las 11 tablas creadas
- [ ] Índices creados correctamente
- [ ] Foreign keys funcionan
- [ ] Datos se guardan persistentemente
- [ ] Cascade deletes funcionan

### Frontend
- [ ] Página carga sin errores
- [ ] Validaciones en vivo funcionan
- [ ] Navegación entre pasos OK
- [ ] Campos requeridos validados
- [ ] Errores se muestran claramente
- [ ] Loading states visibles
- [ ] Responsive en mobile

### API Client
- [ ] Todas las rutas llamadas correctamente
- [ ] Headers Authorization incluidos
- [ ] Errores manejados apropiadamente
- [ ] Tokens guardados/recuperados en localStorage

---

## 🔍 Casos Especiales

### Edge Cases a Verificar

1. **Campos Vacíos**
   - Step 1: Solo apellido requerido? ✓
   - Step 2: Hogar datos opcionales? ✓
   - Step 3: Familia completamente opcional? ✓
   - Step 4: Email pareja opcional? ✓

2. **Datos Inválidos**
   - Email inválido → Validar formato
   - Fechas futuras → Rechazar
   - Horas >168 → Validar rango
   - M² negativos → Rechazar

3. **Concurrencia**
   - Dos usuarios completan simultáneamente?
   - Invitación durante onboarding?
   - Cerrar tab a mitad de step?

4. **Preferencias de Tareas**
   - Agregar mismo tag 2 veces? (no duplicar)
   - Tags con espacios → Trim
   - Tags vacíos → Ignorar
   - Muchos tags → Sin límite

---

## 📊 Queries SQL para Verificación

```sql
-- Ver usuarios creados
SELECT id, email, name, hasCompletedOnboarding FROM "User";

-- Ver perfiles creados
SELECT * FROM "UserProfile";

-- Ver parejas/hogares
SELECT * FROM "Couple";

-- Ver invitaciones
SELECT id, inviteeEmail, status, expiresAt FROM "Invitation";

-- Ver hijos y mascotas
SELECT * FROM "Child";
SELECT * FROM "Pet";
```

---

## 🎯 Criterio de Aceptación

### PASADO si:
- ✅ Flujo estándar completa sin errores
- ✅ Invitación funciona end-to-end
- ✅ Datos persisten en DB
- ✅ Tokens expiran correctamente
- ✅ Validaciones funcionan
- ✅ UX es clara e intuitiva
- ✅ No hay console errors

### FALLA si:
- ❌ Error no manejado en backend/frontend
- ❌ Datos no se guardan
- ❌ Invitación no funciona
- ❌ Validaciones incompletas
- ❌ Mensajes de error no claros

---

## 🐛 Debug Tips

### Si algo falla:

1. **Backend logs**
   ```bash
   # En terminal backend, mira console.error()
   npm run dev
   ```

2. **Browser DevTools**
   ```
   - Network tab: Mira status de requests
   - Console: Busca errores JavaScript
   - Storage: Verifica localStorage (token)
   ```

3. **Database**
   ```bash
   npx prisma studio
   # Navega tablas visualmente
   ```

4. **API Testing**
   ```bash
   curl -X POST http://localhost:3000/api/profile/user \
     -H "Authorization: Bearer [TOKEN]" \
     -H "Content-Type: application/json" \
     -d '{"surname": "Test"}'
   ```

---

## 📝 Notas

- Asegúrate de que `.env` en backend tiene `FRONTEND_URL=http://localhost:5173`
- Los tokens de invitación se crean cuando completas Step 4
- Las invitaciones sin email simplemente no se envían (OK)
- Puedes repetir onboarding si necesitas testear (crea nuevo usuario)

---

**Duración estimada de testing:** 30-45 minutos
**Reporta bugs en:** PHASE1_BUGS.md (cuando encuentres)
